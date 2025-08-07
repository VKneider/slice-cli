import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Print from '../Print.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function initializeProject(projectType) {
    try {
        // Directorio de origen en el paquete
        let sliceBaseDir = path.join(__dirname, '../../../slicejs-web-framework');
        let apiDir = path.join(sliceBaseDir, 'api');
        let srcDir = path.join(sliceBaseDir, 'src');

        let destinationApi = path.join(__dirname, '../../../../api');
        let destinationSrc = path.join(__dirname, '../../../../src');

        try {
            // Verificar si los directorios de origen existen
            if (!fs.existsSync(sliceBaseDir)) throw new Error(`No se encontró el directorio base: ${sliceBaseDir}`);
            if (!fs.existsSync(apiDir)) throw new Error(`No se encontró la carpeta api: ${apiDir}`);
            if (!fs.existsSync(srcDir)) throw new Error(`No se encontró la carpeta src: ${srcDir}`);
        } catch (error) {
            Print.error('Error validando directorios de origen:', error.message);
            return;
        }

        try {
            // Verificar si los directorios de destino ya existen
            if (fs.existsSync(destinationApi)) throw new Error(`El directorio "api" ya existe: ${destinationApi}`);
            if (fs.existsSync(destinationSrc)) throw new Error(`El directorio "src" ya existe: ${destinationSrc}`);
        } catch (error) {
            Print.error('Error validando directorios de destino:', error.message);
            return;
        }

        try {
            // Copiar las carpetas
            await fs.copy(apiDir, destinationApi, { recursive: true });
            Print.success('Carpeta "api" copiada correctamente.');
        } catch (error) {
            Print.error('Error copiando la carpeta "api":', error.message);
            return;
        }

        try {
            await fs.copy(srcDir, destinationSrc, { recursive: true });
            Print.success('Carpeta "src" copiada correctamente.');
        } catch (error) {
            Print.error('Error copiando la carpeta "src":', error.message);
            return;
        }

        Print.success('Proyecto inicializado correctamente.');
    } catch (error) {
        Print.error('Error inesperado al inicializar el proyecto:', error.message);
    }
}
