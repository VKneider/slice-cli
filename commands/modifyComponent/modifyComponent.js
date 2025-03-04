import fs from 'fs';
import path from 'path';
import Validations from '../Validations.js';
const __dirname = path.dirname(new URL(import.meta.url).pathname);
import Print from '../Print.js';

function modifyComponent(componentName, category, addProperties, removeProperties) {
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

    let componentDir = path.join(__dirname, '../../../../src/Components', category, componentName);
    componentDir = componentDir.slice(1);

   // let componentPath = path.join(componentDir, fileName);
    //componentPath=componentPath.slice(1);

    if (!fs.existsSync(componentPath)) {
        Print.error(`Component '${componentName}' does not exist.`);
        return;
    }


    let componentContent = fs.readFileSync(componentPath, 'utf-8');
    let existingProperties = extractProperties(componentContent);

    addProperties.forEach(property => {
        if (!existingProperties.includes(property)) {
            existingProperties.push(property);
            Print.success(`Property '${property}' added to component '${componentName}'.`);
            // Verificar si existen getters y setters para la propiedad y agregarlos si es necesario
            componentContent = addGetterSetterIfNeeded(componentContent, property);
        } else {
            Print.error(`Property '${property}' already exists in component '${componentName}'.`);
        }
    });

    removeProperties.forEach(property => {
        if (existingProperties.includes(property)) {
            existingProperties = existingProperties.filter(prop => prop !== property);
            Print.success(`Property '${property}' removed from component '${componentName}'.`);
            componentContent = removePropertyIfNeeded(componentContent, property);
        } else {
            Print.error(`Property '${property}' does not exist in component '${componentName}'.`);
        }
    });

    componentContent = updateComponentProps(componentContent, existingProperties);
    fs.writeFileSync(componentPath, componentContent);
    Print.success(`Component '${componentName}' modified successfully.`);
}


function extractProperties(componentContent) {
    const propRegex = /this\.debuggerProps\s*=\s*\[(.*?)\];/s;
    const match = componentContent.match(propRegex);
    if (match && match[1]) {
        return match[1].split(',').map(prop => prop.trim().replace(/['"]/g, ''));
    }
    return [];
}

function addGetterSetterIfNeeded(componentContent, property) {
    // Verificar si existen getters y setters para la propiedad
    const hasGetterSetter = hasGetterSetterForProperty(componentContent, property);
    if (!hasGetterSetter) {
        // Agregar getters y setters al componente
        componentContent = addGetterSetter(componentContent, property);
    }
    return componentContent;
}

function removePropertyIfNeeded(componentContent, property) {
    // Eliminar la propiedad de debuggerProps si está presente
    const propRegex = /this\.debuggerProps\s*=\s*\[(.*?)\];/s;
    const match = componentContent.match(propRegex);
    if (match && match[1]) {
        let props = match[1].split(',').map(prop => prop.trim().replace(/['"]/g, ''));
        const propIndex = props.indexOf(property);
        if (propIndex !== -1) {
            props.splice(propIndex, 1);
            componentContent = componentContent.replace(propRegex, `this.debuggerProps = [${props.map(prop => `'${prop}'`).join(', ')}];`);
        }
    }

    // Eliminar los getters y setters de la propiedad
    componentContent = removeGetterSetter(componentContent, property);

    return componentContent;
}

function hasGetterSetterForProperty(componentContent, property) {
    const getterRegex = new RegExp(`get ${property}\\(\\)\\s*{`);
    const setterRegex = new RegExp(`set ${property}\\([^)]+\\)\\s*{`);
    return getterRegex.test(componentContent) && setterRegex.test(componentContent);
}

function addGetterSetter(componentContent, property) {
    // Agregar los métodos getters y setters al componente
    const getterSetterCode = `
    get ${property}() {
        return this._${property};
    }

    set ${property}(value) {
        this._${property} = value;
    }\n\n`;

    const classEndIndex = componentContent.lastIndexOf('}');
    if (classEndIndex !== -1) {
        const updatedComponentContent = componentContent.slice(0, classEndIndex) + getterSetterCode + componentContent.slice(classEndIndex);
        return updatedComponentContent;
    }
    return componentContent;
}

function removeGetterSetter(componentContent, property) {
    // Eliminar los métodos getters y setters del componente
    const getterSetterRegex = new RegExp(`get ${property}\\(\\)\\s*{[^}]+}\\s*set ${property}\\([^)]+\\)\\s*{[^}]+}`);
    return componentContent.replace(getterSetterRegex, '');
}

function updateComponentProps(componentContent, properties) {
    const updatedPropsList = properties.map(prop => `'${prop}'`).join(', ');
    const propIndex = componentContent.indexOf('this.debuggerProps = [');
    const propsStartIndex = componentContent.indexOf('[', propIndex);
    const propsEndIndex = componentContent.indexOf(']', propIndex);
    const updatedComponentContent = `${componentContent.slice(0, propsStartIndex + 1)}${updatedPropsList}${componentContent.slice(propsEndIndex)}`;
    return updatedComponentContent;
}

export default modifyComponent;

