import chokidar from 'chokidar';
import chalk from 'chalk';
import Print from '../Print.js';

/**
 * Configura el watcher para archivos del proyecto
 * @param {ChildProcess} serverProcess - Proceso del servidor
 * @returns {FSWatcher} - Watcher de chokidar
 */
export default function setupWatcher(serverProcess, onRestart) {
    Print.info('Watch mode enabled - monitoring file changes...');
    Print.newLine();

    const watcher = chokidar.watch(['src/**/*', 'api/**/*'], {
        ignored: [
            /(^|[\/\\])\../,  // archivos ocultos
            '**/node_modules/**',
            '**/dist/**',
            '**/bundles/**',
            '**/*.log'
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50
        }
    });

    let reloadTimeout;

    watcher
        .on('change', (path) => {
            // Debounce para evitar múltiples reloads
            clearTimeout(reloadTimeout);
            reloadTimeout = setTimeout(() => {
                if(onRestart) {
                    console.log(chalk.yellow('🔄 Changes detected, restarting server...'));
                    onRestart(path);
                } else {
                    console.log(chalk.yellow('🔄 Changes detected, server will reload automatically... (No handler)'));
                }
            }, 500);
        })
        .on('add', (path) => {
             // console.log(chalk.green(`➕ New file added: ${path}`));
             clearTimeout(reloadTimeout);
             reloadTimeout = setTimeout(() => {
                 if (onRestart) onRestart(path);
             }, 500);
        })
        .on('unlink', (path) => {
             // console.log(chalk.red(`➖ File removed: ${path}`));
             clearTimeout(reloadTimeout);
             reloadTimeout = setTimeout(() => {
                 if (onRestart) onRestart(path);
             }, 500);
        })
        .on('error', (error) => {
            Print.error(`Watcher error: ${error.message}`);
        })
        .on('ready', () => {
            console.log(chalk.gray('👀 Watching for file changes...'));
            Print.newLine();
        });

    return watcher;
}

/**
 * Detiene el watcher de forma segura
 * @param {FSWatcher} watcher - Watcher a detener
 */
export function stopWatcher(watcher) {
    if (watcher) {
        watcher.close();
        console.log(chalk.gray('Watch mode stopped'));
    }
}
