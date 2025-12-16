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
    } else if (totalComponents < 60) {
      this.config.strategy = 'hybrid';
      console.log('📦 Strategy: Hybrid (critical + per route)');
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

        // Small and highly used components
        const isSmallAndUseful = comp.size < 5000 && comp.routes.size >= 2;

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
      const wouldExceedSize = this.bundles.critical.size + comp.size > this.config.maxCriticalSize;
      const wouldExceedCount = this.bundles.critical.components.length >= this.config.maxCriticalComponents;

      if (wouldExceedSize || wouldExceedCount) break;

      this.bundles.critical.components.push(comp);
      this.bundles.critical.size += comp.size;
    }

    console.log(`✓ Critical bundle: ${this.bundles.critical.components.length} components, ${(this.bundles.critical.size / 1024).toFixed(1)} KB`);
  }

  /**
   * Assigns remaining components to route bundles
   */
  assignRouteComponents() {
    const criticalNames = new Set(this.bundles.critical.components.map(c => c.name));

    for (const [routePath, route] of this.analysisData.routes) {
      // Get all route dependencies
      const routeComponents = this.getRouteComponents(route.component);

      // Filter those already in critical
      const uniqueComponents = routeComponents.filter(comp =>
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
        bundle.path
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
    const filePath = path.join(this.srcPath, fileName);

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
   * Generates the content of a bundle
   */
  async generateBundleContent(components, type, routePath) {
    const componentsData = {};

    for (const comp of components) {
      const jsContent = await fs.readFile(
        path.join(comp.path, `${comp.name}.js`),
        'utf-8'
      );

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
        js: this.cleanJavaScript(jsContent),
        html: htmlContent,
        css: cssContent,
        size: comp.size,
        dependencies: Array.from(comp.dependencies)
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
   * Cleans JavaScript code by removing imports/exports
   */
  cleanJavaScript(code) {
    // Remove export default
    code = code.replace(/export\s+default\s+/g, '');

    // Remove imports (components will already be available)
    code = code.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');

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
        path: bundle.path,
        file: bundle.file,
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
    const configPath = path.join(this.srcPath, 'bundle.config.json');
    await fs.writeJson(configPath, config, { spaces: 2 });
    console.log(`✓ Configuration saved to ${configPath}`);
  }
}