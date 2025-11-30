import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class Validations {
    constructor() {
        this._config = null;
        this._categories = null;
    }

    _ensureConfig() {
        if (!this._config) {
            this._config = this.loadConfig();
            if (this._config) {
                this._categories = this._config.paths?.components;
            }
        }
    }

    get config() {
        this._ensureConfig();
        return this._config;
    }

    isValidComponentName(componentName) {
        // Expresión regular para verificar si el nombre contiene caracteres especiales
        const regex = /^[a-zA-Z][a-zA-Z0-9]*$/;
        return regex.test(componentName);
    }

    loadConfig() {
        try {
            const configPath = path.join(__dirname, '../../../src/sliceConfig.json');
            if (!fs.existsSync(configPath)) {
                // Return null silently - let commands handle missing config if needed
                return null;
            }
            const rawData = fs.readFileSync(configPath, 'utf-8');

            return JSON.parse(rawData);
        } catch (error) {
            console.error('\x1b[31m', `❌ Error loading configuration: ${error.message}`, '\x1b[0m');
            return null;
        }
    }

    getCategories() {
        this._ensureConfig();
        return this._categories;
    }

    getCategoryPath(category) {
        this._ensureConfig();
        return this._categories && this._categories[category] ? this._categories[category].path : null;
    }

    getCategoryType(category) {
        this._ensureConfig();
        return this._categories && this._categories[category] ? this._categories[category].type : null;
    }

    isValidCategory(category) {
        this._ensureConfig();
        if (!this._categories) return { isValid: false, category: null };

        const availableCategories = Object.keys(this._categories).map(cat => cat.toLowerCase());

        if (availableCategories.includes(category.toLowerCase())) {
            return { isValid: true, category };
        } else {
            return { isValid: false, category: null };
        }
    }

    componentExists(componentName) {
        try {
            const componentFilePath = path.join(__dirname, '../../../src/Components/components.js');

            if (!fs.existsSync(componentFilePath)) {
                console.error('\x1b[31m', '❌ Error: components.js not found in expected path', '\x1b[0m');
                console.log('\x1b[36m', 'ℹ️  Info: Run "slice component list" to generate components.js', '\x1b[0m');
                return false;
            }

            const fileContent = fs.readFileSync(componentFilePath, 'utf-8');
            const components = eval(fileContent.replace('export default', '')); // Evalúa el contenido como objeto

            return components.hasOwnProperty(componentName);

        } catch (error) {
            console.error('\x1b[31m', `❌ Error checking component existence: ${error.message}`, '\x1b[0m');
            console.log('\x1b[36m', 'ℹ️  Info: The components.js file may be corrupted', '\x1b[0m');
            return false;
        }
    }
}

const validations = new Validations();

export default validations;