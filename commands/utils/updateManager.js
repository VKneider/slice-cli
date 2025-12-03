// commands/utils/updateManager.js

import { exec } from "child_process";
import { promisify } from "util";
import inquirer from "inquirer";
import ora from "ora";
import Print from "../Print.js";
import versionChecker from "./VersionChecker.js";
import { getProjectRoot } from "../utils/PathHelper.js";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

class UpdateManager {
    constructor() {
        this.packagesToUpdate = [];
    }

    async detectCliInstall() {
        try {
            const moduleDir = path.dirname(fileURLToPath(import.meta.url));
            const cliRoot = path.join(moduleDir, '../../');
            const projectRoot = getProjectRoot(import.meta.url);
            let globalPrefix = '';
            try {
                const { stdout } = await execAsync('npm config get prefix');
                globalPrefix = stdout.toString().trim();
            } catch {}
            const localNodeModules = path.join(projectRoot, 'node_modules');
            const globalNodeModules = globalPrefix ? path.join(globalPrefix, 'node_modules') : '';

            if (cliRoot.startsWith(localNodeModules)) {
                return { type: 'local', cliRoot, projectRoot, globalPrefix };
            }
            if (globalNodeModules && cliRoot.startsWith(globalNodeModules)) {
                return { type: 'global', cliRoot, projectRoot, globalPrefix };
            }
            return { type: 'unknown', cliRoot, projectRoot, globalPrefix };
        } catch (error) {
            return { type: 'unknown' };
        }
    }

    /**
     * Check for available updates and return structured info
     */
    async checkForUpdates() {
        try {
            const updateInfo = await versionChecker.checkForUpdates(true); // Silent mode

            if (!updateInfo) {
                return null;
            }

            const updates = [];

            if (updateInfo.cli.status === 'outdated') {
                updates.push({
                    name: 'slicejs-cli',
                    displayName: 'Slice.js CLI',
                    current: updateInfo.cli.current,
                    latest: updateInfo.cli.latest,
                    type: 'cli'
                });
            }

            if (updateInfo.framework.status === 'outdated') {
                updates.push({
                    name: 'slicejs-web-framework',
                    displayName: 'Slice.js Framework',
                    current: updateInfo.framework.current,
                    latest: updateInfo.framework.latest,
                    type: 'framework'
                });
            }

            return {
                hasUpdates: updates.length > 0,
                updates,
                allCurrent: updateInfo.cli.status === 'current' && updateInfo.framework.status === 'current'
            };
        } catch (error) {
            Print.error(`Checking for updates: ${error.message}`);
            return null;
        }
    }

    /**
     * Display available updates in a formatted way
     */
    displayUpdates(updateInfo) {
        if (!updateInfo || !updateInfo.hasUpdates) {
            return;
        }

        console.log('');
        Print.warning('📦 Actualizaciones Disponibles:');
        console.log('');

        updateInfo.updates.forEach(pkg => {
            console.log(`   ${pkg.type === 'cli' ? '🔧' : '⚡'} ${pkg.displayName}`);
            console.log(`      ${pkg.current} → ${pkg.latest}`);
        });

        console.log('');
        console.log('   📚 Changelog: https://github.com/VKneider/slice.js/releases');
        console.log('');
    }

