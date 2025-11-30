import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'net';
import chalk from 'chalk';
import Table from 'cli-table3';
import Print from '../Print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Verifica la versión de Node.js
 */
async function checkNodeVersion() {
    const currentVersion = process.version;
    const majorVersion = parseInt(currentVersion.slice(1).split('.')[0]);
    const required = 20;

    if (majorVersion >= required) {
        return {
            pass: true,
            message: `Node.js version: ${currentVersion} (required: >= v${required})`
        };
    } else {
        return {
            pass: false,
            message: `Node.js version: ${currentVersion} (required: >= v${required})`,
            suggestion: `Update Node.js to v${required} or higher`
        };
    }
}

/**
 * Verifica la estructura de directorios
 */
async function checkDirectoryStructure() {
    const projectRoot = path.join(__dirname, '../../../../');
    const srcPath = path.join(projectRoot, 'src');
    const apiPath = path.join(projectRoot, 'api');

    const srcExists = await fs.pathExists(srcPath);
    const apiExists = await fs.pathExists(apiPath);

    if (srcExists && apiExists) {
        return {
            pass: true,
            message: 'Project structure (src/ and api/) exists'
        };
    } else {
        const missing = [];
        if (!srcExists) missing.push('src/');
        if (!apiExists) missing.push('api/');

        return {
            pass: false,
            message: `Missing directories: ${missing.join(', ')}`,
            suggestion: 'Run "slice init" to initialize your project'
        };
    }
}

/**
 * Verifica sliceConfig.json
 */
async function checkConfig() {
    const configPath = path.join(__dirname, '../../../../src/sliceConfig.json');

    if (!await fs.pathExists(configPath)) {
        return {
            pass: false,
            message: 'sliceConfig.json not found',
            suggestion: 'Run "slice init" to create configuration'
        };
    }

    try {
        const config = await fs.readJson(configPath);

        if (!config.paths || !config.paths.components) {
            return {
                pass: false,
                message: 'sliceConfig.json is invalid (missing paths.components)',
                suggestion: 'Check your configuration file'
            };
        }

        return {
            pass: true,
            message: 'sliceConfig.json is valid'
        };
    } catch (error) {
        return {
            pass: false,
            message: `sliceConfig.json is invalid JSON: ${error.message}`,
            suggestion: 'Fix JSON syntax errors in sliceConfig.json'
        };
    }
}

/**
 * Verifica disponibilidad del puerto
 */
async function checkPort() {
    const configPath = path.join(__dirname, '../../../../src/sliceConfig.json');
    let port = 3000;

    try {
        if (await fs.pathExists(configPath)) {
            const config = await fs.readJson(configPath);
            port = config.server?.port || 3000;
        }
    } catch { }

    return new Promise((resolve) => {
        const server = createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve({
                    warn: true,
                    message: `Port ${port} is already in use`,
                    suggestion: `Stop the process using port ${port} or use: slice dev -p <other-port>`
                });
            } else {
                resolve({
                    pass: true,
                    message: `Port ${port} is available`
                });
            }
        });

        server.once('listening', () => {
            server.close();
            resolve({
                pass: true,
                message: `Port ${port} is available`
            });
        });

        server.listen(port);
    });
}

/**
 * Verifica dependencias en package.json
 */
async function checkDependencies() {
    const packagePath = path.join(__dirname, '../../../../package.json');

    if (!await fs.pathExists(packagePath)) {
        return {
            warn: true,
            message: 'package.json not found',
            suggestion: 'Run "npm init" to create package.json'
        };
    }

    try {
        const pkg = await fs.readJson(packagePath);
        const hasCli = pkg.dependencies?.['slicejs-cli'] || pkg.devDependencies?.['slicejs-cli'];
        const hasFramework = pkg.dependencies?.['slicejs-web-framework'];

        if (hasCli && hasFramework) {
            return {
                pass: true,
                message: 'All required dependencies are installed'
            };
        } else {
            const missing = [];
            if (!hasCli) missing.push('slicejs-cli');
            if (!hasFramework) missing.push('slicejs-web-framework');

            return {
                warn: true,
                message: `Missing dependencies: ${missing.join(', ')}`,
                suggestion: 'Run "npm install"'
            };
        }
    } catch (error) {
        return {
            pass: false,
            message: `package.json is invalid: ${error.message}`,
            suggestion: 'Fix JSON syntax errors in package.json'
        };
    }
}

