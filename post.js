import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Print from './commands/Print.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectName = path.basename(__dirname);

const projectPackageJsonPath = path.resolve(__dirname, '../../package.json');

// Check if package.json file exists
fs.promises.access(projectPackageJsonPath, fs.constants.F_OK)
    .then(() => {
        // The package.json file exists, so we read it and add the commands
        return fs.promises.readFile(projectPackageJsonPath, 'utf8');
    })
    .then(data => {
        // Convert the file content to a JSON object
        const projectPackageJson = JSON.parse(data);

        // Add custom commands to the project scripts
        projectPackageJson.scripts = projectPackageJson.scripts || {};
        
        // Main project commands
        projectPackageJson.scripts['slice:init'] = 'node node_modules/slicejs-cli/client.js init';
        projectPackageJson.scripts['slice:start'] = 'node api/index.js';
        projectPackageJson.scripts['slice:version'] = 'node node_modules/slicejs-cli/client.js version';
        projectPackageJson.scripts['slice:update'] = 'node node_modules/slicejs-cli/client.js update';
        
        // Local component commands
        projectPackageJson.scripts['slice:create'] = 'node node_modules/slicejs-cli/client.js component create';
        projectPackageJson.scripts['slice:list'] = 'node node_modules/slicejs-cli/client.js component list';
        projectPackageJson.scripts['slice:delete'] = 'node node_modules/slicejs-cli/client.js component delete';
        
        // Main repository commands (most used shortcuts)
        projectPackageJson.scripts['slice:get'] = 'node node_modules/slicejs-cli/client.js get';
        projectPackageJson.scripts['slice:browse'] = 'node node_modules/slicejs-cli/client.js browse';
        projectPackageJson.scripts['slice:sync'] = 'node node_modules/slicejs-cli/client.js sync';
        
        // Detailed registry commands (for advanced users)
        projectPackageJson.scripts['slice:registry-get'] = 'node node_modules/slicejs-cli/client.js registry get';
        projectPackageJson.scripts['slice:registry-list'] = 'node node_modules/slicejs-cli/client.js registry list';
        projectPackageJson.scripts['slice:registry-sync'] = 'node node_modules/slicejs-cli/client.js registry sync';
        
        // Legacy/compatibility commands
        projectPackageJson.scripts['run'] = 'node api/index.js';
        projectPackageJson.scripts['development'] = 'node api/index.js';

        // Module configuration
        projectPackageJson.type = 'module';
        projectPackageJson.engines = {
            "node": ">=20.0.0"
        };
        
        // Write the new content to package.json
        return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(projectPackageJson, null, 2), 'utf8');
    })
    .then(() => {
        console.log('✅ SliceJS CLI commands added to package.json');
        console.log('\n🚀 Main commands:');
        console.log('  npm run slice:init         - Initialize Slice.js project');
        console.log('  npm run slice:get Button   - Get components from official repository');
        console.log('  npm run slice:browse       - View all available components');
        console.log('  npm run slice:sync         - Update local components to latest versions');
        console.log('  npm run slice:start        - Start development server');
        console.log('\n⚙️  Local component management:');
        console.log('  npm run slice:create       - Create local component');
        console.log('  npm run slice:list         - List local components');
        console.log('  npm run slice:delete       - Delete local component');
        console.log('\n🔧 Utilities:');
        console.log('  npm run slice:version      - View version information');
        console.log('  npm run slice:update       - Check for available updates');
        console.log('\n🎯 To get started: npm run slice:init');
        console.log('💡 Tip: Use "slice:sync" to keep your components updated');
    })
    .catch(err => {
        if (err.code === 'ENOENT') {
            // The package.json file doesn't exist, so we create a new one with the commands
            const defaultPackageJson = {
                name: projectName,
                version: '1.0.0',
                description: 'Slice.js project',
                main: 'api/index.js',
                scripts: {
                    // Main commands
                    'slice:init': 'node node_modules/slicejs-cli/client.js init',
                    'slice:start': 'node node_modules/slicejs-cli/client.js start',
                    'slice:version': 'node node_modules/slicejs-cli/client.js version',
                    'slice:update': 'node node_modules/slicejs-cli/client.js update',
                    
                    // Local components
                    'slice:create': 'node node_modules/slicejs-cli/client.js component create',
                    'slice:list': 'node node_modules/slicejs-cli/client.js component list',
                    'slice:delete': 'node node_modules/slicejs-cli/client.js component delete',
                    
                    // Official repository (shortcuts)
                    'slice:get': 'node node_modules/slicejs-cli/client.js get',
                    'slice:browse': 'node node_modules/slicejs-cli/client.js browse',
                    'slice:sync': 'node node_modules/slicejs-cli/client.js sync',
                    
                    // Detailed registry
                    'slice:registry-get': 'node node_modules/slicejs-cli/client.js registry get',
                    'slice:registry-list': 'node node_modules/slicejs-cli/client.js registry list',
                    'slice:registry-sync': 'node node_modules/slicejs-cli/client.js registry sync',
                    
                    // Legacy
                    'run': 'node api/index.js'
                },
                keywords: ['slicejs', 'web-framework', 'components'],
                author: '',
                license: 'ISC',
                type: 'module',
                engines: {
                    "node": ">=20.0.0"
                }
            };
            
            // Save the new package.json
            return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(defaultPackageJson, null, 2), 'utf8');
        } else {
            console.error('Error:', err);
            throw err;
        }
    })
    .then(() => {
        console.log('✅ Created package.json with SliceJS CLI commands.');
        console.log('\n🚀 Main commands:');
        console.log('  npm run slice:init         - Initialize Slice.js project');
        console.log('  npm run slice:get Button   - Get components from official repository');
        console.log('  npm run slice:browse       - View all available components');
        console.log('  npm run slice:sync         - Update local components to latest versions');
        console.log('  npm run slice:start        - Start development server');
        console.log('\n⚙️  Local component management:');
        console.log('  npm run slice:create       - Create local component');
        console.log('  npm run slice:list         - List local components');
        console.log('  npm run slice:delete       - Delete local component');
        console.log('\n🔧 Utilities:');
        console.log('  npm run slice:version      - View version information');
        console.log('  npm run slice:update       - Check for available updates');
        console.log('\n🎯 To get started: npm run slice:init');
        console.log('💡 Tip: Use "slice:sync" to keep your components updated');
    })
    .catch(err => {
        console.error('Error creating package.json:', err);
    });