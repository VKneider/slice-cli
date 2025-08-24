// commands/buildProduction/buildProduction.js

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { minify as terserMinify } from 'terser';
import CleanCSS from 'clean-css';
import htmlMinifier from 'html-minifier-terser';
import Print from '../Print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Opciones de minificación para diferentes tipos de archivos
 */
const getMinificationOptions = () => ({
  js: {
    compress: {
      dead_code: true,
      drop_console: true, // Remover console.log en producción
      drop_debugger: true,
      pure_funcs: ['console.log', 'console.info', 'console.warn'],
      passes: 2
    },
    mangle: {
      toplevel: true,
      reserved: ['Slice', 'Controller', 'StylesManager'] // Preservar clases principales
    },
    output: {
      comments: false,
      beautify: false
    },
    toplevel: true
  },
  css: {
    level: 2, // Optimización agresiva
    returnPromise: false
  },
  html: {
    collapseWhitespace: true,
    removeComments: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
    minifyCSS: true,
    minifyJS: true,
    useShortDoctype: true,
    removeAttributeQuotes: true,
    removeOptionalTags: true
  }
});

/**
 * Minifica un archivo JavaScript
 */
async function minifyJavaScript(content, filename) {
  try {
    const options = getMinificationOptions().js;
    const result = await terserMinify(content, options);
    
    if (result.error) {
      throw result.error;
    }
    
    const originalSize = Buffer.byteLength(content, 'utf8');
    const minifiedSize = Buffer.byteLength(result.code, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    Print.minificationResult(filename, originalSize, minifiedSize, savings);
    
    return result.code;
  } catch (error) {
    Print.error(`Error minifying ${filename}: ${error.message}`);
    throw error;
  }
}

/**
 * Minifica un archivo CSS
 */
async function minifyCSS(content, filename) {
  try {
    const cleanCSS = new CleanCSS(getMinificationOptions().css);
    const result = cleanCSS.minify(content);
    
    if (result.errors && result.errors.length > 0) {
      throw new Error(result.errors.join(', '));
    }
    
    const originalSize = Buffer.byteLength(content, 'utf8');
    const minifiedSize = Buffer.byteLength(result.styles, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    Print.minificationResult(filename, originalSize, minifiedSize, savings);
    
    return result.styles;
  } catch (error) {
    Print.error(`Error minifying ${filename}: ${error.message}`);
    throw error;
  }
}

/**
 * Minifica un archivo HTML
 */
async function minifyHTML(content, filename) {
  try {
    const result = await htmlMinifier.minify(content, getMinificationOptions().html);
    
    const originalSize = Buffer.byteLength(content, 'utf8');
    const minifiedSize = Buffer.byteLength(result, 'utf8');
    const savings = ((originalSize - minifiedSize) / originalSize * 100).toFixed(1);
    
    Print.minificationResult(filename, originalSize, minifiedSize, savings);
    
    return result;
  } catch (error) {
    Print.error(`Error minifying ${filename}: ${error.message}`);
    throw error;
  }
}

/**
 * Procesa un archivo según su extensión
 */
async function processFile(srcPath, destPath, relativePath) {
  try {
    const content = await fs.readFile(srcPath, 'utf8');
    const ext = path.extname(srcPath).toLowerCase();
    let processedContent = content;

    switch (ext) {
      case '.js':
        processedContent = await minifyJavaScript(content, relativePath);
        break;
      case '.css':
        processedContent = await minifyCSS(content, relativePath);
        break;
      case '.html':
        processedContent = await minifyHTML(content, relativePath);
        break;
      default:
        // Para otros archivos (JSON, etc.), solo copiar
        await fs.copy(srcPath, destPath);
        return;
    }

    await fs.writeFile(destPath, processedContent, 'utf8');
    
  } catch (error) {
    Print.error(`Error processing ${relativePath}: ${error.message}`);
    throw error;
  }
}

/**
 * Copia y procesa recursivamente todos los archivos de src a dist
 */
async function processDirectory(srcDir, distDir, baseSrcDir) {
  const items = await fs.readdir(srcDir);
  
  for (const item of items) {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(distDir, item);
    const relativePath = path.relative(baseSrcDir, srcPath);
    
    const stat = await fs.stat(srcPath);
    
    if (stat.isDirectory()) {
      await fs.ensureDir(destPath);
      await processDirectory(srcPath, destPath, baseSrcDir);
    } else {
      const ext = path.extname(srcPath).toLowerCase();
      
      // Procesar archivos que pueden ser minificados
      if (['.js', '.css', '.html'].includes(ext)) {
        await processFile(srcPath, destPath, relativePath);
      } else {
        // Copiar otros archivos sin modificar
        await fs.copy(srcPath, destPath);
      }
    }
  }
}

/**
 * Crea un bundle optimizado del archivo principal Slice.js
 */
async function createOptimizedBundle() {
  try {
    Print.info('Creating optimized Slice.js bundle...');
    
    const slicePath = path.join(__dirname, '../../../../src/Slice/Slice.js');
    const distSlicePath = path.join(__dirname, '../../../../dist/Slice/Slice.js');
    
    if (!await fs.pathExists(slicePath)) {
      Print.warning('Slice.js main file not found, skipping bundle optimization');
      return;
    }
    
    const content = await fs.readFile(slicePath, 'utf8');
    const minifiedContent = await minifyJavaScript(content, 'Slice/Slice.js');
    
    await fs.ensureDir(path.dirname(distSlicePath));
    await fs.writeFile(distSlicePath, minifiedContent, 'utf8');
    
    Print.success('Optimized Slice.js bundle created');
    
  } catch (error) {
    Print.error(`Error creating optimized bundle: ${error.message}`);
    throw error;
  }
}

/**
 * Copia sliceConfig.json sin modificaciones
 */
async function copySliceConfig() {
  try {
    const srcConfigPath = path.join(__dirname, '../../../../src/sliceConfig.json');
    const distConfigPath = path.join(__dirname, '../../../../dist/sliceConfig.json');
    
    if (await fs.pathExists(srcConfigPath)) {
      await fs.copy(srcConfigPath, distConfigPath);
      Print.success('sliceConfig.json copied to dist');
    } else {
      Print.warning('sliceConfig.json not found in src, skipping copy');
    }
  } catch (error) {
    Print.error(`Error copying sliceConfig.json: ${error.message}`);
    throw error;
  }
}

/**
 * Genera estadísticas del build
 */
async function generateBuildStats(srcDir, distDir) {
  try {
    Print.info('Generating build statistics...');
    
    const calculateDirSize = async (dir) => {
      let totalSize = 0;
      const files = await fs.readdir(dir, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = path.join(dir, file.name);
        if (file.isDirectory()) {
          totalSize += await calculateDirSize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          totalSize += stats.size;
        }
      }
      return totalSize;
    };

    const srcSize = await calculateDirSize(srcDir);
    const distSize = await calculateDirSize(distDir);
    const savings = ((srcSize - distSize) / srcSize * 100).toFixed(1);
    
    Print.newLine();
    Print.title('📊 Build Statistics');
    console.log(`📁 Source size:      ${(srcSize / 1024).toFixed(1)} KB`);
    console.log(`📦 Production size:  ${(distSize / 1024).toFixed(1)} KB`);
    console.log(`💾 Size reduction:   ${savings}% saved`);
    
  } catch (error) {
    Print.warning(`Could not generate build statistics: ${error.message}`);
  }
}

/**
 * Función principal de build para producción
 */
export default async function buildProduction(options = {}) {
  const startTime = Date.now();
  
  try {
    Print.title('🚀 Building Slice.js project for production...');
    Print.newLine();
    
    // Verificar que existe src
    const srcDir = path.join(__dirname, '../../../../src');
    const distDir = path.join(__dirname, '../../../../dist');
    
    if (!await fs.pathExists(srcDir)) {
      throw new Error('src directory not found. Run "slice init" first.');
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
    console.log('  • The same /api folder serves both development and production');
    console.log('  • Update your Express server to serve from /dist instead of /src');
    console.log('  • Deploy both /api and /dist directories to your hosting provider');
    console.log('  • Use "slice build --serve" to preview the production build locally');
    
    return true;

  } catch (error) {
    Print.error(`Build failed: ${error.message}`);
    return false;
  }
}

/**
 * Servidor de desarrollo para testing del build de producción
 * Usa Express como el servidor principal pero sirviendo desde /dist
 */
export async function serveProductionBuild(port = 3001) {
  try {
    const distDir = path.join(__dirname, '../../../../dist');
    
    if (!await fs.pathExists(distDir)) {
      throw new Error('No production build found. Run "slice build" first.');
    }

    Print.info(`Starting production build server on port ${port}...`);
    
    // Implementar servidor estático simple que simula el comportamiento de la API
    const express = await import('express');
    const app = express.default();
    
    // Servir archivos estáticos desde dist (equivalente a lo que hace la API con src)
    app.use(express.default.static(distDir));
    
    // SPA fallback - servir index.html para rutas no encontradas
    app.get('*', (req, res) => {
      const indexPath = path.join(distDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('Production build not found');
      }
    });
    
    app.listen(port, () => {
      Print.success(`Production build server running at http://localhost:${port}`);
      Print.info('Press Ctrl+C to stop the server');
      Print.info('This server simulates production environment using /dist files');
    });
    
  } catch (error) {
    Print.error(`Error starting production server: ${error.message}`);
    throw error;
  }
}

/**
 * Comando build con opciones
 */
export async function buildCommand(options = {}) {
  // Verificar dependencias necesarias
  if (!await checkBuildDependencies()) {
    return false;
  }

  if (options.serve) {
    // Solo servir build existente
    await serveProductionBuild(options.port);
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
    Print.info('Starting preview server...');
    setTimeout(() => {
      serveProductionBuild(options.port);
    }, 1000);
  }
  
  return success;
}

/**
 * Verifica que las dependencias de build estén instaladas
 */
async function checkBuildDependencies() {
  try {
    Print.info('Checking build dependencies...');
    
    const packageJsonPath = path.join(__dirname, '../../../../package.json');
    
    if (!await fs.pathExists(packageJsonPath)) {
      throw new Error('package.json not found');
    }
    
    const packageJson = await fs.readJson(packageJsonPath);
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = ['terser', 'clean-css', 'html-minifier-terser'];
    const missing = requiredDeps.filter(dep => !deps[dep]);
    
    if (missing.length > 0) {
      Print.error('Missing build dependencies:');
      missing.forEach(dep => console.log(`  • ${dep}`));
      Print.newLine();
      Print.info('Install missing dependencies:');
      console.log(`npm install --save-dev ${missing.join(' ')}`);
      return false;
    }
    
    Print.success('All build dependencies are installed');
    return true;
    
  } catch (error) {
    Print.error(`Error checking dependencies: ${error.message}`);
    return false;
  }
}

/**
 * Analiza el tamaño y composición del build
 */
async function analyzeBuild() {
  try {
    const distDir = path.join(__dirname, '../../../../dist');
    
    if (!await fs.pathExists(distDir)) {
      throw new Error('No production build found. Run "slice build" first.');
    }

    Print.title('📊 Build Analysis');
    Print.newLine();
    
    const analyzeDirectory = async (dir, prefix = '') => {
      const items = await fs.readdir(dir);
      let totalSize = 0;
      
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = await fs.stat(itemPath);
        
        if (stat.isDirectory()) {
          const dirSize = await analyzeDirectory(itemPath, `${prefix}${item}/`);
          totalSize += dirSize;
        } else {
          const size = (stat.size / 1024).toFixed(1);
          console.log(`📄 ${prefix}${item}: ${size} KB`);
          totalSize += stat.size;
        }
      }
      
      return totalSize;
    };
    
    const totalSize = await analyzeDirectory(distDir);
    Print.newLine();
    Print.info(`Total build size: ${(totalSize / 1024).toFixed(1)} KB`);
    
  } catch (error) {
    Print.error(`Error analyzing build: ${error.message}`);
  }
}