export default class Print {
    constructor() {}

    static error(message) {
        console.error('\x1b[31m', `❌ Error: ${message}`, '\x1b[0m');
    }
    
    static success(message) {
        console.log('\x1b[32m', `✅ Success: ${message}`, '\x1b[0m');
    }

    static warning(message) {
        console.log('\x1b[33m', `⚠️  Warning: ${message}`, '\x1b[0m');
    }

    static info(message) {
        console.log('\x1b[36m', `ℹ️  Info: ${message}`, '\x1b[0m');
    }

    static title(message) {
        console.log('\x1b[35m\x1b[1m', `🎯 ${message}`, '\x1b[0m');
    }

    static subtitle(message) {
        console.log('\x1b[34m', `📋 ${message}`, '\x1b[0m');
    }

    static step(stepNumber, message) {
        console.log('\x1b[36m', `${stepNumber}. ${message}`, '\x1b[0m');
    }

    static highlight(message) {
        console.log('\x1b[43m\x1b[30m', ` ${message} `, '\x1b[0m');
    }

    static newLine() {
        console.log('');
    }

    static separator() {
        console.log('\x1b[90m', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', '\x1b[0m');
    }

    // Métodos para el contexto específico del CLI
    static componentSuccess(componentName, action = 'processed') {
        console.log('\x1b[32m', `✅ ${componentName} ${action} successfully!`, '\x1b[0m');
    }

    static componentError(componentName, action = 'processing', error) {
        console.error('\x1b[31m', `❌ Error ${action} ${componentName}: ${error}`, '\x1b[0m');
    }

    static downloadProgress(fileName) {
        console.log('\x1b[36m', `  📥 Downloading ${fileName}...`, '\x1b[0m');
    }

    static downloadSuccess(fileName) {
        console.log('\x1b[32m', `  ✅ ${fileName}`, '\x1b[0m');
    }

    static downloadError(fileName, error) {
        console.error('\x1b[31m', `  ❌ Error downloading ${fileName}: ${error}`, '\x1b[0m');
    }

    static registryUpdate(message) {
        console.log('\x1b[35m', `📝 Registry: ${message}`, '\x1b[0m');
    }

    static versionInfo(component, currentVersion, latestVersion = null) {
        if (latestVersion && currentVersion !== latestVersion) {
            console.log('\x1b[33m', `🔄 ${component}: v${currentVersion} → v${latestVersion}`, '\x1b[0m');
        } else {
            console.log('\x1b[32m', `✅ ${component}: v${currentVersion}`, '\x1b[0m');
        }
    }

    static commandExample(description, command) {
        console.log('\x1b[90m', `💡 ${description}:`, '\x1b[0m');
        console.log('\x1b[37m', `   ${command}`, '\x1b[0m');
    }

    static summary(successful, failed, total) {
        Print.separator();
        console.log('\x1b[1m', '📊 Summary:', '\x1b[0m');
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
        
        console.log('\x1b[32m', `  ✅ ${filename}`, '\x1b[0m');
        console.log('\x1b[90m', `     ${originalKB}KB → ${minifiedKB}KB (${savingsPercent}% saved)`, '\x1b[0m');
    }

    // Método para mostrar progreso de build
    static buildProgress(message) {
        console.log('\x1b[36m', `🔄 ${message}`, '\x1b[0m');
    }

    // Método para mostrar estadísticas de servidor
    static serverStats(mode, port, directory) {
        Print.newLine();
        console.log('\x1b[35m', `🌐 Server Configuration:`, '\x1b[0m');
        console.log('\x1b[90m', `   Mode: ${mode}`, '\x1b[0m');
        console.log('\x1b[90m', `   Port: ${port}`, '\x1b[0m');
        console.log('\x1b[90m', `   Serving: /${directory}`, '\x1b[0m');
        Print.newLine();
    }
}