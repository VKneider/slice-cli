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
        const rawData = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(rawData);
    } catch (error) {
        console.error(`Error cargando configuración: ${error.message}`);
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
        const result = fs.readdirSync(folderPath)
        return result;
    } catch (error) {
        console.error(`Error leyendo carpeta ${folderPath}: ${error.message}`);
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
    // Obtener componentes dinámicamente
const components = getComponents();

// Ruta donde se generará components.js
const outputPath = path.join(__dirname, '../../../../src/Components/components.js');

// Generar archivo components.js con los componentes detectados
fs.writeFileSync(outputPath, `const components = ${JSON.stringify(components, null, 2)}; export default components;`);

Print.success('Lista de componentes actualizada dinámicamente');
}

export default listComponentsReal;


