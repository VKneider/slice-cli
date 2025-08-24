// commands/getComponent/getComponent.js

import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import inquirer from "inquirer";
import validations from "../Validations.js";
import Print from "../Print.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Base URL del repositorio de documentación de Slice.js
const DOCS_REPO_BASE_URL = 'https://raw.githubusercontent.com/VKneider/slice.js/main/src/Components';
const COMPONENTS_REGISTRY_URL = 'https://raw.githubusercontent.com/VKneider/slice.js/main/src/Components/components.js';

class ComponentRegistry {
  constructor() {
    this.componentsRegistry = null;
  }

  async loadRegistry() {
    Print.info('📡 Cargando registro de componentes del repositorio oficial...');
    
    try {
      const response = await fetch(COMPONENTS_REGISTRY_URL);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();
      
      // Parse the components.js file content
      const match = content.match(/const components = ({[\s\S]*?});/);
      if (!match) {
        throw new Error('Invalid components.js format from repository');
      }

      this.componentsRegistry = eval('(' + match[1] + ')');
      Print.success('✅ Registro de componentes cargado exitosamente');
      
    } catch (error) {
      Print.error(`❌ Error cargando registro de componentes: ${error.message}`);
      Print.info('💡 Verifica tu conexión a internet y que el repositorio sea accesible');
      throw error;
    }
  }

  async getLocalComponents() {
    try {
      const componentsPath = path.join(__dirname, '../../../src/Components/components.js');
      
      if (!await fs.pathExists(componentsPath)) {
        return {};
      }

      const content = await fs.readFile(componentsPath, 'utf8');
      const match = content.match(/const components = ({[\s\S]*?});/);
      
      if (!match) {
        return {};
      }

      return eval('(' + match[1] + ')');
    } catch (error) {
      Print.warning('⚠️  No se pudo leer el registro local de componentes');
      return {};
    }
  }

  async findUpdatableComponents() {
    const localComponents = await this.getLocalComponents();
    const updatableComponents = [];

    Object.entries(localComponents).forEach(([name, category]) => {
      // Check if component exists in remote registry
      if (this.componentsRegistry[name] && this.componentsRegistry[name] === category) {
        // Check if local component directory exists
        const categoryPath = validations.getCategoryPath(category);
        const componentPath = path.join(__dirname, '../../../src', categoryPath, name);
        
        if (fs.pathExistsSync(componentPath)) {
          updatableComponents.push({
            name,
            category,
            path: componentPath,
            description: this.getComponentDescription(name, category)
          });
        }
      }
    });

    return updatableComponents;
  }

  getAvailableComponents(category = null) {
    if (!this.componentsRegistry) return {};
    
    const components = {};
    Object.entries(this.componentsRegistry).forEach(([name, componentCategory]) => {
      if (!category || componentCategory === category) {
        components[name] = {
          name,
          category: componentCategory,
          files: componentCategory === 'Visual' ? 
            [`${name}.js`, `${name}.html`, `${name}.css`] : 
            [`${name}.js`],
          description: this.getComponentDescription(name, componentCategory)
        };
      }
    });
    
    return components;
  }

  getComponentDescription(componentName, category) {
    const descriptions = {
      // Visual Components
      'Button': 'Interactive button component with customizable styling and events',
      'Card': 'Flexible container component for displaying content in card format',
      'Input': 'Form input component with validation and multiple input types support',
      'Checkbox': 'Checkbox input component with custom styling and state management',
      'Switch': 'Toggle switch component for binary state selection',
      'Select': 'Dropdown selection component with search and multi-select support',
      'Details': 'Collapsible details component for expandable content sections',
      'Grid': 'Responsive grid layout component for organizing content',
      'Icon': 'Icon display component with multiple icon libraries support',
      'Layout': 'Main layout component for application page structure',
      'Loading': 'Loading indicator component with multiple animation styles',
      'Navbar': 'Navigation bar component with responsive design and menu support',
      'TreeView': 'Hierarchical tree view component for nested data display',
      'TreeItem': 'Individual tree item component used within TreeView',
      'DropDown': 'Dropdown menu component for contextual actions',
      'Route': 'Single route component for client-side routing',
      'MultiRoute': 'Multiple route handler component for complex routing',
      'NotFound': '404 error page component for unmatched routes',
      
      // Service Components
      'FetchManager': 'HTTP request manager service for API communication',
      'LocalStorageManager': 'Local storage management service for browser storage',
      'IndexedDbManager': 'IndexedDB database management service for client-side storage',
      'Translator': 'Internationalization service for multi-language support',
      'Link': 'Navigation link service for programmatic routing'
    };

    return descriptions[componentName] || `${componentName} component from Slice.js framework (${category})`;
  }

