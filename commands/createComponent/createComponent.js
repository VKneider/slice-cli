
import componentTemplate from './componentTemplate.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

function createComponent(componentName, category, properties) {

    if (!componentName) {
        console.error('Component name is required');
        return;
    }

    if (!isValidComponentName(componentName)) {
        console.error('Invalid component name. Please use only alphanumeric characters and start with a letter.');
        return;
    }

    const categoryVariations = {
        'Service': ['service', 'servicio', 'serv'],
        'Visual': ['visual', 'vis'],
        'Provider': ['provider', 'proveedor', 'prov'],
        'Structural': ['structural', 'estructural', 'est']
    };



    // Verificar si la categoría es válida
    let categoryIsValid = false;
    Object.keys(categoryVariations).forEach(validCategory => {
        if (categoryVariations[validCategory].includes(category.toLowerCase())) {
            category = validCategory
            categoryIsValid = true;
        }
    });

    if (!categoryIsValid) {
        console.error('Invalid category. Please use one of the following categories: Service, Visual, Provider, Structural');
        return;
    }

    // Crear el nombre de la clase y del archivo
    const className = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    const fileName = `${className}.js`;
    const template = componentTemplate(className, properties);



    // Determinar la ruta del archivo

    const componentDir = path.join(__dirname, '../../../../Slice/Components', category, className);

    // Asegurarse de que el directorio del componente exista
    fs.ensureDirSync(componentDir);

    // Determinar la ruta del archivo
    const componentPath = path.join(componentDir, fileName);

    console.log(componentPath);

    // Verificar si el archivo ya existe
    if (fs.existsSync(componentPath)) {
        console.error(`Component '${componentName}' already exists.`);
        return;
    }

    // Escribir el código del componente en el archivo
    fs.writeFileSync(componentPath, template);
    fs.writeFileSync(`${componentDir}/${className}.css`, '');
    fs.writeFileSync(`${componentDir}/${className}.html`, '');

    console.log(`Component '${componentName}' created successfully.`);
}

function isValidComponentName(componentName) {
    // Expresión regular para verificar si el nombre contiene caracteres especiales
    const regex = /^[a-zA-Z][a-zA-Z0-9]*$/;
    return regex.test(componentName);
}

export default createComponent;

