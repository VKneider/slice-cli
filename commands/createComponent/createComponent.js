
import componentTemplate from './componentTemplate.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Validations from '../Validations.js';
import Print from '../Print.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function createComponent(componentName, category, properties) {

    if (!componentName) {
        Print.error('Component name is required');
        return;
    }

    if (!Validations.isValidComponentName(componentName)) {
        Print.error('Invalid component name. Please use only alphanumeric characters and start with a letter.');
        return;
    }

    let flagCategory = Validations.isValidCategory(category);


    if (!flagCategory.isValid) {
        Print.error('Invalid category. Please use one of the following categories: Service, Visual, Provider, Structural');
        return;
    }
    category = flagCategory.category;

    // Crear el nombre de la clase y del archivo
    const className = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    const fileName = `${className}.js`;
    const template = componentTemplate(className, properties);

    // Determinar la ruta del archivo
    let componentDir = path.join(__dirname, '../../../../Slice/Components', category, className);
    componentDir=componentDir.slice(1);
    // Asegurarse de que el directorio del componente exista
    fs.ensureDirSync(componentDir);
    
    // Determinar la ruta del archivo
    let componentPath = path.join(componentDir, fileName);
    
    

    // Verificar si el archivo ya existe
    if (fs.existsSync(componentPath)) {
        Print.error(`Component '${componentName}' already exists.`);
        return;
    }

    // Escribir el código del componente en el archivo
    fs.writeFileSync(componentPath, template);
    fs.writeFileSync(`${componentDir}/${className}.css`, '');
    fs.writeFileSync(`${componentDir}/${className}.html`, '');

    Print.success(`Component '${componentName}' created successfully.`);
    return true;
}


export default createComponent;

