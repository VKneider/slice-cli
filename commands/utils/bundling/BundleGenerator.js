// cli/utils/bundling/BundleGenerator.js
import fs from 'fs-extra';
import path from 'path';
import crypto from 'crypto';
import { getSrcPath, getComponentsJsPath } from '../PathHelper.js';

export default class BundleGenerator {
  constructor(moduleUrl, analysisData) {
    this.moduleUrl = moduleUrl;
    this.analysisData = analysisData;
    this.srcPath = getSrcPath(moduleUrl);
    this.bundlesPath = path.join(this.srcPath, 'bundles');
    this.componentsPath = path.dirname(getComponentsJsPath(moduleUrl));

    // Configuration
    this.config = {
      maxCriticalSize: 50 * 1024, // 50KB
      maxCriticalComponents: 15,
      minSharedUsage: 3, // Minimum routes to be considered "shared"
      strategy: 'hybrid' // 'global', 'hybrid', 'per-route'
    };

    this.bundles = {
      critical: {
        components: [],
        size: 0,
        file: 'slice-bundle.critical.js'
      },
      routes: {}
    };
  }

  /**
   * Generates all bundles
   */
  async generate() {
    console.log('🔨 Generating bundles...');

    // 0. Create bundles directory
    await fs.ensureDir(this.bundlesPath);

    // 1. Determine optimal strategy
    this.determineStrategy();

    // 2. Identify critical components
    this.identifyCriticalComponents();

    // 3. Assign components to routes
    this.assignRouteComponents();

    // 4. Generate bundle files
    const files = await this.generateBundleFiles();

    // 5. Generate configuration
    const config = this.generateBundleConfig();

    console.log('✅ Bundles generated successfully');

    return {
      bundles: this.bundles,
      config,
      files
    };
  }

  /**
   * Determines the optimal bundling strategy
   */
  determineStrategy() {
    const { metrics } = this.analysisData;
    const { totalComponents, sharedPercentage } = metrics;

    // Strategy based on size and usage pattern
    if (totalComponents < 20 || sharedPercentage > 60) {
      this.config.strategy = 'global';
      console.log('📦 Strategy: Global Bundle (small project or highly shared)');
    } else if (totalComponents < 100) {
      this.config.strategy = 'hybrid';
      console.log('📦 Strategy: Hybrid (critical + grouped routes)');
    } else {
      this.config.strategy = 'per-route';
      console.log('📦 Strategy: Per Route (large project)');
    }
  }

  /**
   * Identifies critical components for the initial bundle
   */
  identifyCriticalComponents() {
    const { components } = this.analysisData;

    // Filter critical candidates
    const candidates = components
      .filter(comp => {
        // Shared components (used in 3+ routes)
        const isShared = comp.routes.size >= this.config.minSharedUsage;

        // Structural components (Navbar, Footer, etc.)
        const isStructural = comp.categoryType === 'Structural' ||
                            ['Navbar', 'Footer', 'Layout'].includes(comp.name);

        // Small and highly used components (only if used in 3+ routes)
        const isSmallAndUseful = comp.size < 2000 && comp.routes.size >= 3;

        return isShared || isStructural || isSmallAndUseful;
      })
      .sort((a, b) => {
        // Prioritize by: (usage * 10) - size
        const priorityA = (a.routes.size * 10) - (a.size / 1000);
        const priorityB = (b.routes.size * 10) - (b.size / 1000);
        return priorityB - priorityA;
      });

    // Fill critical bundle up to limit
    for (const comp of candidates) {
      const dependencies = this.getComponentDependencies(comp);
      const totalSize = comp.size + dependencies.reduce((sum, dep) => sum + dep.size, 0);
      const totalCount = 1 + dependencies.length;

      const wouldExceedSize = this.bundles.critical.size + totalSize > this.config.maxCriticalSize;
      const wouldExceedCount = this.bundles.critical.components.length + totalCount > this.config.maxCriticalComponents;

      if (wouldExceedSize || wouldExceedCount) continue;

      // Add component and its dependencies
      if (!this.bundles.critical.components.find(c => c.name === comp.name)) {
        this.bundles.critical.components.push(comp);
        this.bundles.critical.size += comp.size;
      }

      for (const dep of dependencies) {
        if (!this.bundles.critical.components.find(c => c.name === dep.name)) {
          this.bundles.critical.components.push(dep);
          this.bundles.critical.size += dep.size;
        }
      }
    }

    console.log(`✓ Critical bundle: ${this.bundles.critical.components.length} components, ${(this.bundles.critical.size / 1024).toFixed(1)} KB`);
  }

