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
        projectPackageJson.scripts['slice:dev'] = 'node api/index.js --development';
        projectPackageJson.scripts['slice:start'] = 'node api/index.js --production';
        projectPackageJson.scripts['slice:build'] = 'node node_modules/slicejs-cli/client.js build';
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
        
        // Build-related commands
        projectPackageJson.scripts['slice:build-serve'] = 'node node_modules/slicejs-cli/client.js build --serve';
        projectPackageJson.scripts['slice:build-preview'] = 'node node_modules/slicejs-cli/client.js build --preview';
        projectPackageJson.scripts['slice:build-analyze'] = 'node node_modules/slicejs-cli/client.js build --analyze';
        
        // Legacy/compatibility commands - ACTUALIZADOS
        projectPackageJson.scripts['run'] = 'node api/index.js --development';
        projectPackageJson.scripts['development'] = 'node api/index.js --development';

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
        console.log('\n🚀 Main workflow commands:');
        console.log('  npm run slice:init         - Initialize Slice.js project');
        console.log('  npm run slice:dev          - Start development server (serves from /src)');
        console.log('  npm run slice:build        - Build for production (creates /dist)');
        console.log('  npm run slice:start        - Start production server (serves from /dist)');
        console.log('\n📦 Component management:');
        console.log('  npm run slice:get Button   - Get components from official repository');
        console.log('  npm run slice:browse       - View all available components');
        console.log('  npm run slice:sync         - Update local components to latest versions');
        console.log('\n⚙️  Local component management:');
        console.log('  npm run slice:create       - Create local component');
        console.log('  npm run slice:list         - List local components');
        console.log('  npm run slice:delete       - Delete local component');
        console.log('\n🔧 Build utilities:');
        console.log('  npm run slice:build-serve  - Build and serve immediately');
        console.log('  npm run slice:build-preview- Build and preview');
        console.log('  npm run slice:build-analyze- Analyze build size');
        console.log('\n🔧 Other utilities:');
        console.log('  npm run slice:version      - View version information');
        console.log('  npm run slice:update       - Check for available updates');
        console.log('\n🎯 Development workflow:');
        console.log('  1. npm run slice:init      - Initialize project');
        console.log('  2. npm run slice:dev       - Develop with hot reload');
        console.log('  3. npm run slice:build     - Build for production');
        console.log('  4. npm run slice:start     - Test production build');
        console.log('\n💡 Tip: Use "slice:sync" to keep your components updated');
        console.log('\n🔧 New argument-based system:');
        console.log('  • slice:dev   → node api/index.js --development');
        console.log('  • slice:start → node api/index.js --production');
        console.log('  • Arguments take precedence over environment variables');
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
                    // Main workflow commands - UPDATED with arguments
                    'slice:init': 'node node_modules/slicejs-cli/client.js init',
                    'slice:dev': 'node api/index.js --development',
                    'slice:start': 'node api/index.js --production',
                    'slice:build': 'node node_modules/slicejs-cli/client.js build',
                    'slice:version': 'node node_modules/slicejs-cli/client.js version',
                    'slice:update': 'node node_modules/slicejs-cli/client.js update',
                    
                    // Local component commands
                    'slice:create': 'node node_modules/slicejs-cli/client.js component create',
                    'slice:list': 'node node_modules/slicejs-cli/client.js component list',
                    'slice:delete': 'node node_modules/slicejs-cli/client.js component delete',
                    
                    // Repository commands
                    'slice:get': 'node node_modules/slicejs-cli/client.js get',
                    'slice:browse': 'node node_modules/slicejs-cli/client.js browse',
                    'slice:sync': 'node node_modules/slicejs-cli/client.js sync',
                    
                    // Build utilities
                    'slice:build-serve': 'node node_modules/slicejs-cli/client.js build --serve',
                    'slice:build-preview': 'node node_modules/slicejs-cli/client.js build --preview',
                    'slice:build-analyze': 'node node_modules/slicejs-cli/client.js build --analyze',
                    
                    // Legacy commands - UPDATED
                    'run': 'node api/index.js --development',
                    'development': 'node api/index.js --development'
                },
                type: 'module',
                engines: {
                    "node": ">=20.0.0"
                }
            };
            
            return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(defaultPackageJson, null, 2), 'utf8');
        } else {
            throw err;
        }
    })
    .then(() => {
        console.log('✅ SliceJS CLI commands configured successfully');
        console.log('\n🎯 Updated workflow:');
        console.log('  npm run slice:dev    → node api/index.js --development (serves /src)');
        console.log('  npm run slice:start  → node api/index.js --production (serves /dist)');
        console.log('\n🔧 Benefits:');
        console.log('  • Clear argument-based mode detection');
        console.log('  • No confusion between src/dist directories');
        console.log('  • Maintains backward compatibility with NODE_ENV');
        console.log('  • More reliable and predictable behavior');
    })
    .catch(err => {
        console.error('❌ Error setting up package.json:', err.message);
        process.exit(1);
    });
