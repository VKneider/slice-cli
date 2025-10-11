import fs from 'fs-extra';
import path from 'path';
import Validations from '../Validations.js';
import Print from '../Print.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function deleteComponent(componentName, category) {
    // Validación: Nombre de componente requerido
    if (!componentName) {
        Print.error('Component name is required to delete');
        Print.commandExample("Delete a component", "slice component delete");
        return false;
    }

    // Validación: Nombre de componente válido
    if (!Validations.isValidComponentName(componentName)) {
        Print.error(`Invalid component name: '${componentName}'`);
        Print.info('Component name must start with a letter and contain only alphanumeric characters');
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
    
    const categoryPath = Validations.getCategoryPath(category);

    // Construir la ruta del directorio del componente
    let componentDir = path.join(__dirname, '../../../../src/', categoryPath, componentName);
    componentDir = componentDir.slice(1);

    // Verificar si el directorio del componente existe
    if (!fs.existsSync(componentDir)) {
        Print.error(`Component '${componentName}' does not exist in category '${category}'`);
        Print.info('Make sure you selected the correct category');
        Print.commandExample("List components", "slice component list");
        return false;
    }

    // Verificar si es un directorio
    try {
        const stats = fs.statSync(componentDir);
        if (!stats.isDirectory()) {
            Print.error(`'${componentName}' is not a valid component directory`);
            Print.info('Components must be stored in directories');
            return false;
        }
    } catch (error) {
        Print.error(`Failed to access component directory: '${componentDir}'`);
        Print.info(`Error details: ${error.message}`);
        return false;
    }

    // Intentar eliminar el directorio del componente y su contenido
    try {
        const files = fs.readdirSync(componentDir);
        Print.info(`Deleting ${files.length} file(s) from component directory...`);
        
        fs.removeSync(componentDir);
        return true;
    } catch (error) {
        Print.error(`Failed to delete component '${componentName}'`);
        Print.info(`Error details: ${error.message}`);
        Print.warning('You may need to delete the component files manually');
        Print.info(`Component location: ${componentDir}`);
        return false;
    }
}

export default deleteComponent;