    /**
     * Prompt user to select which packages to update
     */
    async promptForUpdates(updateInfo, options = {}) {
        if (!updateInfo || !updateInfo.hasUpdates) {
            return [];
        }

        // If --yes flag is set, return all updates
        if (options.yes) {
            return updateInfo.updates.map(pkg => pkg.name);
        }

        // If specific package flags are set
        if (options.cli || options.framework) {
            const selected = [];
            if (options.cli) {
                const cliUpdate = updateInfo.updates.find(pkg => pkg.type === 'cli');
                if (cliUpdate) selected.push(cliUpdate.name);
            }
            if (options.framework) {
                const frameworkUpdate = updateInfo.updates.find(pkg => pkg.type === 'framework');
                if (frameworkUpdate) selected.push(frameworkUpdate.name);
            }
            return selected;
        }

        // Interactive selection
        const choices = updateInfo.updates.map(pkg => ({
            name: `${pkg.displayName} (${pkg.current} → ${pkg.latest})`,
            value: pkg.name,
            checked: true
        }));

        const answers = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'packages',
                message: '¿Qué paquetes deseas actualizar?',
                choices,
                validate: (answer) => {
                    if (answer.length === 0) {
                        return 'Debes seleccionar al menos un paquete';
                    }
                    return true;
                }
            }
        ]);

        return answers.packages;
    }

    async buildUpdatePlan(packages) {
        const plan = [];
        const info = await this.detectCliInstall();
        for (const pkg of packages) {
            if (pkg === 'slicejs-cli') {
                if (info.type === 'global') {
                    plan.push({ package: pkg, target: 'global', command: 'npm install -g slicejs-cli@latest' });
                } else {
                    plan.push({ package: pkg, target: 'project', command: 'npm install slicejs-cli@latest' });
                }
            } else if (pkg === 'slicejs-web-framework') {
                plan.push({ package: pkg, target: 'project', command: 'npm install slicejs-web-framework@latest' });
            } else {
                plan.push({ package: pkg, target: 'project', command: `npm install ${pkg}@latest` });
            }
        }
        return plan;
    }

    /**
     * Execute npm update command for a specific package
     */
    async updatePackage(packageName) {
        try {
            let installCmd = `npm install ${packageName}@latest`;
            let uninstallCmd = `npm uninstall ${packageName}`;
            let options = {};

            if (packageName === 'slicejs-cli') {
                const info = await this.detectCliInstall();
                if (info.type === 'global') {
                    installCmd = `npm install -g slicejs-cli@latest`;
                    uninstallCmd = `npm uninstall -g slicejs-cli`;
                } else {
                    options.cwd = info.projectRoot || getProjectRoot(import.meta.url);
                }
            } else {
                options.cwd = getProjectRoot(import.meta.url);
            }

            // Try uninstall first (ignore failure)
            try {
                await execAsync(uninstallCmd, options);
            } catch {}

            const { stdout, stderr } = await execAsync(installCmd, options);

            return {
                success: true,
                packageName,
                stdout,
                stderr
            };
        } catch (error) {
            return {
                success: false,
                packageName,
                error: error.message
            };
        }
    }

    /**
     * Update multiple packages with progress indication
     */
    async installUpdates(packages) {
        const results = [];

        for (const packageName of packages) {
            const spinner = ora(`Actualizando ${packageName}...`).start();

            try {
                const result = await this.updatePackage(packageName);

                if (result.success) {
                    spinner.succeed(`${packageName} actualizado exitosamente`);
                    results.push({ packageName, success: true });
                } else {
                    spinner.fail(`Error actualizando ${packageName}`);
                    Print.error(`Detalles: ${result.error}`);
                    results.push({ packageName, success: false, error: result.error });
                }
            } catch (error) {
                spinner.fail(`Error actualizando ${packageName}`);
                Print.error(`Detalles: ${error.message}`);
                results.push({ packageName, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Main method to check and prompt for updates
     */
    async checkAndPromptUpdates(options = {}) {
        const spinner = ora('Verificando actualizaciones...').start();

        try {
            const updateInfo = await this.checkForUpdates();
            spinner.stop();

            if (!updateInfo) {
                Print.error('No se pudo verificar actualizaciones. Verifica tu conexión a internet.');
                return false;
            }

            if (updateInfo.allCurrent) {
                Print.success('✅ Todos los componentes están actualizados!');
                return true;
            }

            if (!updateInfo.hasUpdates) {
                Print.success('✅ Todos los componentes están actualizados!');
                return true;
            }

            // Display available updates
            this.displayUpdates(updateInfo);

        // Get packages to update
        const packagesToUpdate = await this.promptForUpdates(updateInfo, options);

            if (!packagesToUpdate || packagesToUpdate.length === 0) {
                Print.info('No se seleccionaron paquetes para actualizar.');
                return false;
            }

        // Show plan and confirm installation if not auto-confirmed
        let plan = await this.buildUpdatePlan(packagesToUpdate);
        console.log('');
        Print.info('🧭 Plan de actualización:');
        plan.forEach(item => {
            const where = item.target === 'global' ? 'GLOBAL' : 'PROYECTO';
            console.log(`   • ${item.package} → ${where}`);
            console.log(`     ${item.command}`);
        });
        console.log('');

        const cliInfo = await this.detectCliInstall();
        if (cliInfo.type === 'global' && !packagesToUpdate.includes('slicejs-cli')) {
            if (!options.yes && !options.cli) {
                const { addCli } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'addCli',
                        message: 'Se detectó CLI global. ¿Agregar la actualización global del CLI al plan?',
                        default: true
                    }
                ]);
                if (addCli) {
                    packagesToUpdate.push('slicejs-cli');
                    plan = await this.buildUpdatePlan(packagesToUpdate);
                    console.log('');
                    Print.info('🧭 Plan actualizado:');
                    plan.forEach(item => {
                        const where = item.target === 'global' ? 'GLOBAL' : 'PROYECTO';
                        console.log(`   • ${item.package} → ${where}`);
                        console.log(`     ${item.command}`);
                    });
                    console.log('');
                }
            } else {
                Print.warning('CLI global detectado. Se recomienda actualizar slicejs-cli global para mantener alineado con el framework.');
                console.log('   Sugerencia: npm install -g slicejs-cli@latest');
                console.log('');
            }
        }

        if (!options.yes && !options.cli && !options.framework) {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: '¿Deseas continuar con la actualización según el plan mostrado?',
                    default: true
                }
            ]);

                if (!confirm) {
                    Print.info('Actualización cancelada.');
                    return false;
                }
            }

            console.log(''); // Line break
            Print.info('📥 Instalando actualizaciones...');
            console.log('');

            // Install updates
            const results = await this.installUpdates(packagesToUpdate);

            // Summary
            console.log('');
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;

            if (failCount === 0) {
                Print.success(`✅ ${successCount} paquete(s) actualizado(s) exitosamente!`);
            } else {
                Print.warning(`⚠️  ${successCount} exitoso(s), ${failCount} fallido(s)`);
            }

            if (successCount > 0) {
                console.log('');
                Print.info('💡 Se recomienda reiniciar el servidor de desarrollo si está ejecutándose.');
            }

            return failCount === 0;

        } catch (error) {
            spinner.stop();
            Print.error(`Error durante la actualización: ${error.message}`);
            return false;
        }
    }
}

// Singleton instance
const updateManager = new UpdateManager();

export default updateManager;