  async downloadComponentFiles(componentName, category, targetPath) {
    const component = this.getAvailableComponents(category)[componentName];
    
    if (!component) {
      throw new Error(`Component ${componentName} not found in ${category} category`);
    }

    const downloadedFiles = [];
    Print.info(`📥 Descargando ${componentName} desde el repositorio oficial...`);

    for (const fileName of component.files) {
      const githubUrl = `${DOCS_REPO_BASE_URL}/${category}/${componentName}/${fileName}`;
      const localPath = path.join(targetPath, fileName);

      try {
        const response = await fetch(githubUrl);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText} para ${fileName}`);
        }

        const content = await response.text();
        await fs.writeFile(localPath, content, 'utf8');
        downloadedFiles.push(fileName);
        
        console.log(`  ✅ ${fileName}`);
      } catch (error) {
        Print.error(`  ❌ Error descargando ${fileName}: ${error.message}`);
        throw error;
      }
    }

    return downloadedFiles;
  }

  async updateLocalRegistry(componentName, category) {
    const componentsPath = path.join(__dirname, '../../../src/Components/components.js');
    
    try {
      let content = await fs.readFile(componentsPath, 'utf8');
      
      // Parse existing components
      const componentsMatch = content.match(/const components = ({[\s\S]*?});/);
      if (!componentsMatch) {
        throw new Error('Invalid components.js format in local project');
      }

      const componentsObj = eval('(' + componentsMatch[1] + ')');
      
      // Add new component if it doesn't exist
      if (!componentsObj[componentName]) {
        componentsObj[componentName] = category;

        // Generate new content
        const sortedComponents = Object.keys(componentsObj)
          .sort()
          .reduce((obj, key) => {
            obj[key] = componentsObj[key];
            return obj;
          }, {});

        const newComponentsString = JSON.stringify(sortedComponents, null, 2)
          .replace(/"/g, '"')
          .replace(/: "/g, ': "')
          .replace(/",\n/g, '",\n');

        const newContent = `const components = ${newComponentsString}; export default components;`;
        
        await fs.writeFile(componentsPath, newContent, 'utf8');
        Print.success(`📝 Registrado ${componentName} en components.js local`);
      } else {
        Print.info(`📄 ${componentName} ya existe en el registro local`);
      }
      
    } catch (error) {
      Print.error(`❌ Error actualizando components.js local: ${error.message}`);
      throw error;
    }
  }

  async installComponent(componentName, category, force = false) {
    const availableComponents = this.getAvailableComponents(category);

    if (!availableComponents[componentName]) {
      throw new Error(`Componente '${componentName}' no encontrado en la categoría '${category}' del repositorio oficial`);
    }

    const categoryPath = validations.getCategoryPath(category);
    const targetPath = path.join(__dirname, '../../../src', categoryPath, componentName);

    // Check if component already exists
    if (await fs.pathExists(targetPath) && !force) {
      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: `El componente '${componentName}' ya existe localmente. ¿Deseas sobrescribirlo con la versión del repositorio?`,
          default: false
        }
      ]);
      
      if (!overwrite) {
        Print.info('⏭️  Instalación cancelada por el usuario');
        return false;
      }
    }

    try {
      // Create component directory
      await fs.ensureDir(targetPath);

      // Download component files
      const downloadedFiles = await this.downloadComponentFiles(componentName, category, targetPath);

      // Update components registry
      await this.updateLocalRegistry(componentName, category);

      Print.success(`✅ ${componentName} actualizado exitosamente desde el repositorio oficial!`);
      console.log(`📁 Ubicación: src/${categoryPath}/${componentName}/`);
      console.log(`📄 Archivos: ${downloadedFiles.join(', ')}`);

      return true;

    } catch (error) {
      Print.error(`❌ Error actualizando ${componentName}: ${error.message}`);
      // Clean up partial installation
      if (await fs.pathExists(targetPath)) {
        await fs.remove(targetPath);
      }
      throw error;
    }
  }

  async installMultipleComponents(componentNames, category = 'Visual', force = false) {
    const results = [];
    Print.info(`🚀 Obteniendo ${componentNames.length} componentes ${category} del repositorio oficial...\n`);

    for (const componentName of componentNames) {
      try {
        const result = await this.installComponent(componentName, category, force);
        results.push({ name: componentName, success: result });
      } catch (error) {
        Print.error(`❌ Error con ${componentName}: ${error.message}\n`);
        results.push({ name: componentName, success: false, error: error.message });
      }
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    console.log(`\n📊 Resumen de instalación:`);
    Print.success(`✅ Exitosos: ${successful}`);
    if (failed > 0) {
      Print.error(`❌ Fallidos: ${failed}`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`  • ${r.name}: ${r.error}`);
      });
    }

    return results;
  }

  async updateAllComponents(force = false) {
    Print.info('🔄 Buscando componentes actualizables...');
    
    const updatableComponents = await this.findUpdatableComponents();
    
    if (updatableComponents.length === 0) {
      Print.info('✅ No se encontraron componentes locales que coincidan con el repositorio oficial');
      Print.info('💡 Usa "npm run slice:browse" para ver componentes disponibles');
      return true;
    }

    console.log(`\n📦 Encontrados ${updatableComponents.length} componentes actualizables:\n`);
    updatableComponents.forEach(comp => {
      const icon = comp.category === 'Visual' ? '🎨' : '⚙️';
      console.log(`${icon} ${comp.name} (${comp.category})`);
    });

    if (!force) {
      const { confirmUpdate } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'confirmUpdate',
          message: `¿Deseas actualizar todos estos componentes a las versiones del repositorio oficial?`,
          default: true
        }
      ]);

      if (!confirmUpdate) {
        Print.info('⏭️  Actualización cancelada por el usuario');
        return false;
      }
    }

    // Group by category for efficient processing
    const visualComponents = updatableComponents.filter(c => c.category === 'Visual').map(c => c.name);
    const serviceComponents = updatableComponents.filter(c => c.category === 'Service').map(c => c.name);

    let allResults = [];

    // Update Visual components
    if (visualComponents.length > 0) {
      Print.info(`\n🎨 Actualizando ${visualComponents.length} componentes Visual...`);
      const visualResults = await this.installMultipleComponents(visualComponents, 'Visual', true);
      allResults = allResults.concat(visualResults);
    }

    // Update Service components
    if (serviceComponents.length > 0) {
      Print.info(`\n⚙️  Actualizando ${serviceComponents.length} componentes Service...`);
      const serviceResults = await this.installMultipleComponents(serviceComponents, 'Service', true);
      allResults = allResults.concat(serviceResults);
    }

    // Final summary
    const totalSuccessful = allResults.filter(r => r.success).length;
    const totalFailed = allResults.filter(r => !r.success).length;

    console.log(`\n🎯 Resumen final de actualización:`);
    Print.success(`✅ Componentes actualizados: ${totalSuccessful}`);
    
    if (totalFailed > 0) {
      Print.error(`❌ Componentes fallidos: ${totalFailed}`);
    } else {
      Print.success(`🚀 ¡Todos tus componentes están ahora actualizados a las últimas versiones oficiales!`);
    }

    return totalFailed === 0;
  }

  displayAvailableComponents() {
    if (!this.componentsRegistry) {
      Print.error('❌ No se pudo cargar el registro de componentes');
      return;
    }

    console.log('\n📚 Componentes disponibles en el repositorio oficial de Slice.js:\n');

    const visualComponents = this.getAvailableComponents('Visual');
    const serviceComponents = this.getAvailableComponents('Service');

    Print.info('🎨 Visual Components (UI):');
    Object.entries(visualComponents).forEach(([name, info]) => {
      console.log(`  • ${name}: ${info.description}`);
    });

    Print.info('\n⚙️  Service Components (Logic):');
    Object.entries(serviceComponents).forEach(([name, info]) => {
      console.log(`  • ${name}: ${info.description}`);
    });

    console.log(`\n💡 Ejemplos de uso:`);
    console.log(`npm run slice:get Button Card Input`);
    console.log(`npm run slice:get FetchManager --service`);
    console.log(`npm run slice:sync              # Actualizar componentes existentes`);
  }

  async interactiveInstall() {
    const { componentType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'componentType',
        message: 'Selecciona el tipo de componente a obtener del repositorio:',
        choices: [
          { name: '🎨 Visual Components (UI)', value: 'Visual' },
          { name: '⚙️  Service Components (Logic)', value: 'Service' }
        ]
      }
    ]);