  /**
   * Assigns remaining components to route bundles
   */
  assignRouteComponents() {
    const criticalNames = new Set(this.bundles.critical.components.map(c => c.name));

    if (this.config.strategy === 'hybrid') {
      this.assignHybridBundles(criticalNames);
    } else {
      this.assignPerRouteBundles(criticalNames);
    }
  }

  /**
   * Assigns components to per-route bundles
   */
  assignPerRouteBundles(criticalNames) {
    for (const route of this.analysisData.routes) {
      const routePath = route.path;
      // Get all route dependencies
      const routeComponents = this.getRouteComponents(route.component);

      // Include dependencies for all route components
      const allComponents = new Set();
      for (const comp of routeComponents) {
        allComponents.add(comp);
        const dependencies = this.getComponentDependencies(comp);
        for (const dep of dependencies) {
          allComponents.add(dep);
        }
      }

      // Filter those already in critical
      const uniqueComponents = Array.from(allComponents).filter(comp =>
        !criticalNames.has(comp.name)
      );

      if (uniqueComponents.length === 0) continue;

      const routeKey = this.routeToFileName(routePath);
      const totalSize = uniqueComponents.reduce((sum, c) => sum + c.size, 0);

      this.bundles.routes[routeKey] = {
        path: routePath,
        components: uniqueComponents,
        size: totalSize,
        file: `slice-bundle.${routeKey}.js`
      };

      console.log(`✓ Bundle ${routeKey}: ${uniqueComponents.length} components, ${(totalSize / 1024).toFixed(1)} KB`);
    }
  }

  /**
   * Gets all component dependencies transitively
   */
  getComponentDependencies(component, visited = new Set()) {
    if (visited.has(component.name)) return [];
    visited.add(component.name);

    const dependencies = [];

    // Add direct dependencies
    for (const depName of component.dependencies) {
      const depComp = this.analysisData.components.find(c => c.name === depName);
      if (depComp && !visited.has(depName)) {
        dependencies.push(depComp);
        // Add transitive dependencies
        dependencies.push(...this.getComponentDependencies(depComp, visited));
      }
    }

    return dependencies;
  }

  /**
   * Assigns components to hybrid bundles (grouped by category)
   */
  assignHybridBundles(criticalNames) {
    const routeGroups = new Map();

    // First, handle MultiRoute groups
    if (this.analysisData.routeGroups) {
      for (const [groupKey, groupData] of this.analysisData.routeGroups) {
        if (groupData.type === 'multiroute') {
          // Create a bundle for this MultiRoute group
          const allComponents = new Set();

          // Add the main component (MultiRoute handler)
          const mainComponent = this.analysisData.components.find(c => c.name === groupData.component);
          if (mainComponent) {
            allComponents.add(mainComponent);

            // Add all components used by this MultiRoute
            const routeComponents = this.getRouteComponents(mainComponent.name);
            for (const comp of routeComponents) {
              allComponents.add(comp);
              // Add transitive dependencies
              const dependencies = this.getComponentDependencies(comp);
              for (const dep of dependencies) {
                allComponents.add(dep);
              }
            }
          }

          // Filter those already in critical
          const uniqueComponents = Array.from(allComponents).filter(comp =>
            !criticalNames.has(comp.name)
          );

          if (uniqueComponents.length > 0) {
            const totalSize = uniqueComponents.reduce((sum, c) => sum + c.size, 0);

            this.bundles.routes[groupKey] = {
              paths: groupData.routes,
              components: uniqueComponents,
              size: totalSize,
              file: `slice-bundle.${this.routeToFileName(groupKey)}.js`
            };

            console.log(`✓ Bundle ${groupKey}: ${uniqueComponents.length} components, ${(totalSize / 1024).toFixed(1)} KB (${groupData.routes.length} routes)`);
          }
        }
      }
    }

    // Group remaining routes by category (skip those already handled by MultiRoute)
    for (const route of this.analysisData.routes) {
      // Check if this route is already handled by a MultiRoute group
      const isHandledByMultiRoute = this.analysisData.routeGroups &&
        Array.from(this.analysisData.routeGroups.values()).some(group =>
          group.type === 'multiroute' && group.routes.includes(route.path)
        );

      if (!isHandledByMultiRoute) {
        const category = this.categorizeRoute(route.path);
        if (!routeGroups.has(category)) {
          routeGroups.set(category, []);
        }
        routeGroups.get(category).push(route);
      }
    }

    // Create bundles for each group
    for (const [category, routes] of routeGroups) {
      const allComponents = new Set();

      // Collect all unique components for this category (including dependencies)
      for (const route of routes) {
        const routeComponents = this.getRouteComponents(route.component);
        for (const comp of routeComponents) {
          allComponents.add(comp);
          // Add transitive dependencies
          const dependencies = this.getComponentDependencies(comp);
          for (const dep of dependencies) {
            allComponents.add(dep);
          }
        }
      }

      // Filter those already in critical
      const uniqueComponents = Array.from(allComponents).filter(comp =>
        !criticalNames.has(comp.name)
      );

      if (uniqueComponents.length === 0) continue;

      const totalSize = uniqueComponents.reduce((sum, c) => sum + c.size, 0);
      const routePaths = routes.map(r => r.path);

      this.bundles.routes[category] = {
        paths: routePaths,
        components: uniqueComponents,
        size: totalSize,
        file: `slice-bundle.${this.routeToFileName(category)}.js`
      };

      console.log(`✓ Bundle ${category}: ${uniqueComponents.length} components, ${(totalSize / 1024).toFixed(1)} KB (${routes.length} routes)`);
    }
  }

