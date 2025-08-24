// commands/startServer/startServer.js

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import Print from '../Print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Verifica si existe un build de producción
 */
async function checkProductionBuild() {
  const distDir = path.join(__dirname, '../../../../dist');
  return await fs.pathExists(distDir);
}

/**
 * Verifica si existe la estructura de desarrollo
 */
async function checkDevelopmentStructure() {
  const srcDir = path.join(__dirname, '../../../../src');
  const apiDir = path.join(__dirname, '../../../../api');
  
  return (await fs.pathExists(srcDir)) && (await fs.pathExists(apiDir));
}

/**
 * Modifica temporalmente el servidor Express para modo producción
 */
async function createProductionIndexFile() {
  try {
    const apiDir = path.join(__dirname, '../../../../api');
    const originalIndexPath = path.join(apiDir, 'index.js');
    const backupIndexPath = path.join(apiDir, 'index.dev.js');
    
    // Crear backup del index original si no existe
    if (!await fs.pathExists(backupIndexPath)) {
      await fs.copy(originalIndexPath, backupIndexPath);
    }
    
    // Leer el contenido original
    const originalContent = await fs.readFile(originalIndexPath, 'utf8');
    
    // Modificar para servir desde /dist en lugar de /src
    const productionContent = originalContent.replace(
      /express\.static\(['"`]src['"`]\)/g,
      "express.static('dist')"
    ).replace(
      /express\.static\(path\.join\(__dirname,\s*['"`]\.\.\/src['"`]\)\)/g,
      "express.static(path.join(__dirname, '../dist'))"
    );
    
    // Escribir la versión modificada directamente
    await fs.writeFile(originalIndexPath, productionContent, 'utf8');
    
    Print.success('Express server configured for production mode');
    
    return true;
  } catch (error) {
    Print.error(`Error configuring production server: ${error.message}`);
    return false;
  }
}

/**
 * Restaura el servidor Express al modo desarrollo
 */
async function restoreDevelopmentIndexFile() {
  try {
    const apiDir = path.join(__dirname, '../../../../api');
    const originalIndexPath = path.join(apiDir, 'index.js');
    const backupIndexPath = path.join(apiDir, 'index.dev.js');
    
    if (await fs.pathExists(backupIndexPath)) {
      await fs.copy(backupIndexPath, originalIndexPath);
      Print.success('Express server restored to development mode');
    }
    
    return true;
  } catch (error) {
    Print.error(`Error restoring development server: ${error.message}`);
    return false;
  }
}

/**
 * Inicia el servidor Node.js
 */
function startNodeServer(port, mode) {
  return new Promise((resolve, reject) => {
    const apiIndexPath = path.join(__dirname, '../../../../api/index.js');
    
    Print.info(`Starting ${mode} server on port ${port}...`);
    
    const serverProcess = spawn('node', [apiIndexPath], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port,
        NODE_ENV: mode === 'production' ? 'production' : 'development'
      }
    });

    serverProcess.on('error', (error) => {
      Print.error(`Failed to start server: ${error.message}`);
      reject(error);
    });

    // Manejar Ctrl+C para limpiar archivos temporales
    process.on('SIGINT', async () => {
      Print.info('Shutting down server...');
      
      if (mode === 'production') {
        await restoreDevelopmentIndexFile();
      }
      
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    // Manejar cierre del proceso
    process.on('SIGTERM', async () => {
      if (mode === 'production') {
        await restoreDevelopmentIndexFile();
      }
      
      serverProcess.kill('SIGTERM');
    });

    // El servidor se considera iniciado exitosamente después de un breve delay
    setTimeout(() => {
      Print.success(`${mode === 'production' ? 'Production' : 'Development'} server running at http://localhost:${port}`);
      Print.info(`Serving files from /${mode === 'production' ? 'dist' : 'src'} directory`);
      Print.info('Press Ctrl+C to stop the server');
      resolve(serverProcess);
    }, 1000);
  });
}

/**
 * Función principal para iniciar servidor
 */
export default async function startServer(options = {}) {
  const { mode = 'development', port = 3000 } = options;
  
  try {
    Print.title(`🚀 Starting Slice.js ${mode} server...`);
    Print.newLine();
    
    // Verificar estructura del proyecto
    if (!await checkDevelopmentStructure()) {
      throw new Error('Project structure not found. Run "slice init" first.');
    }
    
    if (mode === 'production') {
      // Modo producción: verificar build y configurar servidor
      if (!await checkProductionBuild()) {
        throw new Error('No production build found. Run "slice build" first.');
      }
      
      // Configurar Express para modo producción (modifica api/index.js temporalmente)
      const configSuccess = await createProductionIndexFile();
      if (!configSuccess) {
        throw new Error('Failed to configure production server');
      }
      
      Print.info('Production mode: serving optimized files from /dist');
    } else {
      // Modo desarrollo: asegurar que está en modo desarrollo
      await restoreDevelopmentIndexFile();
      Print.info('Development mode: serving files from /src with hot reload');
    }
    
    // Iniciar el servidor (solo uno)
    await startNodeServer(port, mode);
    
  } catch (error) {
    Print.error(`Failed to start server: ${error.message}`);
    
    // Limpiar en caso de error
    if (mode === 'production') {
      await restoreDevelopmentIndexFile();
    }
    
    throw error;
  }
}

/**
 * Funciones de utilidad exportadas
 */
export { checkProductionBuild, checkDevelopmentStructure };