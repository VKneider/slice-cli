import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Validations {
    constructor() {
        this.config = this.loadConfig(); // Cargamos la configuración solo una vez al instanciar
        this.categories = this.config?.paths?.components;

    }

    isValidComponentName(componentName) {
        // Expresión regular para verificar si el nombre contiene caracteres especiales
        const regex = /^[a-zA-Z][a-zA-Z0-9]*$/;
        return regex.test(componentName);
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, '../../../src/sliceConfig.json');
            const rawData = fs.readFileSync(configPath, 'utf-8');
            return JSON.parse(rawData);
        } catch (error) {
            console.error(`Error cargando configuración: ${error.message}`);
            return null;
        }
    }

    getCategories() {
        return this.categories; // Usamos las categorías cargadas en el constructor
    }

    getCategoryPath(category) {
        return  this.categories[category].path;
    }

    getCategoryType(category){
        return this.categories[category].type;
    }

    isValidCategory(category) {
        const availableCategories = Object.keys(this.categories).map(cat => cat.toLowerCase()); 

        if (availableCategories.includes(category.toLowerCase())) {
            return { isValid: true, category };
        } else {
            return { isValid: false, category: null };
        }
    }
}

const validations = new Validations();

export default validations;