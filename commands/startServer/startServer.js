// commands/startServer/startServer.js - CON ARGUMENTOS

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
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
 * Inicia el servidor Node.js con argumentos
 */
function startNodeServer(port, mode) {
  return new Promise((resolve, reject) => {
    const apiIndexPath = path.join(__dirname, '../../../../api/index.js');
    
    Print.info(`Starting ${mode} server on port ${port}...`);
    
    // Construir argumentos basados en el modo
    const args = [apiIndexPath];
    if (mode === 'production') {
      args.push('--production');
    } else {
      args.push('--development');
    }
    
    const serverProcess = spawn('node', args, {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: port
        // Ya no necesitamos NODE_ENV ni SLICE_CLI_MODE
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

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
    });

    setTimeout(() => {
      resolve(serverProcess);
    }, 500);
  });
}

/**
 * Función principal para iniciar servidor
 */
export default async function startServer(options = {}) {
  const config = loadConfig();
  const defaultPort = config?.server?.port || 3000;
  
  const { mode = 'development', port = defaultPort } = options;
  
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
    
    // Iniciar el servidor con argumentos
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