    const availableComponents = this.getAvailableComponents(componentType);
    const componentChoices = Object.entries(availableComponents).map(([name, info]) => ({
      name: `${name} - ${info.description}`,
      value: name
    }));

    if (componentType === 'Visual') {
      const { installMode } = await inquirer.prompt([
        {
          type: 'list',
          name: 'installMode',
          message: '¿Cómo deseas obtener los componentes Visual?',
          choices: [
            { name: 'Obtener uno solo', value: 'single' },
            { name: 'Obtener múltiples', value: 'multiple' }
          ]
        }
      ]);

      if (installMode === 'multiple') {
        const { selectedComponents } = await inquirer.prompt([
          {
            type: 'checkbox',
            name: 'selectedComponents',
            message: 'Selecciona los componentes Visual a obtener del repositorio:',
            choices: componentChoices,
            validate: (input) => {
              if (input.length === 0) {
                return 'Debes seleccionar al menos un componente';
              }
              return true;
            }
          }
        ]);

        await this.installMultipleComponents(selectedComponents, componentType);
      } else {
        const { selectedComponent } = await inquirer.prompt([
          {
            type: 'list',
            name: 'selectedComponent',
            message: 'Selecciona un componente Visual:',
            choices: componentChoices
          }
        ]);

        await this.installComponent(selectedComponent, componentType);
      }
    } else {
      const { selectedComponent } = await inquirer.prompt([
        {
          type: 'list',
          name: 'selectedComponent',
          message: 'Selecciona un componente Service:',
          choices: componentChoices
        }
      ]);

      await this.installComponent(selectedComponent, componentType);
    }
  }

  findComponentInRegistry(componentName) {
    if (!this.componentsRegistry) return null;
    
    const normalizedName = componentName.charAt(0).toUpperCase() + componentName.slice(1);
    
    if (this.componentsRegistry[normalizedName]) {
      return {
        name: normalizedName,
        category: this.componentsRegistry[normalizedName]
      };
    }
    
    return null;
  }
}

