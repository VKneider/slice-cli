// cli/utils/bundling/DependencyAnalyzer.js
import fs from 'fs-extra';
import path from 'path';
import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import { getSrcPath, getComponentsJsPath, getProjectRoot } from '../PathHelper.js';

export default class DependencyAnalyzer {
  constructor(moduleUrl) {
    this.moduleUrl = moduleUrl;
    this.projectRoot = getProjectRoot(moduleUrl);
    this.componentsPath = path.dirname(getComponentsJsPath(moduleUrl));
    this.routesPath = getSrcPath(moduleUrl, 'routes.js');

    // Analysis storage
    this.components = new Map();
    this.routes = new Map();
    this.dependencyGraph = new Map();
  }

  /**
   * Executes complete project analysis
   */
  async analyze() {
    console.log('🔍 Analyzing project...');

    // 1. Load component configuration
    await this.loadComponentsConfig();

    // 2. Analyze component files
    await this.analyzeComponents();

    // 3. Load and analyze routes
    await this.analyzeRoutes();

    // 4. Build dependency graph
    this.buildDependencyGraph();

    // 5. Calculate metrics
    const metrics = this.calculateMetrics();

    console.log('✅ Analysis completed');

    return {
      components: Array.from(this.components.values()),
      routes: Array.from(this.routes.values()),
      dependencyGraph: this.dependencyGraph,
      routeGroups: this.routeGroups,
      metrics
    };
  }

  /**
   * Loads component configuration from components.js
   */
  async loadComponentsConfig() {
    const componentsConfigPath = path.join(this.componentsPath, 'components.js');

    if (!await fs.pathExists(componentsConfigPath)) {
      throw new Error('components.js not found');
    }

    // Read and parse components.js
    const content = await fs.readFile(componentsConfigPath, 'utf-8');

    // Extract configuration using simple regex - look for the components object
    const configMatch = content.match(/const components\s*=\s*({[\s\S]*?});/);
    if (!configMatch) {
      throw new Error('Could not parse components.js');
    }

    // Evaluate safely (in production use a more robust parser)
    const config = eval(`(${configMatch[1]})`);

    // Group components by category
    const categoryMap = new Map();

    // Build category map from component assignments
    for (const [componentName, categoryName] of Object.entries(config)) {
      if (!categoryMap.has(categoryName)) {
        categoryMap.set(categoryName, []);
      }
      categoryMap.get(categoryName).push(componentName);
    }

    // Process each category
    for (const [categoryName, componentList] of categoryMap) {
      // Determine category type based on category name
      let categoryType = 'Visual'; // default
      if (categoryName === 'Service') categoryType = 'Service';
      if (categoryName === 'AppComponents') categoryType = 'Visual'; // AppComponents are visual

      // Find category path
      const categoryPath = path.join(this.componentsPath, categoryName);

      if (await fs.pathExists(categoryPath)) {
        const files = await fs.readdir(categoryPath);

        for (const file of files) {
          const componentPath = path.join(categoryPath, file);
          const stat = await fs.stat(componentPath);

          if (stat.isDirectory() && componentList.includes(file)) {
            this.components.set(file, {
              name: file,
              category: categoryName,
              categoryType: categoryType,
              path: componentPath,
              dependencies: new Set(),
              usedBy: new Set(),
              routes: new Set(),
              size: 0
            });
          }
        }
      }
    }
  }

  /**
   * Analyzes each component's files
   */
  async analyzeComponents() {
    for (const [name, component] of this.components) {
      const jsFile = path.join(component.path, `${name}.js`);

      if (!await fs.pathExists(jsFile)) continue;

      // Read JavaScript file
      const content = await fs.readFile(jsFile, 'utf-8');

      // Calculate size
      component.size = await this.calculateComponentSize(component.path);

      // Parse and extract dependencies
      component.dependencies = await this.extractDependencies(content);
    }
  }

