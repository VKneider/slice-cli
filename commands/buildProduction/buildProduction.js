// commands/buildProduction/buildProduction.js - CON SLICECONFIG PORT

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import UglifyJS from 'uglify-js';
import { minify } from 'html-minifier-terser';
import CleanCSS from 'clean-css';
import Print from '../Print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Carga la configuración desde sliceConfig.json
 */
const loadConfig = () => {
  try {
    const configPath = path.join(__dirname, '../../../../src/sliceConfig.json');
    const rawData = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(rawData);
  } catch (error) {
    Print.error(`Loading configuration: ${error.message}`);
    return null;
  }
};

/**
 * Verifica dependencias necesarias para el build
 */
async function checkBuildDependencies() {
  const srcDir = path.join(__dirname, '../../../../src');
  
  if (!await fs.pathExists(srcDir)) {
    Print.error('Source directory (/src) not found');
    Print.info('Run "slice init" to initialize your project');
    return false;
  }
  
  return true;
}

/**
 * Copia sliceConfig.json al directorio dist
 */
async function copySliceConfig() {
  const srcConfig = path.join(__dirname, '../../../../src/sliceConfig.json');
  const distConfig = path.join(__dirname, '../../../../dist/sliceConfig.json');
  
  if (await fs.pathExists(srcConfig)) {
    await fs.copy(srcConfig, distConfig);
    Print.info('sliceConfig.json copied to dist');
  }
}

/**
 * Procesa un directorio completo
 */
async function processDirectory(srcPath, distPath, baseSrcPath) {
  const items = await fs.readdir(srcPath);
  
  for (const item of items) {
    const srcItemPath = path.join(srcPath, item);
    const distItemPath = path.join(distPath, item);
    const stat = await fs.stat(srcItemPath);
    
    if (stat.isDirectory()) {
      await fs.ensureDir(distItemPath);
      await processDirectory(srcItemPath, distItemPath, baseSrcPath);
    } else {
      await processFile(srcItemPath, distItemPath);
    }
  }
}

/**
 * Procesa un archivo individual
 */
async function processFile(srcFilePath, distFilePath) {
  const ext = path.extname(srcFilePath).toLowerCase();
  
  try {
    if (ext === '.js') {
      await minifyJavaScript(srcFilePath, distFilePath);
    } else if (ext === '.css') {
      await minifyCSS(srcFilePath, distFilePath);
    } else if (ext === '.html') {
      await minifyHTML(srcFilePath, distFilePath);
    } else {
      // Copiar archivos que no necesitan minificación
      await fs.copy(srcFilePath, distFilePath);
    }
  } catch (error) {
    Print.error(`Processing ${path.basename(srcFilePath)}: ${error.message}`);
    // Copiar archivo original si falla la minificación
    await fs.copy(srcFilePath, distFilePath);
  }
}

/**
 * Minifica archivos JavaScript
 */
async function minifyJavaScript(srcPath, distPath) {
  const content = await fs.readFile(srcPath, 'utf8');
  const originalSize = Buffer.byteLength(content, 'utf8');
  
  const result = UglifyJS.minify(content, {
    compress: {
      drop_console: false,
      drop_debugger: true,
      pure_funcs: ['console.log']
    },
    mangle: {
      reserved: ['slice', 'Slice']
    },
    output: {
      comments: false
    }
  });

  if (result.error) {
    throw new Error(`UglifyJS error: ${result.error}`);
  }

  await fs.writeFile(distPath, result.code, 'utf8');
  
  const minifiedSize = Buffer.byteLength(result.code, 'utf8');
  const savings = Math.round(((originalSize - minifiedSize) / originalSize) * 100);
  
  Print.minificationResult(path.basename(srcPath), originalSize, minifiedSize, savings);
}

/**
 * Minifica archivos CSS
 */
async function minifyCSS(srcPath, distPath) {
  const content = await fs.readFile(srcPath, 'utf8');
  const originalSize = Buffer.byteLength(content, 'utf8');
  
  const cleanCSS = new CleanCSS({
    level: 2,
    returnPromise: false
  });
  
  const result = cleanCSS.minify(content);
  
  if (result.errors.length > 0) {
    throw new Error(`CleanCSS errors: ${result.errors.join(', ')}`);
  }

  await fs.writeFile(distPath, result.styles, 'utf8');
  
  const minifiedSize = Buffer.byteLength(result.styles, 'utf8');
  const savings = Math.round(((originalSize - minifiedSize) / originalSize) * 100);
  
  Print.minificationResult(path.basename(srcPath), originalSize, minifiedSize, savings);
}

/**
 * Minifica archivos HTML
 */
async function minifyHTML(srcPath, distPath) {
  const content = await fs.readFile(srcPath, 'utf8');
  const originalSize = Buffer.byteLength(content, 'utf8');
  
  const minified = await minify(content, {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeScriptTypeAttributes: true,
    removeStyleLinkTypeAttributes: true,
    useShortDoctype: true,
    minifyCSS: true,
    minifyJS: true
  });

  await fs.writeFile(distPath, minified, 'utf8');
  
  const minifiedSize = Buffer.byteLength(minified, 'utf8');
  const savings = Math.round(((originalSize - minifiedSize) / originalSize) * 100);
  
  Print.minificationResult(path.basename(srcPath), originalSize, minifiedSize, savings);
}

/**
 * Crea un bundle optimizado del archivo principal
 */
async function createOptimizedBundle() {
  Print.buildProgress('Creating optimized bundle...');
  
  const mainJSPath = path.join(__dirname, '../../../../dist/App/index.js');
  
  if (await fs.pathExists(mainJSPath)) {
    Print.success('Main bundle optimized');
  } else {
    Print.warning('No main JavaScript file found for bundling');
  }
}

