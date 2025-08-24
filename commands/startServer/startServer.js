// commands/startServer/startServer.js - VERSIÓN SIMPLIFICADA

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
 * Inicia el servidor Node.js - SIMPLIFICADO
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

    // Manejar Ctrl+C - SIMPLIFICADO
    process.on('SIGINT', () => {
      Print.info('Shutting down server...');
      serverProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
    });

    // NO mostrar mensajes duplicados - el api/index.js ya se encarga
    setTimeout(() => {
      resolve(serverProcess);
    }, 500);
  });
}

/**
 * Función principal para iniciar servidor - ULTRA SIMPLIFICADA
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
    
    // Iniciar el servidor - api/index.js maneja todo automáticamente
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