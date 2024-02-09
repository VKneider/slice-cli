import fs from 'fs';
import path from 'path';

const __dirname = path.dirname(new URL(import.meta.url).pathname);

function modifyComponent(componentName, category, addProperties, removeProperties) {
    if (!componentName) {
        console.error('Component name is required');
        return;
    }

    if (!isValidComponentName(componentName)) {
        console.error('Invalid component name. Please use only alphanumeric characters and start with a letter.');
        return;
    }

    if (!['Service', 'Visual', 'Provider', 'Structural'].includes(category)) {
        console.error('Invalid category. Please use one of the following categories: Service, Visual, Provider, Structural');
        return;
    }

    const fileName = `${componentName}.js`;
    const componentPath = path.join('Components', category, fileName);

    if (!fs.existsSync(componentPath)) {
        console.error(`Component '${componentName}' does not exist.`);
        return;
    }

    let componentContent = fs.readFileSync(componentPath, 'utf-8');
    let existingProperties = extractProperties(componentContent);

    addProperties.forEach(property => {
        if (!existingProperties.includes(property)) {
            existingProperties.push(property);
            console.log(`Property '${property}' added to component '${componentName}'.`);
            // Agregar getters y setters al componente
            componentContent = addGetterSetter(componentContent, property);
        } else {
            console.log(`Property '${property}' already exists in component '${componentName}'.`);
        }
    });

    removeProperties.forEach(property => {
        if (existingProperties.includes(property)) {
            existingProperties = existingProperties.filter(prop => prop !== property);
            console.log(`Property '${property}' removed from component '${componentName}'.`);
            componentContent = removeGetterSetter(componentContent, property);
        } else {
            console.log(`Property '${property}' does not exist in component '${componentName}'.`);
        }
    });

    componentContent = updateComponentProps(componentContent, existingProperties);
    fs.writeFileSync(componentPath, componentContent);
    console.log(`Component '${componentName}' modified successfully.`);
}

function isValidComponentName(componentName) {
    const regex = /^[a-zA-Z][a-zA-Z0-9]*$/;
    return regex.test(componentName);
}

function extractProperties(componentContent) {
    const propRegex = /this\.debuggerProps\s*=\s*\[(.*?)\];/s;
    const match = componentContent.match(propRegex);
    if (match && match[1]) {
        return match[1].split(',').map(prop => prop.trim().replace(/['"]/g, ''));
    }
    return [];
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

    const updatedComponentContent = componentContent.replace(getterSetterRegex, '');
    return updatedComponentContent;
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

modifyComponent('Input', 'Visual', ['placeholder', 'conditions'], []);
