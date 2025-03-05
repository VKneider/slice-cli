import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

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
        projectPackageJson.scripts['slice:init'] = 'node node_modules/slicejs-cli/client.js init';
        projectPackageJson.scripts['slice:create'] = 'node node_modules/slicejs-cli/client.js component create';
        projectPackageJson.scripts['slice:list'] = 'node node_modules/slicejs-cli/client.js component list';
        projectPackageJson.scripts['slice:delete'] = 'node node_modules/slicejs-cli/client.js component delete';
        
        // Escribe el nuevo contenido en el package.json del proyecto
        return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(projectPackageJson, null, 2), 'utf8');
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
                main: 'index.js',
                scripts: {
                    'slice:init': 'node node_modules/slicejs-cli/client.js init',
                    'slice:create': 'node node_modules/slicejs-cli/client.js component create',
                    'slice:list': 'node node_modules/slicejs-cli/client.js component list',
                    'slice:delete': 'node node_modules/slicejs-cli/client.js component delete'
                },
                keywords: [],
                author: '',
                license: 'ISC'
            };
            // Guardamos el nuevo package.json
            return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(defaultPackageJson, null, 2), 'utf8');
        } else {
            console.error('Error:', err);
        }
    })
    .then(() => {
        console.log('Created package.json with SliceJS CLI commands.');
    })
    .catch(err => {
        console.error('Error:', err);
    });
