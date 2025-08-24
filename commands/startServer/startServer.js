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
        NODE_ENV: mode === 'production' ? 'production' : 'development',
        SLICE_CLI_MODE: 'true' // Flag para que api/index.js sepa que viene del CLI
      }
    });

    serverProcess.on('error', (error) => {
      Print.error(`Failed to start server: ${error.message}`);
      reject(error);
    });

    // Manejar Ctrl+C
    process.on('SIGINT', () => {
      Print.info('Shutting down server...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    // Manejar cierre del proceso
    process.on('SIGTERM', () => {
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
 * Función principal para iniciar servidor - SIMPLIFICADA
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
      // Verificar que existe build de producción
      if (!await checkProductionBuild()) {
        throw new Error('No production build found. Run "slice build" first.');
      }
      Print.info('Production mode: serving optimized files from /dist');
    } else {
      Print.info('Development mode: serving files from /src with hot reload');
    }
    
    // Iniciar el servidor - api/index.js detectará automáticamente el modo
    await startNodeServer(port, mode);
    
  } catch (error) {
    Print.error(`Failed to start server: ${error.message}`);
    throw error;
  }
}

/**
 * Funciones de utilidad exportadas
 */
export { checkProductionBuild, checkDevelopmentStructure };