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
    console.log('⚠️  Global installation of slicejs-cli detected.');
    console.log('   We strongly recommend using a local installation to avoid version mismatches.');
    console.log('   Uninstall global: npm uninstall -g slicejs-cli');
    process.exit(0);
}

console.log('✅  slicejs-cli installed successfully.');
console.log('   Add the CLI to your package.json scripts:');
console.log('     "dev": "slice dev"');
console.log('   Then run: npm run dev');
process.exit(0);
