import { program } from "commander";
import initializeProject from "./commands/init/init.js";
import createComponent from "./commands/createComponent/createComponent.js";
import modifyComponent from "./commands/modifyComponent/modifyComponent.js";
import listComponents from "./commands/listComponents/listComponents.js";
import deleteComponent from "./commands/deleteComponent/deleteComponent.js";

const sliceClient = program;

sliceClient
    .version('1.0.0')
    .description('Client for managing framework components');

sliceClient
    .command('init')
    .description('Initialize the project')
    .action(() => {
        initializeProject("basic");
    });

    sliceClient
    .command('create <componentName>')
    .description('Create a new component')
    .option('-category <category>', 'Specify the category of the component')
    .option('-properties <properties>', 'Specify properties for the component (comma-separated)')
    .option('-methods <methods>', 'Specify methods for the component (comma-separated)')
    .action((componentName, options) => {
        const { Category, Properties, Methods } = options;
        const propertiesList = Properties ? Properties.split(',') : [];
        const methodsList = Methods ? Methods.split(',') : [];
       if( createComponent(componentName, Category, propertiesList, methodsList))    listComponents();   
    });

// Comando para modificar un componente
sliceClient
    .command('modify <componentName>')
    .description('Modify an existing component')
    .option('-category <category>', 'Component category')
    .option('-add <addProperties>', 'Add Properties to the component (comma-separated)')
    .option('-remove <removeProperties>', 'Remove Properties from the component (comma-separated)')
    .action((componentName, options) => {
        const { Add, Remove,Category } = options;
        const addProperties = Add ? Add.split(',') : [];
        const removeProperties = Remove ? Remove.split(',') : [];
        modifyComponent(componentName,Category, addProperties, removeProperties)
    });

    sliceClient.command('delete <componentName>')
    .description('Delete an existing component')
    .option('-category <category>', 'Component category')
    .action((componentName, options) => {
        const { Category } = options;
        if(deleteComponent(componentName, Category))    listComponents();
    });

// Comando para listar todos los componentes
sliceClient
    .command('list')
    .description('List all components')
    .action(() => {
        listComponents();
    });

sliceClient.parse(process.argv);