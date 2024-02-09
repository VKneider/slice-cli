
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default function listComponents() {

  const SlicePath = path.join(__dirname, '../../../../Slice/Components');

  const visualComponents = fs.readdirSync(`${SlicePath}/Visual`);
  const services = fs.readdirSync(`${SlicePath}/Service`);
  const providers = fs.readdirSync(`${SlicePath}/Provider`);
  const structuralComponents = fs.readdirSync(`${SlicePath}/Structural`)


  const componentMap = new Map();

  visualComponents.forEach(component => {
    componentMap.set(component, "Visual");
  });

  services.forEach(component => {
    componentMap.set(component, "Service");
  });

  providers.forEach(component => {
    componentMap.set(component, "Provider");
  });

  structuralComponents.forEach(component => {
    componentMap.set(component, "Structural");
  });


  const mapAsArray = Array.from(componentMap.entries());
  const mapObject = Object.fromEntries(mapAsArray);

  fs.writeFileSync(`${SlicePath}/components.js`, `const components = ${JSON.stringify(mapObject, null, 2)}; export default components;`);
  console.log('Components list updated');
}