// Main get function
async function getComponents(componentNames = [], options = {}) {
  const registry = new ComponentRegistry();
  
  try {
    await registry.loadRegistry();
  } catch (error) {
    Print.error('No se pudo cargar el registro de componentes del repositorio oficial');
    Print.info('💡 Verifica tu conexión a internet y vuelve a intentar');
    return false;
  }

  // Interactive mode if no components specified
  if (!componentNames || componentNames.length === 0) {
    await registry.interactiveInstall();
    return true;
  }

  // Determine category
  const category = options.service ? 'Service' : 'Visual';

  if (componentNames.length === 1) {
    // Single component install
    const componentInfo = registry.findComponentInRegistry(componentNames[0]);
    
    if (!componentInfo) {
      Print.error(`Componente '${componentNames[0]}' no encontrado en el repositorio oficial`);
      Print.info('💡 Usa "npm run slice:browse" para ver componentes disponibles');
      return false;
    }

    // Use the category from registry unless Service is explicitly requested
    const actualCategory = options.service ? 'Service' : componentInfo.category;

    try {
      await registry.installComponent(componentInfo.name, actualCategory, options.force);
      return true;
    } catch (error) {
      Print.error(`Error: ${error.message}`);
      return false;
    }
  } else {
    // Multiple components install
    const normalizedComponents = componentNames.map(name => 
      name.charAt(0).toUpperCase() + name.slice(1)
    );

    try {
      await registry.installMultipleComponents(normalizedComponents, category, options.force);
      return true;
    } catch (error) {
      Print.error(`Error: ${error.message}`);
      return false;
    }
  }
}

// List components function
async function listComponents() {
  const registry = new ComponentRegistry();
  
  try {
    await registry.loadRegistry();
    registry.displayAvailableComponents();
    return true;
  } catch (error) {
    Print.error('No se pudo cargar el registro de componentes del repositorio oficial');
    Print.info('💡 Verifica tu conexión a internet y vuelve a intentar');
    return false;
  }
}

// Sync components function - NEW
async function syncComponents(options = {}) {
  const registry = new ComponentRegistry();
  
  try {
    await registry.loadRegistry();
    return await registry.updateAllComponents(options.force);
  } catch (error) {
    Print.error('No se pudo cargar el registro de componentes del repositorio oficial');
    Print.info('💡 Verifica tu conexión a internet y vuelve a intentar');
    return false;
  }
}

export default getComponents;
export { listComponents, syncComponents };