import fs from 'fs';

// Ruta al package.json del proyecto que está instalando tu paquete
const projectPackageJsonPath = './node_modules/package.json';

// Lee el contenido del package.json del proyecto
fs.promises.readFile(projectPackageJsonPath, 'utf8')
    .then(data => {
        // Convierte el contenido del archivo a un objeto JSON
        const projectPackageJson = JSON.parse(data);

        // Agrega los comandos personalizados a los scripts del proyecto
        projectPackageJson.scripts = projectPackageJson.scripts || {};
        projectPackageJson.scripts['slice:init'] = 'node node_modules/slice-cli/client.js init';
        projectPackageJson.scripts['slice:create'] = 'node node_modules/slice-cli/client.js create';
        projectPackageJson.scripts['slice:modify'] = 'node node_modules/slice-cli/client.js modify';
        projectPackageJson.scripts['slice:list'] = 'node node_modules/slice-cli/client.js list';

        // Escribe el nuevo contenido en el package.json del proyecto
        return fs.promises.writeFile(projectPackageJsonPath, JSON.stringify(projectPackageJson, null, 2), 'utf8');
    })
    .then(() => {
        console.log('Comandos agregados al package.json del proyecto.');
    })
    .catch(err => {
        console.error('Error:', err);
    });
