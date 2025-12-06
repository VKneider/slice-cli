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
    console.log('ℹ️  Global installation of slicejs-cli detected.');
    console.log('   Skipping scripts setup. Use the binary directly:');
    console.log('     slice dev');
    console.log('     slice get Button');
    process.exit(0);
}

console.log('ℹ️  Local installation of slicejs-cli detected.');
console.log('   Skipping automatic scripts setup in postinstall.');
console.log('   Use "slice init" to configure project scripts.');
process.exit(0);
