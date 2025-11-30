import chalk from 'chalk';

export default class Print {
    constructor() { }

    static error(message) {
        console.error(chalk.red(`❌ Error: ${message}`));
    }

    static success(message) {
        console.log(chalk.green(`✅ Success: ${message}`));
    }

    static warning(message) {
        console.log(chalk.yellow(`⚠️  Warning: ${message}`));
    }

    static info(message) {
        console.log(chalk.cyan(`ℹ️  Info: ${message}`));
    }

    static title(message) {
        console.log(chalk.magenta.bold(`🎯 ${message}`));
    }

    static subtitle(message) {
        console.log(chalk.blue(`📋 ${message}`));
    }

    static step(stepNumber, message) {
        console.log(chalk.cyan(`${stepNumber}. ${message}`));
    }

    static highlight(message) {
        console.log(chalk.bgYellow.black(` ${message} `));
    }

    static newLine() {
        console.log('');
    }

    static separator() {
        console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'));
    }

    // Métodos para el contexto específico del CLI
    static componentSuccess(componentName, action = 'processed') {
        console.log(chalk.green(`✅ ${componentName} ${action} successfully!`));
    }

    static componentError(componentName, action = 'processing', error) {
        console.error(chalk.red(`❌ Error ${action} ${componentName}: ${error}`));
    }

    static downloadProgress(fileName) {
        console.log(chalk.cyan(`  📥 Downloading ${fileName}...`));
    }

    static downloadSuccess(fileName) {
        console.log(chalk.green(`  ✅ ${fileName}`));
    }

    static downloadError(fileName, error) {
        console.error(chalk.red(`  ❌ Error downloading ${fileName}: ${error}`));
    }

    static registryUpdate(message) {
        console.log(chalk.magenta(`📝 Registry: ${message}`));
    }

    static versionInfo(component, currentVersion, latestVersion = null) {
        if (latestVersion && currentVersion !== latestVersion) {
            console.log(chalk.yellow(`🔄 ${component}: v${currentVersion} → v${latestVersion}`));
        } else {
            console.log(chalk.green(`✅ ${component}: v${currentVersion}`));
        }
    }

    static commandExample(description, command) {
        console.log(chalk.gray(`💡 ${description}:`));
        console.log(chalk.white(`   ${command}`));
    }

    static summary(successful, failed, total) {
        Print.separator();
        console.log(chalk.bold('📊 Summary:'));
        if (successful > 0) {
            Print.success(`Successful: ${successful}/${total}`);
        }
        if (failed > 0) {
            Print.error(`Failed: ${failed}/${total}`);
        }
        Print.separator();
    }

    // Método para mostrar resultados de minificación
    static minificationResult(filename, originalSize, minifiedSize, savingsPercent) {
        const originalKB = (originalSize / 1024).toFixed(1);
        const minifiedKB = (minifiedSize / 1024).toFixed(1);

        console.log(chalk.green(`  ✅ ${filename}`));
        console.log(chalk.gray(`     ${originalKB}KB → ${minifiedKB}KB (${savingsPercent}% saved)`));
    }

    // Método para mostrar progreso de build
    static buildProgress(message) {
        console.log(chalk.cyan(`🔄 ${message}`));
    }

    // Método para mostrar estadísticas de servidor
    static serverStats(mode, port, directory) {
        Print.newLine();
        console.log(chalk.magenta(`🌐 Server Configuration:`));
        console.log(chalk.gray(`   Mode: ${mode}`));
        console.log(chalk.gray(`   Port: ${port}`));
        console.log(chalk.gray(`   Serving: /${directory}`));
        Print.newLine();
    }

    // Método para mostrar que el servidor está listo con URL destacada
    static serverReady(port) {
        Print.newLine();
        console.log(chalk.bgGreen.black.bold(' ✓ SERVER READY '));
        Print.newLine();
        console.log(chalk.cyan.bold(`  → Local:   http://localhost:${port}`));
        console.log(chalk.gray(`  → Network: http://127.0.0.1:${port}`));
        Print.newLine();
        console.log(chalk.yellow(`  Press Ctrl+C to stop the server`));
        Print.newLine();
    }

    // Método para mostrar el estado del servidor durante inicio
    static serverStatus(status, message = '') {
        const icons = {
            checking: '🔍',
            starting: '🚀',
            ready: '✅',
            error: '❌'
        };
        const colors = {
            checking: chalk.cyan,
            starting: chalk.magenta,
            ready: chalk.green,
            error: chalk.red
        };

        const icon = icons[status] || 'ℹ️';
        const color = colors[status] || chalk.white;
        const displayMessage = message || status;

        console.log(color(`${icon} ${displayMessage}`));
    }

    // Método para mostrar que se está verificando el puerto
    static checkingPort(port) {
        console.log(chalk.cyan(`🔍 Checking port ${port}...`));
    }

    // Nuevo: Método para debug
    static debug(message) {
        console.log(chalk.gray(`🐛 DEBUG: ${message}`));
    }

    // Nuevo: Método para logs verbosos
    static verbose(message) {
        console.log(chalk.gray(`📝 ${message}`));
    }
}