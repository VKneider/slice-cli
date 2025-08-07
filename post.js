import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Print from './commands/Print.js';
import initializeProject from './commands/init/init.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectName = path.basename(__dirname); // Obtiene el nombre de la carpeta actual

const projectPackageJsonPath = path.resolve(__dirname, '../../package.json');

// Verifica si el archivo package.json existe
fs.promises.access(projectPackageJsonPath, fs.constants.F_OK)
    .then(() => {
        // El archivo package.json existe, por lo que lo leemos y agregamos los comandos
        return fs.promises.readFile(projectPackageJsonPath, 'utf8');
    })
    .then(data => {
        // Convierte el contenido del archivo a un objeto JSON
        const projectPackageJson = JSON.parse(data);

        // Agrega los comandos personalizados a los scripts del proyecto
        projectPackageJson.scripts = projectPackageJson.scripts || {};
        projectPackageJson.scripts['slice:create'] = 'node node_modules/slicejs-cli/client.js component create';
        projectPackageJson.scripts['slice:list'] = 'node node_modules/slicejs-cli/client.js component list';
        projectPackageJson.scripts['slice:delete'] = 'node node_modules/slicejs-cli/client.js component delete';
        projectPackageJson.scripts['slice:init'] = 'node node_modules/slicejs-cli/client.js init';
        projectPackageJson.scripts['run'] = 'node api/index.js';
        projectPackageJson.scripts['slice:start'] = 'node api/index.js';
        projectPackageJson.scripts['development'] = 'node api/index.js';

        // add type module
        projectPackageJson.type = 'module';
        projectPackageJson.engines = {
            "node": "20.x"
        };
        
        // Escribe el nuevo contenido en el package.json del proyecto
         fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(projectPackageJson, null, 2), 'utf8');
         return Print.success("Run 'npm run slice:init' to initialize your project");
    })
    .then(() => {
        console.log('SliceJS CLI commands added to package.json.');
    })
    .catch(err => {
        if (err.code === 'ENOENT') {
            // El archivo package.json no existe, así que creamos uno nuevo con los comandos
            const defaultPackageJson = {
                name: "project-name", // Utiliza el nombre de la carpeta como nombre del proyecto
                version: '1.0.0',
                description: 'Project description',
                main: 'api/index.js',
                scripts: {
                    'slice:create': 'node node_modules/slicejs-cli/client.js component create',
                    'slice:list': 'node node_modules/slicejs-cli/client.js component list',
                    'slice:delete': 'node node_modules/slicejs-cli/client.js component delete',
                    "run": "node api/index.js",
                    "slice:start": "node api/index.js",
                    "slice:init": "node node_modules/slicejs-cli/client.js init"
                },
                keywords: [],
                author: '',
                license: 'ISC',
                type: 'module',
                engines: {
                    "node": "20.x"
                }
            };
            // Guardamos el nuevo package.json
             fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(defaultPackageJson, null, 2), 'utf8');
             return Print.success("Run 'npm run slice:init' to initialize your project");
        } else {
            console.error('Error:', err);
        }
    })
    .then(() => {
        console.log('Created package.json with SliceJS CLI commands.');
    })
    .catch(err => {
        console.error('Error:', err);
    })


