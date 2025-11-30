// commands/startServer/startServer.js - MEJORADO CON VALIDACIÓN Y FEEDBACK

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createServer } from 'net';
import setupWatcher, { stopWatcher } from './watchServer.js';
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
 * Verifica si un puerto está disponible
 */
async function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
}

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
 * Inicia el servidor Node.js con argumentos y mejor feedback
 */
function startNodeServer(port, mode) {
  return new Promise((resolve, reject) => {
    const apiIndexPath = path.join(__dirname, '../../../../api/index.js');

    // Verificar que el archivo existe
    if (!fs.existsSync(apiIndexPath)) {
      reject(new Error(`Server file not found: ${apiIndexPath}`));
      return;
    }

    Print.serverStatus('starting', 'Starting server...');

    // Construir argumentos basados en el modo
    const args = [apiIndexPath];
    if (mode === 'production') {
      args.push('--production');
    } else {
      args.push('--development');
    }

    const serverProcess = spawn('node', args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PORT: port
      }
    });

    let serverStarted = false;
    let outputBuffer = '';

    // Capturar la salida para detectar cuando el servidor está listo
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      outputBuffer += output;

      // Detectar mensajes comunes que indican que el servidor ha iniciado
      if (!serverStarted && (
        output.includes('Server running') ||
        output.includes('listening on') ||
        output.includes('Started on') ||
        output.includes(`port ${port}`)
      )) {
        serverStarted = true;
        Print.serverReady(port);
      }

      // Mostrar la salida del servidor
      process.stdout.write(output);
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      process.stderr.write(output);
    });

    serverProcess.on('error', (error) => {
      if (!serverStarted) {
        Print.serverStatus('error', `Failed to start server: ${error.message}`);
        reject(error);
      }
    });

    serverProcess.on('exit', (code, signal) => {
      if (code !== null && code !== 0 && !serverStarted) {
        reject(new Error(`Server exited with code ${code}`));
      }
    });

    // Manejar Ctrl+C
    process.on('SIGINT', () => {
      Print.newLine();
      Print.info('Shutting down server...');
      serverProcess.kill('SIGINT');
      setTimeout(() => {
        process.exit(0);
      }, 100);
    });

    process.on('SIGTERM', () => {
      serverProcess.kill('SIGTERM');
    });

    // Si después de 3 segundos no detectamos inicio, asumimos que está listo
    setTimeout(() => {
      if (!serverStarted) {
        serverStarted = true;
        Print.serverReady(port);
      }
      resolve(serverProcess);
    }, 3000);
  });
}

/**
 * Función principal para iniciar servidor
 */
export default async function startServer(options = {}) {
  const config = loadConfig();
  const defaultPort = config?.server?.port || 3000;

  const { mode = 'development', port = defaultPort, watch = false } = options;

  try {
    Print.title(`🚀 Starting Slice.js ${mode} server...`);
    Print.newLine();

    // Verificar estructura del proyecto
    if (!await checkDevelopmentStructure()) {
      throw new Error('Project structure not found. Run "slice init" first.');
    }

    // Verificar disponibilidad del puerto
    Print.checkingPort(port);
    const portAvailable = await isPortAvailable(port);

    if (!portAvailable) {
      throw new Error(
        `Port ${port} is already in use. Please:\n` +
        `  1. Stop the process using port ${port}, or\n` +
        `  2. Use a different port: slice ${mode === 'development' ? 'dev' : 'start'} -p <port>`
      );
    }

    Print.serverStatus('checking', 'Port available ✓');
    Print.newLine();

    if (mode === 'production') {
      // Verificar que existe build de producción
      if (!await checkProductionBuild()) {
        throw new Error('No production build found. Run "slice build" first.');
      }
      Print.info('Production mode: serving optimized files from /dist');
    } else {
      Print.info('Development mode: serving files from /src with hot reload');
    }

    Print.newLine();

    // Iniciar el servidor con argumentos
    const serverProcess = await startNodeServer(port, mode);

    // Configurar watch mode si está habilitado
    if (watch) {
      Print.newLine();
      const watcher = setupWatcher(serverProcess);

      // Cleanup en exit
      const cleanup = () => {
        stopWatcher(watcher);
      };

      process.on('SIGINT', cleanup);
      process.on('SIGTERM', cleanup);
    }

  } catch (error) {
    Print.newLine();
    Print.error(error.message);
    throw error;
  }
}

/**
 * Funciones de utilidad exportadas
 */
export { checkProductionBuild, checkDevelopmentStructure, isPortAvailable };