  /**
   * Extracts dependencies from a component file
   */
  async extractDependencies(code) {
    const dependencies = new Set();

    try {
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['jsx']
      });

      traverse.default(ast, {
        // Detect slice.build() calls
        CallExpression(path) {
          const { callee, arguments: args } = path.node;

          // slice.build('MultiRoute', { routes: [...] })
          if (
            callee.type === 'MemberExpression' &&
            callee.object.name === 'slice' &&
            callee.property.name === 'build' &&
            args[0]?.type === 'StringLiteral' &&
            args[0].value === 'MultiRoute' &&
            args[1]?.type === 'ObjectExpression'
          ) {
            // Add MultiRoute itself
            dependencies.add('MultiRoute');

            // Extract routes from MultiRoute props
            const routesProp = args[1].properties.find(p => p.key?.name === 'routes');
            if (routesProp?.value?.type === 'ArrayExpression') {
              routesProp.value.elements.forEach(routeElement => {
                if (routeElement.type === 'ObjectExpression') {
                  const componentProp = routeElement.properties.find(p => p.key?.name === 'component');
                  if (componentProp?.value?.type === 'StringLiteral') {
                    dependencies.add(componentProp.value.value);
                  }
                }
              });
            }
          }
          // Regular slice.build() calls
          else if (
            callee.type === 'MemberExpression' &&
            callee.object.name === 'slice' &&
            callee.property.name === 'build' &&
            args[0]?.type === 'StringLiteral'
          ) {
            dependencies.add(args[0].value);
          }
        },

        // Detect direct imports (less common but possible)
        ImportDeclaration(path) {
          const importPath = path.node.source.value;
          if (importPath.includes('/Components/')) {
            const componentName = importPath.split('/').pop();
            dependencies.add(componentName);
          }
        }
      });
    } catch (error) {
      console.warn(`⚠️  Error parsing component: ${error.message}`);
    }

    return dependencies;
  }

  /**
   * Analyzes the routes file and detects route groups
   */
  async analyzeRoutes() {
    if (!await fs.pathExists(this.routesPath)) {
      throw new Error('routes.js no encontrado');
    }

    const content = await fs.readFile(this.routesPath, 'utf-8');

    try {
      const ast = parse(content, {
        sourceType: 'module',
        plugins: ['jsx']
      });

      let currentRoute = null;
      const self = this; // Guardar referencia a la instancia

      traverse.default(ast, {
        ObjectExpression(path) {
          // Buscar objetos de ruta: { path: '/', component: 'HomePage' }
          const properties = path.node.properties;
          const pathProp = properties.find(p => p.key?.name === 'path');
          const componentProp = properties.find(p => p.key?.name === 'component');

          if (pathProp && componentProp) {
            const routePath = pathProp.value.value;
            const componentName = componentProp.value.value;

            currentRoute = {
              path: routePath,
              component: componentName,
              dependencies: new Set([componentName])
            };

            self.routes.set(routePath, currentRoute);

            // Marcar el componente como usado por esta ruta
            if (self.components.has(componentName)) {
              self.components.get(componentName).routes.add(routePath);
            }
          }
        }
      });

      // Detect and store route groups based on MultiRoute usage
      this.routeGroups = this.detectRouteGroups();

    } catch (error) {
      console.warn(`⚠️  Error parseando rutas: ${error.message}`);
    }
  }

  /**
   * Builds the complete dependency graph
   */
  buildDependencyGraph() {
    // Propagate transitive dependencies
    for (const [name, component] of this.components) {
      this.dependencyGraph.set(name, this.getAllDependencies(name, new Set()));
    }

    // Calculate usedBy (inverse dependencies)
    for (const [name, deps] of this.dependencyGraph) {
      for (const dep of deps) {
        if (this.components.has(dep)) {
          this.components.get(dep).usedBy.add(name);
        }
      }
    }
  }

  /**
   * Detects route groups based on MultiRoute usage
   */
  detectRouteGroups() {
    const routeGroups = new Map();

    for (const [componentName, component] of this.components) {
      // Check if component uses MultiRoute
      const hasMultiRoute = Array.from(component.dependencies).includes('MultiRoute');

      if (hasMultiRoute) {
        // Find all routes that point to this component
        const relatedRoutes = Array.from(this.routes.values())
          .filter(route => route.component === componentName);

        if (relatedRoutes.length > 1) {
          // Group these routes together
          const groupKey = `multiroute-${componentName}`;
          routeGroups.set(groupKey, {
            component: componentName,
            routes: relatedRoutes.map(r => r.path),
            type: 'multiroute'
          });

          // Mark component as multiroute handler
          component.isMultiRouteHandler = true;
          component.multiRoutePaths = relatedRoutes.map(r => r.path);
        }
      }
    }

    return routeGroups;
  }

  /**
   * Gets all dependencies of a component (recursive)
   */
  getAllDependencies(componentName, visited = new Set()) {
    if (visited.has(componentName)) return new Set();
    visited.add(componentName);

    const component = this.components.get(componentName);
    if (!component) return new Set();

    const allDeps = new Set(component.dependencies);

    for (const dep of component.dependencies) {
      const transitiveDeps = this.getAllDependencies(dep, visited);
      for (const transDep of transitiveDeps) {
        allDeps.add(transDep);
      }
    }

    return allDeps;
  }

  /**
   * Calculates the total size of a component (JS + HTML + CSS)
   */
  async calculateComponentSize(componentPath) {
    let totalSize = 0;
    const files = await fs.readdir(componentPath);

    for (const file of files) {
      const filePath = path.join(componentPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isFile()) {
        totalSize += stat.size;
      }
    }

    return totalSize;
  }

  /**
   * Calculates project metrics
   */
  calculateMetrics() {
    const totalComponents = this.components.size;
    const totalRoutes = this.routes.size;

    // Shared components (used in multiple routes)
    const sharedComponents = Array.from(this.components.values())
      .filter(c => c.routes.size >= 2);

    // Total size
    const totalSize = Array.from(this.components.values())
      .reduce((sum, c) => sum + c.size, 0);

    // Components by category
    const byCategory = {};
    for (const comp of this.components.values()) {
      byCategory[comp.category] = (byCategory[comp.category] || 0) + 1;
    }

    // Top components by usage
    const topByUsage = Array.from(this.components.values())
      .sort((a, b) => b.routes.size - a.routes.size)
      .slice(0, 10)
      .map(c => ({
        name: c.name,
        routes: c.routes.size,
        size: c.size
      }));

    return {
      totalComponents,
      totalRoutes,
      sharedComponentsCount: sharedComponents.length,
      sharedPercentage: (sharedComponents.length / totalComponents * 100).toFixed(1),
      totalSize,
      averageSize: Math.round(totalSize / totalComponents),
      byCategory,
      topByUsage
    };
  }

  /**
   * Generates a visual report of the analysis
   */
  generateReport(metrics) {
    console.log('\n📊 PROJECT ANALYSIS\n');
    console.log(`Total components: ${metrics.totalComponents}`);
    console.log(`Total routes: ${metrics.totalRoutes}`);
    console.log(`Shared components: ${metrics.sharedComponentsCount} (${metrics.sharedPercentage}%)`);
    console.log(`Total size: ${(metrics.totalSize / 1024).toFixed(1)} KB`);
    console.log(`Average size: ${(metrics.averageSize / 1024).toFixed(1)} KB per component`);

    console.log('\n📦 By category:');
    for (const [category, count] of Object.entries(metrics.byCategory)) {
      console.log(`  ${category}: ${count} components`);
    }

    console.log('\n🔥 Top 10 most used components:');
    metrics.topByUsage.forEach((comp, i) => {
      console.log(`  ${i + 1}. ${comp.name} - ${comp.routes} routes - ${(comp.size / 1024).toFixed(1)} KB`);
    });
  }
}