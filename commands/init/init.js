import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function initializeProject(projectType) {
    try {
        // Directorio de origen en el paquete
        let sliceDir;
        let basicPosibilities = ["basic", "Basic", "-b", "-B", "b", "B"];
        if (basicPosibilities.includes(projectType)) {
            sliceDir = path.join(__dirname, '../../PROJECT_TEMPLATES/Basic');
        }

        // Directorio de destino en la raíz del proyecto
        const destinationDir = path.join(__dirname, '../../../../Slice');

        // Verificar si el directorio de destino ya existe
        if (fs.existsSync(destinationDir)) {
            console.error('El proyecto ya cuenta con un directorio "Slice". No es posible inicializar el proyecto nuevamente');
            return;
        }

        // Copiar el contenido del directorio de origen al directorio de destino
        await fs.copy(sliceDir, destinationDir);

        console.log('Proyecto inicializado correctamente.');
    } catch (error) {
        console.error('Error al inicializar el proyecto:', error);
    }
}


