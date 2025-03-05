#!/usr/bin/env node
import { program } from "commander";
import inquirer from "inquirer";
import initializeProject from "./commands/init/init.js";
import createComponent from "./commands/createComponent/createComponent.js";
import listComponents from "./commands/listComponents/listComponents.js";
import deleteComponent from "./commands/deleteComponent/deleteComponent.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import validations from "./commands/Validations.js";


const __dirname = path.dirname(fileURLToPath(import.meta.url));

const loadConfig = () => {
  try {
    const configPath = path.join(__dirname, "../../src/sliceConfig.json");
    const rawData = fs.readFileSync(configPath, "utf-8");
    return JSON.parse(rawData);
  } catch (error) {
    console.error(`Error loading configuration: ${error.message}`);
    return null;
  }
};

const getCategories = () => {
  const config = loadConfig();
  return config && config.paths?.components ? Object.keys(config.paths.components) : [];
};

const sliceClient = program;

sliceClient.version("1.0.0").description("CLI for managing framework components");


// INIT COMMAND
sliceClient
  .command("init")
  .description("Initialize the project")
  .action(() => {
    initializeProject("basic");
  });

// COMPONENT COMMAND GROUP
const componentCommand = sliceClient.command("component").description("Manage components");

// CREATE COMPONENT
componentCommand
  .command("create")
  .description("Create a new component")
  .action(async () => {
    const categories = getCategories();
    if (categories.length === 0) {
      console.error("No categories available. Check your configuration.");
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "componentName",
        message: "Enter the component name:",
        validate: (input) => (input ? true : "Component name cannot be empty"),
      },
      {
        type: "list",
        name: "category",
        message: "Select the component category:",
        choices: categories,
      }])

      if(validations.getCategoryType(answers.category)==='Visual'){
        const properties = await inquirer.prompt([
          {
            type: "input",
            name: "properties",
            message: "Enter the properties (comma separated):",
            validate: (input) => (input ? true : "Properties cannot be empty"),
          },
        ]);
        answers.properties = properties.properties.split(",").map((prop) => prop.trim());
      } else {
        answers.properties = [];
      }
    
    if (createComponent(answers.componentName, answers.category, answers.properties)) {
      listComponents();
    }
  });


// DELETE COMPONENT
componentCommand
  .command("delete")
  .description("Delete an existing component")
  .action(async () => {
    const categories = getCategories();
    if (categories.length === 0) {
      console.error("No categories available. Check your configuration.");
      return;
    }

    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "componentName",
        message: "Enter the component name to delete:",
        validate: (input) => (input ? true : "Component name cannot be empty"),
      },
      {
        type: "list",
        name: "category",
        message: "Select the component category:",
        choices: categories,
      },
    ]);

    const confirm = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmation",
        message: `Are you sure you want to delete ${answers.componentName}?`,
      },
    ]);

    if (!confirm.confirmation) {
      
      return;
    }
    

    if (deleteComponent(answers.componentName, answers.category)) {
      listComponents();
    }


  });

// LIST COMPONENTS
componentCommand
  .command("list")
  .description("List all components")
  .action(() => {
    listComponents();
  });

sliceClient.parse(process.argv);
