import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import Print from '../Print.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function initializeProject(projectType) {
    try {
        // Directorio de origen en el paquete
        let sliceDir;
        let basicPosibilities = ["basic", "Basic", "-b", "-B", "b", "B"];
        if (basicPosibilities.includes(projectType)) {
            sliceDir = path.join(__dirname, '../../PROJECT_TEMPLATES/Basic/Slice');
        }

        // Directorio de destino en la raíz del proyecto
        const destinationDir = path.join(__dirname, '../../../../Slice');
        const destinationSrc = path.join(__dirname, '../../../../src')
        const srcDir = path.join(__dirname, '../../PROJECT_TEMPLATES/Basic/src')

        // Verificar si el directorio de destino ya existe
        if (fs.existsSync(destinationDir)) {
            Print.error('El proyecto ya cuenta con un directorio "Slice". No es posible inicializar el proyecto nuevamente');
            return;
        }

        // Copiar el contenido del directorio de origen al directorio de destino 
        await fs.copy(sliceDir, destinationDir, { recursive: true });
        await fs.copy(srcDir, destinationSrc, { recursive: true });

        Print.success('Proyecto inicializado correctamente.');
    } catch (error) {
        Print.error('Error al inicializar el proyecto:', error);
    }
}