  /**
   * Categorizes a route path for grouping, considering MultiRoute context
   */
  categorizeRoute(routePath) {
    // Check if this route belongs to a MultiRoute handler
    if (this.analysisData.routeGroups) {
      for (const [groupKey, groupData] of this.analysisData.routeGroups) {
        if (groupData.type === 'multiroute' && groupData.routes.includes(routePath)) {
          return groupKey; // Return the MultiRoute group key
        }
      }
    }

    // Default categorization
    const path = routePath.toLowerCase();

    if (path === '/' || path === '/home') return 'home';
    if (path.includes('docum') || path.includes('documentation')) return 'documentation';
    if (path.includes('component') || path.includes('visual') || path.includes('card') ||
        path.includes('button') || path.includes('input') || path.includes('switch') ||
        path.includes('checkbox') || path.includes('select') || path.includes('details') ||
        path.includes('grid') || path.includes('loading') || path.includes('layout') ||
        path.includes('navbar') || path.includes('treeview') || path.includes('multiroute')) return 'components';
    if (path.includes('theme') || path.includes('slice') || path.includes('config')) return 'configuration';
    if (path.includes('routing') || path.includes('guard')) return 'routing';
    if (path.includes('service') || path.includes('command')) return 'services';
    if (path.includes('structural') || path.includes('lifecycle') || path.includes('static') ||
        path.includes('build')) return 'advanced';
    if (path.includes('playground') || path.includes('creator')) return 'tools';
    if (path.includes('about') || path.includes('404')) return 'misc';

    return 'general';
  }

  /**
   * Gets all components needed for a route
   */
  getRouteComponents(componentName) {
    const result = [];
    const visited = new Set();

    const traverse = (name) => {
      if (visited.has(name)) return;
      visited.add(name);

      const component = this.analysisData.components.find(c => c.name === name);
      if (!component) return;

      result.push(component);

      // Add dependencies recursively
      for (const dep of component.dependencies) {
        traverse(dep);
      }
    };

    traverse(componentName);
    return result;
  }

  /**
   * Generates the physical bundle files
   */
  async generateBundleFiles() {
    const files = [];

    // 1. Critical bundle
    if (this.bundles.critical.components.length > 0) {
      const criticalFile = await this.createBundleFile(
        this.bundles.critical.components,
        'critical',
        null
      );
      files.push(criticalFile);
    }

    // 2. Route bundles
    for (const [routeKey, bundle] of Object.entries(this.bundles.routes)) {
      const routeFile = await this.createBundleFile(
        bundle.components,
        'route',
        bundle.path || bundle.paths || routeKey // Use routeKey as fallback for hybrid bundles
      );
      files.push(routeFile);
    }

    return files;
  }

  /**
   * Creates a bundle file
   */
  async createBundleFile(components, type, routePath) {
    const routeKey = routePath ? this.routeToFileName(routePath) : 'critical';
    const fileName = `slice-bundle.${routeKey}.js`;
    const filePath = path.join(this.bundlesPath, fileName);

    const bundleContent = await this.generateBundleContent(
      components,
      type,
      routePath
    );

    await fs.writeFile(filePath, bundleContent, 'utf-8');

    const hash = crypto.createHash('md5').update(bundleContent).digest('hex').substring(0, 12);

    return {
      name: routeKey,
      file: fileName,
      path: filePath,
      size: Buffer.byteLength(bundleContent, 'utf-8'),
      hash,
      componentCount: components.length
    };
  }

