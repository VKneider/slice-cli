import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import Print from './commands/Print.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isGlobal = process.env.npm_config_global === 'true';
const initCwd = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : null;
const targetRoot = initCwd || path.resolve(__dirname, '../../');
const projectPackageJsonPath = path.join(targetRoot, 'package.json');

if (isGlobal) {
    console.log('ℹ️  Instalación global detectada de slicejs-cli.');
    console.log('   Omite configuración de scripts. Usa el binario directamente:');
    console.log('     slice dev');
    console.log('     slice get Button');
    process.exit(0);
}

console.log('ℹ️  Instalación local detectada de slicejs-cli.');
console.log('   Se omite configuración automática de scripts en postinstall.');
console.log('   Usa "slice init" para configurar los scripts del proyecto.');
process.exit(0);
