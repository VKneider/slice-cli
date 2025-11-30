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

        // Main project commands - using 'slice' directly
        projectPackageJson.scripts['dev'] = 'slice dev';
        projectPackageJson.scripts['start'] = 'slice start';

        // Component management
        projectPackageJson.scripts['component:create'] = 'slice component create';
        projectPackageJson.scripts['component:list'] = 'slice component list';
        projectPackageJson.scripts['component:delete'] = 'slice component delete';

        // Main repository commands (most used shortcuts)
        projectPackageJson.scripts['get'] = 'slice get';
        projectPackageJson.scripts['browse'] = 'slice browse';
        projectPackageJson.scripts['sync'] = 'slice sync';

        // Utility commands
        projectPackageJson.scripts['slice:version'] = 'slice version';
        projectPackageJson.scripts['slice:update'] = 'slice update';

        // Legacy commands - mantener por compatibilidad temporal
        projectPackageJson.scripts['slice:init'] = 'slice init';
        projectPackageJson.scripts['slice:start'] = 'slice start';
        projectPackageJson.scripts['slice:dev'] = 'slice dev';
        projectPackageJson.scripts['slice:create'] = 'slice component create';
        projectPackageJson.scripts['slice:list'] = 'slice component list';
        projectPackageJson.scripts['slice:delete'] = 'slice component delete';
        projectPackageJson.scripts['slice:get'] = 'slice get';
        projectPackageJson.scripts['slice:browse'] = 'slice browse';
        projectPackageJson.scripts['slice:sync'] = 'slice sync';
        projectPackageJson.scripts['run'] = 'slice dev';

        // Module configuration
        projectPackageJson.type = 'module';
        projectPackageJson.engines = {
            "node": ">=20.0.0"
        };

        // Write the new content to package.json
        return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(projectPackageJson, null, 2), 'utf8');
    })
    .then(() => {
        console.log('✅ SliceJS CLI configured successfully');
        console.log('\n🎯 New recommended commands:');
        console.log('  slice dev              - Start development server');
        console.log('  slice get Button       - Get components from repository');
        console.log('  slice browse           - View available components');
        console.log('  slice component create - Create local component');
        console.log('\n📦 Available npm scripts:');
        console.log('  npm run dev            - Start development server');
        console.log('  npm run get            - Install components');
        console.log('  npm run browse         - Browse components');
        console.log('\n⚠️  Legacy commands (deprecated but still work):');
        console.log('  npm run slice:dev      - Use "slice dev" instead');
        console.log('  npm run slice:get      - Use "slice get" instead');
        console.log('\n💡 You can also use npx:');
        console.log('  npx slicejs-cli dev');
        console.log('\n📘 Documentation: https://slice-js-docs.vercel.app/');
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
                    // Main workflow commands
                    'dev': 'slice dev',
                    'start': 'slice start',

                    // Component management
                    'component:create': 'slice component create',
                    'component:list': 'slice component list',
                    'component:delete': 'slice component delete',

                    // Repository commands
                    'get': 'slice get',
                    'browse': 'slice browse',
                    'sync': 'slice sync',

                    // Utility
                    'slice:version': 'slice version',
                    'slice:update': 'slice update',

                    // Legacy commands (for compatibility)
                    'slice:init': 'slice init',
                    'slice:start': 'slice start',
                    'slice:dev': 'slice dev',
                    'slice:create': 'slice component create',
                    'slice:list': 'slice component list',
                    'slice:delete': 'slice component delete',
                    'slice:get': 'slice get',
                    'slice:browse': 'slice browse',
                    'slice:sync': 'slice sync',
                    'run': 'slice dev'
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
        console.log('\n🎯 Simplified development workflow:');
        console.log('  slice dev        → Start development server');
        console.log('  slice get Button → Install components');
        console.log('  slice browse     → View available components');
        console.log('\n🔧 Benefits:');
        console.log('  • Simple and direct commands');
        console.log('  • Can be used globally or with npx');
        console.log('  • Legacy npm scripts still work for compatibility');
    })
    .catch(err => {
        console.error('❌ Error setting up package.json:', err.message);
        process.exit(1);
    });