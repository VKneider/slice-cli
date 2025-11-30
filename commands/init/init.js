import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import ora from 'ora';
import Print from '../Print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Importar la clase ComponentRegistry del getComponent
import { ComponentRegistry } from '../getComponent/getComponent.js';

export default async function initializeProject(projectType) {
    try {
        // Directorio de origen para API (mantener copia local)
        let sliceBaseDir = path.join(__dirname, '../../../slicejs-web-framework');
        let apiDir = path.join(sliceBaseDir, 'api');
        let srcDir = path.join(sliceBaseDir, 'src');
        let destinationApi = path.join(__dirname, '../../../../api');
        let destinationSrc = path.join(__dirname, '../../../../src');

        try {
            // Verificar si los directorios de destino ya existen
            if (fs.existsSync(destinationApi)) throw new Error(`El directorio "api" ya existe: ${destinationApi}`);
            if (fs.existsSync(destinationSrc)) throw new Error(`El directorio "src" ya existe: ${destinationSrc}`);
        } catch (error) {
            Print.error('Error validando directorios de destino:', error.message);
            return;
        }

        // 1. COPIAR LA CARPETA API (mantener lógica original)
        const apiSpinner = ora('Copying API structure...').start();
        try {
            if (!fs.existsSync(apiDir)) throw new Error(`No se encontró la carpeta api: ${apiDir}`);
            await fs.copy(apiDir, destinationApi, { recursive: true });
            apiSpinner.succeed('API structure created successfully');
        } catch (error) {
            apiSpinner.fail('Error copying API structure');
            Print.error(error.message);
            return;
        }

        // 2. CREAR ESTRUCTURA SRC BÁSICA (sin copiar componentes Visual)
        const srcSpinner = ora('Creating src structure...').start();
        try {
            if (!fs.existsSync(srcDir)) throw new Error(`No se encontró la carpeta src: ${srcDir}`);

            // Copiar solo los archivos base de src, excluyendo Components/Visual
            await fs.ensureDir(destinationSrc);

            // Copiar archivos y carpetas de src excepto Components/Visual
            const srcItems = await fs.readdir(srcDir);

            for (const item of srcItems) {
                const srcItemPath = path.join(srcDir, item);
                const destItemPath = path.join(destinationSrc, item);
                const stat = await fs.stat(srcItemPath);

                if (stat.isDirectory()) {
                    if (item === 'Components') {
                        // Crear estructura de Components pero sin copiar Visual
                        await fs.ensureDir(destItemPath);

                        const componentItems = await fs.readdir(srcItemPath);
                        for (const componentItem of componentItems) {
                            const componentItemPath = path.join(srcItemPath, componentItem);
                            const destComponentItemPath = path.join(destItemPath, componentItem);

                            if (componentItem !== 'Visual') {
                                // Copiar Service y otros tipos de components
                                await fs.copy(componentItemPath, destComponentItemPath, { recursive: true });
                            } else {
                                // Solo crear el directorio Visual vacío
                                await fs.ensureDir(destComponentItemPath);
                            }
                        }
                    } else {
                        // Copiar otras carpetas normalmente
                        await fs.copy(srcItemPath, destItemPath, { recursive: true });
                    }
                } else {
                    // Copiar archivos normalmente
                    await fs.copy(srcItemPath, destItemPath);
                }
            }

            srcSpinner.succeed('Source structure created successfully');
        } catch (error) {
            srcSpinner.fail('Error creating source structure');
            Print.error(error.message);
            return;
        }

        // 3. DESCARGAR TODOS LOS COMPONENTES VISUAL DESDE EL REPOSITORIO OFICIAL
        const componentsSpinner = ora('Loading component registry...').start();
        try {
            const registry = new ComponentRegistry();
            await registry.loadRegistry();

            // Obtener TODOS los componentes Visual disponibles
            const allVisualComponents = await getAllVisualComponents(registry);

            if (allVisualComponents.length > 0) {
                componentsSpinner.text = `Installing ${allVisualComponents.length} Visual components...`;

                const results = await registry.installMultipleComponents(
                    allVisualComponents,
                    'Visual',
                    true // force = true para instalación inicial
                );

                const successful = results.filter(r => r.success).length;
                const failed = results.filter(r => !r.success).length;

                if (successful > 0 && failed === 0) {
                    componentsSpinner.succeed(`All ${successful} Visual components installed successfully`);
                } else if (successful > 0) {
                    componentsSpinner.warn(`${successful} components installed, ${failed} failed`);
                    Print.info('You can install failed components later using "slice get <component-name>"');
                } else {
                    componentsSpinner.fail('Failed to install Visual components');
                }
            } else {
                componentsSpinner.warn('No Visual components found in registry');
                Print.info('You can add components later using "slice get <component-name>"');
            }

        } catch (error) {
            componentsSpinner.fail('Could not download Visual components from official repository');
            Print.error(`Repository error: ${error.message}`);
            Print.info('Project initialized without Visual components');
            Print.info('You can add them later using "slice get <component-name>"');
        }

        Print.success('Proyecto inicializado correctamente.');
        Print.newLine();
        Print.info('Next steps:');
        console.log('  slice browse          - View available components');
        console.log('  slice get Button      - Install specific components');
        console.log('  slice sync            - Update all components to latest versions');

    } catch (error) {
        Print.error('Error inesperado al inicializar el proyecto:', error.message);
    }
}

/**
 * Obtiene TODOS los componentes Visual disponibles en el registry
 * @param {ComponentRegistry} registry - Instancia del registry cargado
 * @returns {Array} - Array con todos los nombres de componentes Visual
 */
async function getAllVisualComponents(registry) {
    const availableComponents = registry.getAvailableComponents('Visual');
    const allVisualComponents = Object.keys(availableComponents);

    Print.info(`Found ${allVisualComponents.length} Visual components in official repository`);

    return allVisualComponents;
}