  /**
   * Analyzes dependencies of a JavaScript file using simple regex
   */
  analyzeDependencies(jsContent, componentPath) {
    const dependencies = [];

    try {
      // Simple regex to find import statements
      const importRegex = /import\s+.*?\s+from\s+['"`]([^'"`]+)['"`]/g;
      let match;

      while ((match = importRegex.exec(jsContent)) !== null) {
        const importPath = match[1];

        // Only process relative imports (starting with ./ or ../)
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          // Resolve the absolute path
          const resolvedPath = path.resolve(componentPath, importPath);

          // If no extension, try common extensions
          let finalPath = resolvedPath;
          const ext = path.extname(resolvedPath);
          if (!ext) {
            const extensions = ['.js', '.json', '.mjs'];
            for (const ext of extensions) {
              if (fs.existsSync(resolvedPath + ext)) {
                finalPath = resolvedPath + ext;
                break;
              }
            }
          }

          if (fs.existsSync(finalPath)) {
            dependencies.push(finalPath);
          }
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not analyze dependencies for ${componentPath}:`, error.message);
    }

    return dependencies;
  }

  /**
   * Generates the content of a bundle
   */
  async generateBundleContent(components, type, routePath) {
    const componentsData = {};

    for (const comp of components) {
      const jsPath = path.join(comp.path, `${comp.name}.js`);
      const jsContent = await fs.readFile(jsPath, 'utf-8');

      // Analyze dependencies
      const dependencies = this.analyzeDependencies(jsContent, comp.path);
      const dependencyContents = {};

      // Read all dependency files
      for (const depPath of dependencies) {
        try {
          const depContent = await fs.readFile(depPath, 'utf-8');
          const depName = path.basename(depPath, path.extname(depPath));
          dependencyContents[depName] = depContent;
        } catch (error) {
          console.warn(`Warning: Could not read dependency ${depPath}:`, error.message);
        }
      }

      let htmlContent = null;
      let cssContent = null;

      const htmlPath = path.join(comp.path, `${comp.name}.html`);
      const cssPath = path.join(comp.path, `${comp.name}.css`);

      if (await fs.pathExists(htmlPath)) {
        htmlContent = await fs.readFile(htmlPath, 'utf-8');
      }

      if (await fs.pathExists(cssPath)) {
        cssContent = await fs.readFile(cssPath, 'utf-8');
      }

      componentsData[comp.name] = {
        name: comp.name,
        category: comp.category,
        categoryType: comp.categoryType,
        js: this.cleanJavaScript(jsContent, comp.name),
        externalDependencies: dependencyContents, // Files imported with import statements
        componentDependencies: Array.from(comp.dependencies), // Other components this one depends on
        html: htmlContent,
        css: cssContent,
        size: comp.size
      };
    }

    const metadata = {
      version: '2.0.0',
      type,
      route: routePath,
      generated: new Date().toISOString(),
      totalSize: components.reduce((sum, c) => sum + c.size, 0),
      componentCount: components.length,
      strategy: this.config.strategy
    };

    return this.formatBundleFile(componentsData, metadata);
  }

  /**
   * Cleans JavaScript code by removing imports/exports and ensuring class is available globally
   */
  cleanJavaScript(code, componentName) {
    // Remove export default
    code = code.replace(/export\s+default\s+/g, '');

    // Remove imports (components will already be available)
    code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

    // Make sure the class is available globally for bundle evaluation
    // Preserve original customElements.define if it exists
    if (code.includes('customElements.define')) {
      // Add global assignment before customElements.define
      code = code.replace(/customElements\.define\([^;]+\);?\s*$/, `window.${componentName} = ${componentName};\n$&`);
    } else {
      // If no customElements.define found, just assign to global
      code += `\nwindow.${componentName} = ${componentName};`;
    }

    // Add return statement for bundle evaluation compatibility
    code += `\nreturn ${componentName};`;

    return code;
  }

