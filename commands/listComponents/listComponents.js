import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
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
            Print.warning(`Component directory not found: ${folderPath}`);
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
 * Obtiene los componentes dinámicamente desde sliceConfig.json
 * @returns {object} - Mapeo de componentes con su categoría
 */
const getComponents = () => {
    const config = loadConfig();
    if (!config) return {};

       //const isProduction = config.production.enabled===true;
    const folderSuffix = 'src'; // Siempre usar 'src' para desarrollo

    const componentPaths = config.paths?.components || {}; // Obtiene dinámicamente las rutas de los componentes
    let allComponents = new Map();

    Object.entries(componentPaths).forEach(([category, { path: folderPath }]) => {
        const fullPath = path.join(__dirname, `../../../../${folderSuffix}`, folderPath);
        const files = listComponents(fullPath);


        files.forEach(file => {
            const componentName = path.basename(file, '.js');
            allComponents.set(componentName, category);
        });
    });



    return Object.fromEntries(allComponents);
};

function listComponentsReal(){
    try {
        // Obtener componentes dinámicamente
        const components = getComponents();

        if (Object.keys(components).length === 0) {
            Print.warning('No components found in your project');
            Print.info('Create your first component with "slice component create"');
            return;
        }

        // Ruta donde se generará components.js
        const outputPath = path.join(__dirname, '../../../../src/Components/components.js');
        
        // Asegurar que el directorio existe
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            Print.info('Created Components directory');
        }

        // Generar archivo components.js con los componentes detectados
        fs.writeFileSync(outputPath, `const components = ${JSON.stringify(components, null, 2)};\n\nexport default components;\n`);

        Print.success(`Component list updated successfully (${Object.keys(components).length} component${Object.keys(components).length !== 1 ? 's' : ''} found)`);
    } catch (error) {
        Print.error(`Failed to update component list: ${error.message}`);
        Print.info('Make sure your project structure is correct');
    }
}

export default listComponentsReal;


