import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Table from 'cli-table3';
import chalk from 'chalk';
import Print from '../Print.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Carga la configuración desde sliceConfig.json
 * @returns {object} - Objeto de configuración
 */
const loadConfig = () => {
    try {
        const configPath = path.join(__dirname, '../../../../src/sliceConfig.json');
        if (!fs.existsSync(configPath)) {
            Print.error('sliceConfig.json not found');
            Print.info('Run "slice init" to initialize your project');
            return null;
        }
        const rawData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        Print.error(`Failed to load configuration: ${error.message}`);
        Print.info('Check that sliceConfig.json is valid JSON');
        return null;
    }
};

/**
 * Lista los archivos en una carpeta dada, filtrando solo los archivos .js
 * @param {string} folderPath - Ruta de la carpeta a leer
 * @returns {string[]} - Lista de archivos encontrados
 */
const listComponents = (folderPath) => {
    try {
        if (!fs.existsSync(folderPath)) {
            return [];
        }
        const result = fs.readdirSync(folderPath);
        return result;
    } catch (error) {
        Print.error(`Failed to read directory ${folderPath}: ${error.message}`);
        return [];
    }
};

/**
 * Cuenta archivos en un directorio de componente
 */
const countComponentFiles = (componentPath) => {
    try {
        if (!fs.existsSync(componentPath)) return 0;
        const files = fs.readdirSync(componentPath);
        return files.filter(f => fs.statSync(path.join(componentPath, f)).isFile()).length;
    } catch {
        return 0;
    }
};

/**
 * Obtiene los componentes dinámicamente desde sliceConfig.json
 * @returns {object} - Mapeo de componentes con su categoría
 */
const getComponents = () => {
    const config = loadConfig();
    if (!config) return {};

    const folderSuffix = 'src'; // Siempre usar 'src' para desarrollo
    const componentPaths = config.paths?.components || {};
    let allComponents = new Map();

    Object.entries(componentPaths).forEach(([category, { path: folderPath }]) => {
        const fullPath = path.join(__dirname, `../../../../${folderSuffix}`, folderPath);
        const files = listComponents(fullPath);

        files.forEach(file => {
            const componentPath = path.join(fullPath, file);
            if (fs.statSync(componentPath).isDirectory()) {
                const fileCount = countComponentFiles(componentPath);
                allComponents.set(file, { category, files: fileCount });
            }
        });
    });

    return Object.fromEntries(allComponents);
};

function listComponentsReal() {
    try {
        // Obtener componentes dinámicamente
        const components = getComponents();

        if (Object.keys(components).length === 0) {
            Print.warning('No components found in your project');
            Print.info('Create your first component with "slice component create"');
            return;
        }

        // Crear tabla con cli-table3
        const table = new Table({
            head: [
                chalk.cyan.bold('Component'),
                chalk.cyan.bold('Category'),
                chalk.cyan.bold('Files')
            ],
            colWidths: [30, 20, 10],
            style: {
                head: [],
                border: ['gray']
            }
        });

        // Agrupar por categoría para mejor visualización
        const byCategory = {};
        Object.entries(components).forEach(([name, data]) => {
            if (!byCategory[data.category]) {
                byCategory[data.category] = [];
            }
            byCategory[data.category].push({ name, files: data.files });
        });

        // Agregar filas a la tabla
        Object.entries(byCategory).forEach(([category, comps]) => {
            comps.forEach((comp, index) => {
                if (index === 0) {
                    // Primera fila de la categoría
                    table.push([
                        chalk.bold(comp.name),
                        chalk.yellow(category),
                        comp.files.toString()
                    ]);
                } else {
                    // Resto de componentes en la categoría
                    table.push([
                        chalk.bold(comp.name),
                        chalk.gray('″'),  // Ditto mark
                        comp.files.toString()
                    ]);
                }
            });
        });

        Print.newLine();
        Print.title('📦 Local Components');
        Print.newLine();
        console.log(table.toString());
        Print.newLine();
        Print.info(`Total: ${Object.keys(components).length} component${Object.keys(components).length !== 1 ? 's' : ''} found`);

        // Ruta donde se generará components.js
        const outputPath = path.join(__dirname, '../../../../src/Components/components.js');

        // Asegurar que el directorio existe
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        // Generar archivo components.js con los componentes detectados
        const componentsForExport = Object.fromEntries(
            Object.entries(components).map(([name, data]) => [name, data.category])
        );
        fs.writeFileSync(outputPath, `const components = ${JSON.stringify(componentsForExport, null, 2)};\n\nexport default components;\n`);

    } catch (error) {
        Print.error(`Failed to list components: ${error.message}`);
        Print.info('Make sure your project structure is correct');
    }
}

export default listComponentsReal;