/**
 * Verifica integridad de componentes
 */
async function checkComponents() {
    const configPath = path.join(__dirname, '../../../../src/sliceConfig.json');
    const projectRoot = path.join(__dirname, '../../../../');

    if (!await fs.pathExists(configPath)) {
        return {
            warn: true,
            message: 'Cannot check components (no config)',
            suggestion: 'Run "slice init" first'
        };
    }

    try {
        const config = await fs.readJson(configPath);
        const componentPaths = config.paths?.components || {};

        let totalComponents = 0;
        let componentIssues = 0;

        for (const [category, { path: compPath }] of Object.entries(componentPaths)) {
            const fullPath = path.join(projectRoot, 'src', compPath);

            if (await fs.pathExists(fullPath)) {
                const items = await fs.readdir(fullPath);

                for (const item of items) {
                    const itemPath = path.join(fullPath, item);
                    const stat = await fs.stat(itemPath);

                    if (stat.isDirectory()) {
                        totalComponents++;

                        // Verificar archivos JS
                        const jsFile = path.join(itemPath, `${item}.js`);
                        if (!await fs.pathExists(jsFile)) {
                            componentIssues++;
                        }
                    }
                }
            }
        }

        if (componentIssues === 0) {
            return {
                pass: true,
                message: `${totalComponents} components checked, all OK`
            };
        } else {
            return {
                warn: true,
                message: `${componentIssues} component(s) have missing files`,
                suggestion: 'Check your component directories'
            };
        }
    } catch (error) {
        return {
            warn: true,
            message: `Cannot check components: ${error.message}`,
            suggestion: 'Verify your project structure'
        };
    }
}

/**
 * Comando principal de diagnóstico
 */
export default async function runDiagnostics() {
    Print.newLine();
    Print.title('🔍 Running Slice.js Diagnostics...');
    Print.newLine();

    const checks = [
        { name: 'Node.js Version', fn: checkNodeVersion },
        { name: 'Project Structure', fn: checkDirectoryStructure },
        { name: 'Configuration', fn: checkConfig },
        { name: 'Port Availability', fn: checkPort },
        { name: 'Dependencies', fn: checkDependencies },
        { name: 'Components', fn: checkComponents }
    ];

    const results = [];

    for (const check of checks) {
        const result = await check.fn();
        results.push({ ...result, name: check.name });
    }

    // Crear tabla de resultados
    const table = new Table({
        head: [chalk.cyan.bold('Check'), chalk.cyan.bold('Status'), chalk.cyan.bold('Details')],
        colWidths: [25, 10, 55],
        style: {
            head: [],
            border: ['gray']
        },
        wordWrap: true
    });

    results.forEach(result => {
        let status;
        if (result.pass) {
            status = chalk.green('✅ PASS');
        } else if (result.warn) {
            status = chalk.yellow('⚠️  WARN');
        } else {
            status = chalk.red('❌ FAIL');
        }

        const details = result.suggestion
            ? `${result.message}\n${chalk.gray('→ ' + result.suggestion)}`
            : result.message;

        table.push([result.name, status, details]);
    });

    console.log(table.toString());

    // Resumen
    const issues = results.filter(r => !r.pass && !r.warn).length;
    const warnings = results.filter(r => r.warn).length;
    const passed = results.filter(r => r.pass).length;

    Print.newLine();
    Print.separator();

    if (issues === 0 && warnings === 0) {
        Print.success('All checks passed! 🎉');
        Print.info('Your Slice.js project is correctly configured');
    } else {
        console.log(chalk.bold('📊 Summary:'));
        console.log(chalk.green(`  ✅ Passed: ${passed}`));
        if (warnings > 0) console.log(chalk.yellow(`  ⚠️  Warnings: ${warnings}`));
        if (issues > 0) console.log(chalk.red(`  ❌ Issues: ${issues}`));

        Print.newLine();

        if (issues > 0) {
            Print.warning('Fix the issues above to ensure proper functionality');
        } else {
            Print.info('Warnings are non-critical but should be addressed');
        }
    }

    Print.separator();
}
