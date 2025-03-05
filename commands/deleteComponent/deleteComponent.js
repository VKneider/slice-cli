import fs from 'fs-extra';
import path from 'path';
import Validations from '../Validations.js';
import Print from '../Print.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);

function deleteComponent(componentName, category) {
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
    
    const categoryPath = Validations.getCategoryPath(category);


    // Construir la ruta del directorio del componente
    let componentDir = path.join(__dirname, '../../../../src/', categoryPath, componentName);
    componentDir = componentDir.slice(1);

    // Verificar si el directorio del componente existe
    if (!fs.existsSync(componentDir)) {
        Print.error(`Component '${componentName}' does not exist.`);
        return;
    }

    // Eliminar el directorio del componente y su contenido
    fs.removeSync(componentDir);

    Print.success(`Component '${componentName}' deleted successfully.`);
    return true;
}

export default deleteComponent;