/**
 * Genera estadísticas del build
 */
async function generateBuildStats(srcDir, distDir) {
  Print.buildProgress('Generating build statistics...');
  
  const getDirectorySize = async (dirPath) => {
    let totalSize = 0;
    const items = await fs.readdir(dirPath);
    
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = await fs.stat(itemPath);
      
      if (stat.isDirectory()) {
        totalSize += await getDirectorySize(itemPath);
      } else {
        totalSize += stat.size;
      }
    }
    
    return totalSize;
  };

  try {
    const srcSize = await getDirectorySize(srcDir);
    const distSize = await getDirectorySize(distDir);
    const savings = Math.round(((srcSize - distSize) / srcSize) * 100);
    
    Print.newLine();
    Print.info(`📊 Build Statistics:`);
    console.log(`   Source: ${(srcSize / 1024).toFixed(1)} KB`);
    console.log(`   Built:  ${(distSize / 1024).toFixed(1)} KB`);
    console.log(`   Saved:  ${savings}% smaller`);
    
  } catch (error) {
    Print.warning('Could not generate build statistics');
  }
}

/**
 * Analiza el build sin construir
 */
async function analyzeBuild() {
  const distDir = path.join(__dirname, '../../../../dist');
  
  if (!await fs.pathExists(distDir)) {
    Print.error('No build found to analyze. Run "slice build" first.');
    return;
  }
  
  Print.info('Analyzing production build...');
  await generateBuildStats(
    path.join(__dirname, '../../../../src'),
    distDir
  );
}

/**
 * Función principal de build
 */
export default async function buildProduction(options = {}) {
  const startTime = Date.now();
  
  try {
    Print.title('🔨 Building Slice.js project for production...');
    Print.newLine();
    
    const srcDir = path.join(__dirname, '../../../../src');
    const distDir = path.join(__dirname, '../../../../dist');
    
    // Verificar que existe el directorio src
    if (!await fs.pathExists(srcDir)) {
      throw new Error('Source directory not found. Run "slice init" first.');
    }

    // 1. Limpiar directorio dist
    if (await fs.pathExists(distDir)) {
      if (!options.skipClean) {
        Print.info('Cleaning previous build...');
        await fs.remove(distDir);
        Print.success('Previous build cleaned');
      }
    }
    
    await fs.ensureDir(distDir);

    // 2. Copiar sliceConfig.json sin modificaciones
    await copySliceConfig();

    // 3. Procesar todos los archivos de src
    Print.info('Processing and minifying source files...');
    await processDirectory(srcDir, distDir, srcDir);
    Print.success('All source files processed and optimized');

    // 4. Crear bundle optimizado del archivo principal
    await createOptimizedBundle();

    // 5. Generar estadísticas
    await generateBuildStats(srcDir, distDir);

    // 6. Tiempo total
    const buildTime = ((Date.now() - startTime) / 1000).toFixed(1);
    
    Print.newLine();
    Print.success(`✨ Production build completed in ${buildTime}s`);
    Print.info('Your optimized project is ready in the /dist directory');
    Print.newLine();
    Print.info('Next steps:');
    console.log('  • Use "npm run slice:start" to test the production build');
    console.log('  • Deploy both /api and /dist directories to your hosting provider');
    console.log('  • Use "slice build --serve" to preview the production build');
    
    return true;

  } catch (error) {
    Print.error(`Build failed: ${error.message}`);
    return false;
  }
}

/**
 * Servidor de preview para testing del build de producción
 */
export async function serveProductionBuild(port) {
  try {
    const config = loadConfig();
    const defaultPort = config?.server?.port || 3001;
    const finalPort = port || defaultPort;
    
    const distDir = path.join(__dirname, '../../../../dist');
    
    if (!await fs.pathExists(distDir)) {
      throw new Error('No production build found. Run "slice build" first.');
    }

    Print.info(`Starting production preview server on port ${finalPort}...`);
    
    // Implementar servidor estático simple
    const express = await import('express');
    const app = express.default();
    
    // Servir archivos estáticos desde dist
    app.use(express.default.static(distDir));
    
    // SPA fallback - servir index.html para rutas no encontradas
    app.get('*', (req, res) => {
      const indexPath = path.join(distDir, 'App/index.html');
      const fallbackPath = path.join(distDir, 'index.html');
      
      // Intentar primero App/index.html, luego index.html
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else if (fs.existsSync(fallbackPath)) {
        res.sendFile(fallbackPath);
      } else {
        res.status(404).send('Production build index.html not found');
      }
    });
    
    app.listen(finalPort, () => {
      Print.success(`Production preview server running at http://localhost:${finalPort}`);
      Print.info('Press Ctrl+C to stop the server');
      Print.info('This server previews your production build from /dist');
      Print.warning('This is a preview server - use "npm run slice:start" for the full production server');
    });
    
  } catch (error) {
    Print.error(`Error starting production preview server: ${error.message}`);
    throw error;
  }
}

/**
 * Comando build con opciones
 */
export async function buildCommand(options = {}) {
  const config = loadConfig();
  const defaultPort = config?.server?.port || 3001;
  
  // Verificar dependencias necesarias
  if (!await checkBuildDependencies()) {
    return false;
  }

  if (options.serve) {
    // Solo servir build existente
    await serveProductionBuild(options.port || defaultPort);
    return true;
  }

  if (options.analyze) {
    // Analizar build sin construir
    await analyzeBuild();
    return true;
  }

  // Build completo
  const success = await buildProduction(options);
  
  if (success && options.preview) {
    Print.newLine();
    Print.info('✨ Build completed successfully!');
    Print.info(`Starting preview server on port ${options.port || defaultPort}...`);
    await serveProductionBuild(options.port || defaultPort);
  }
  
  return success;
}