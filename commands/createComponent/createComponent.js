
import componentTemplates from './VisualComponentTemplate.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Validations from '../Validations.js';
import Print from '../Print.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function createComponent(componentName, category) {
    // Validación: Nombre de componente requerido
    if (!componentName) {
        Print.error('Component name is required');
        Print.commandExample("Create a component", "slice component create");
        return false;
    }

    // Validación: Nombre de componente válido
    if (!Validations.isValidComponentName(componentName)) {
        Print.error(`Invalid component name: '${componentName}'`);
        Print.info('Component name must start with a letter and contain only alphanumeric characters');
        Print.commandExample("Valid names", "Button, UserCard, NavBar");
        Print.commandExample("Invalid names", "1Button, user-card, Nav_Bar");
        return false;
    }

    // Validación: Componente ya existe
    if(Validations.componentExists(componentName)){
        Print.error(`Component '${componentName}' already exists in your project`);
        Print.info('Please use a different name or delete the existing component first');
        Print.commandExample("Delete component", "slice component delete");
        return false;
    }

    // Validación: Categoría válida
    let flagCategory = Validations.isValidCategory(category);

    if (!flagCategory.isValid) {
        Print.error(`Invalid category: '${category}'`);
        const availableCategories = Object.keys(Validations.getCategories()).join(', ');
        Print.info(`Available categories: ${availableCategories}`);
        return false;
    }
    category = flagCategory.category;

    // Crear el nombre de la clase y del archivo
    const className = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    const fileName = `${className}.js`;
    let template;

    const type = Validations.getCategoryType(category);

    // Generar template según el tipo
    if(type === 'Visual'){
       template = componentTemplates.visual(className);
    } else if(type === 'Service'){
         template = componentTemplates.service(className);
    } else {
        Print.error(`Unsupported component type: '${type}'`);
        Print.info('Only Visual and Service components are currently supported');
        return false;
    }

    const categoryPath = Validations.getCategoryPath(category);

    // Determinar la ruta del directorio del componente
    let componentDir = path.join(__dirname, '../../../../src/', categoryPath, className);
    componentDir = componentDir.slice(1);
    
    try {
        // Crear directorio del componente
        fs.ensureDirSync(componentDir);
    } catch (error) {
        Print.error(`Failed to create component directory: '${componentDir}'`);
        Print.info(`Error details: ${error.message}`);
        return false;
    }

    // Determinar la ruta del archivo
    let componentPath = path.join(componentDir, fileName);

    // Verificar si el archivo ya existe (doble verificación)
    if (fs.existsSync(componentPath)) {
        Print.error(`Component file already exists at: '${componentPath}'`);
        Print.info('This component may have been created outside the CLI');
        return false;
    }

    try {
        // Escribir el código del componente en el archivo
        fs.writeFileSync(componentPath, template);

        // Si es Visual, crear archivos adicionales (CSS y HTML)
        if(type === 'Visual'){
            const cssPath = `${componentDir}/${className}.css`;
            const htmlPath = `${componentDir}/${className}.html`;
            
            fs.writeFileSync(cssPath, '/* Styles for ' + componentName + ' component */\n');
            fs.writeFileSync(htmlPath, `<div class="${componentName.toLowerCase()}">\n  ${componentName}\n</div>`);
            
            Print.info(`Created files: ${fileName}, ${className}.css, ${className}.html`);
        } else {
            Print.info(`Created file: ${fileName}`);
        }

        return true;
    } catch (error) {
        Print.error(`Failed to create component files`);
        Print.info(`Error details: ${error.message}`);
        
        // Intentar limpiar archivos parcialmente creados
        try {
            if (fs.existsSync(componentDir)) {
                fs.removeSync(componentDir);
                Print.info('Cleaned up partial files');
            }
        } catch (cleanupError) {
            Print.warning('Could not clean up partial files. You may need to delete them manually');
        }
        
        return false;
    }
}


export default createComponent;