  /**
   * Formats the bundle file
   */
  formatBundleFile(componentsData, metadata) {
    return `/**
 * Slice.js Bundle
 * Type: ${metadata.type}
 * Generated: ${metadata.generated}
 * Strategy: ${metadata.strategy}
 * Components: ${metadata.componentCount}
 * Total Size: ${(metadata.totalSize / 1024).toFixed(1)} KB
 */

export const SLICE_BUNDLE = {
  metadata: ${JSON.stringify(metadata, null, 2)},

  components: ${JSON.stringify(componentsData, null, 2)}
};

// Auto-registration of components
if (window.slice && window.slice.controller) {
  slice.controller.registerBundle(SLICE_BUNDLE);
}
`;
  }

  /**
   * Generates the bundle configuration
   */
  generateBundleConfig() {
    const config = {
      version: '2.0.0',
      strategy: this.config.strategy,
      generated: new Date().toISOString(),

      stats: {
        totalComponents: this.analysisData.metrics.totalComponents,
        totalRoutes: this.analysisData.metrics.totalRoutes,
        sharedComponents: this.bundles.critical.components.length,
        sharedPercentage: this.analysisData.metrics.sharedPercentage,
        totalSize: this.analysisData.metrics.totalSize,
        criticalSize: this.bundles.critical.size
      },

      bundles: {
        critical: {
          file: this.bundles.critical.file,
          size: this.bundles.critical.size,
          components: this.bundles.critical.components.map(c => c.name)
        },
        routes: {}
      }
    };

    for (const [key, bundle] of Object.entries(this.bundles.routes)) {
      config.bundles.routes[key] = {
        path: bundle.path || bundle.paths || key, // Support both single path and array of paths, fallback to key
        file: `slice-bundle.${this.routeToFileName(bundle.path || bundle.paths || key)}.js`,
        size: bundle.size,
        components: bundle.components.map(c => c.name),
        dependencies: ['critical']
      };
    }

    return config;
  }

  /**
   * Converts a route to filename
   */
  routeToFileName(routePath) {
    if (routePath === '/') return 'home';
    return routePath
      .replace(/^\//, '')
      .replace(/\//g, '-')
      .replace(/[^a-zA-Z0-9-]/g, '')
      .toLowerCase();
  }

  /**
   * Saves the configuration to file
   */
  async saveBundleConfig(config) {
    // Ensure bundles directory exists
    await fs.ensureDir(this.bundlesPath);

    // Save JSON config
    const configPath = path.join(this.bundlesPath, 'bundle.config.json');
    await fs.writeJson(configPath, config, { spaces: 2 });

    // Generate JavaScript module for direct import
    const jsConfigPath = path.join(this.bundlesPath, 'bundle.config.js');
    const jsConfig = this.generateBundleConfigJS(config);
    await fs.writeFile(jsConfigPath, jsConfig, 'utf-8');

    console.log(`✓ Configuration saved to ${configPath}`);
    console.log(`✓ JavaScript config generated: ${jsConfigPath}`);
  }

  /**
   * Creates a default bundle config file if none exists
   */
  async createDefaultBundleConfig() {
    const defaultConfigPath = path.join(this.srcPath, 'bundles', 'bundle.config.js');

    // Only create if it doesn't exist
    if (await fs.pathExists(defaultConfigPath)) {
      return;
    }

    await fs.ensureDir(path.dirname(defaultConfigPath));

    const defaultConfig = `/**
 * Slice.js Bundle Configuration
 * Default empty configuration - no bundles available
 * Run 'slice bundle' to generate optimized bundles
 */

// No bundles available - using individual component loading
export const SLICE_BUNDLE_CONFIG = null;

// No auto-initialization needed for default config
`;

    await fs.writeFile(defaultConfigPath, defaultConfig, 'utf-8');
    console.log(`✓ Default bundle config created: ${defaultConfigPath}`);
  }

  /**
   * Generates JavaScript module for direct import
   */
  generateBundleConfigJS(config) {
    return `/**
 * Slice.js Bundle Configuration
 * Generated: ${new Date().toISOString()}
 * Strategy: ${config.strategy}
 */

// Direct bundle configuration (no fetch required)
export const SLICE_BUNDLE_CONFIG = ${JSON.stringify(config, null, 2)};

// Auto-initialization if slice is available
if (typeof window !== 'undefined' && window.slice && window.slice.controller) {
  window.slice.controller.bundleConfig = SLICE_BUNDLE_CONFIG;

  // Load critical bundle automatically
  if (SLICE_BUNDLE_CONFIG.bundles.critical && !window.slice.controller.criticalBundleLoaded) {
    import('./slice-bundle.critical.js').catch(err =>
      console.warn('Failed to load critical bundle:', err)
    );
    window.slice.controller.criticalBundleLoaded = true;
  }
}
`;
  }
}
