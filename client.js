#!/usr/bin/env node
import { program } from "commander";
import inquirer from "inquirer";
import initializeProject from "./commands/init/init.js";
import createComponent from "./commands/createComponent/createComponent.js";
import listComponents from "./commands/listComponents/listComponents.js";
import deleteComponent from "./commands/deleteComponent/deleteComponent.js";
import getComponent, { listComponents as listRemoteComponents, syncComponents } from "./commands/getComponent/getComponent.js";
import versionChecker from "./commands/utils/versionChecker.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import validations from "./commands/Validations.js";
import Print from "./commands/Print.js";

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

// Function to run version check for all commands
async function runWithVersionCheck(commandFunction, ...args) {
  // Run the command first
  const result = await commandFunction(...args);
  
  // Then check for updates (non-blocking)
  setTimeout(() => {
    versionChecker.checkForUpdates(false);
  }, 100);
  
  return result;
}

const sliceClient = program;

sliceClient.version("2.1.0").description("CLI for managing Slice.js framework components");

// INIT COMMAND
sliceClient
  .command("init")
  .description("Initialize a new Slice.js project")
  .action(async () => {
    await runWithVersionCheck(() => {
      initializeProject();
      return Promise.resolve();
    });
  });

// VERSION COMMAND
sliceClient
  .command("version")
  .alias("v")
  .description("Show version information and check for updates")
  .action(async () => {
    await versionChecker.showVersionInfo();
  });

// COMPONENT COMMAND GROUP - For local component management
const componentCommand = sliceClient.command("component").alias("comp").description("Manage local project components");

// CREATE LOCAL COMPONENT
componentCommand
  .command("create")
  .alias("new")
  .description("Create a new component in your local project")
  .action(async () => {
    await runWithVersionCheck(async () => {
      const categories = getCategories();
      if (categories.length === 0) {
        Print.error("No categories available. Check your configuration.");
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
              message: "Enter the properties (comma separated):"
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
  });

// LIST LOCAL COMPONENTS
componentCommand
  .command("list")
  .alias("ls")
  .description("List all components in your local project")
  .action(async () => {
    await runWithVersionCheck(() => {
      listComponents();
      return Promise.resolve();
    });
  });

// DELETE LOCAL COMPONENT
componentCommand
  .command("delete")
  .alias("remove")
  .description("Delete a component from your local project")
  .action(async () => {
    await runWithVersionCheck(async () => {
      const categories = getCategories();
      if (categories.length === 0) {
        Print.error("No categories available. Check your configuration.");
        return;
      }

      deleteComponent();
    });
  });

// REGISTRY COMMAND GROUP - For component registry operations
const registryCommand = sliceClient.command("registry").alias("reg").description("Manage components from official Slice.js repository");

// GET COMPONENTS FROM REGISTRY
registryCommand
  .command("get [components...]")
  .description("Download and install components from official repository")
  .option("-f, --force", "Force overwrite existing components")
  .option("-s, --service", "Install Service components instead of Visual")
  .action(async (components, options) => {
    await runWithVersionCheck(async () => {
      await getComponent(components, {
        force: options.force,
        service: options.service
      });
    });
  });

// LIST REGISTRY COMPONENTS
registryCommand
  .command("list")
  .alias("ls")
  .description("List all available components in the official repository")
  .action(async () => {
    await runWithVersionCheck(async () => {
      await listRemoteComponents();
    });
  });

// SYNC COMPONENTS FROM REGISTRY
registryCommand
  .command("sync")
  .description("Update all local components to latest versions from repository")
  .option("-f, --force", "Force update without confirmation")
  .action(async (options) => {
    await runWithVersionCheck(async () => {
      await syncComponents({
        force: options.force
      });
    });
  });

// SHORTCUTS - Top-level convenient commands
sliceClient
  .command("get [components...]")
  .description("🚀 Quick install components from registry (shortcut for registry get)")
  .option("-f, --force", "Force overwrite existing components")
  .option("-s, --service", "Install Service components instead of Visual")
  .action(async (components, options) => {
    await runWithVersionCheck(async () => {
      if (!components || components.length === 0) {
        Print.info("💡 Tip: Use 'slice registry list' to see available components");
        Print.info("📖 Usage examples:");
        console.log("   slice get Button Card Input");
        console.log("   slice get FetchManager --service");
        console.log("   slice registry list");
        return;
      }
      
      await getComponent(components, {
        force: options.force,
        service: options.service
      });
    });
  });

sliceClient
  .command("browse")
  .description("📚 Quick browse available components (shortcut for registry list)")
  .action(async () => {
    await runWithVersionCheck(async () => {
      await listRemoteComponents();
    });
  });

sliceClient
  .command("sync")
  .description("🔄 Quick sync local components (shortcut for registry sync)")
  .option("-f, --force", "Force update without confirmation")
  .action(async (options) => {
    await runWithVersionCheck(async () => {
      await syncComponents({
        force: options.force
      });
    });
  });

// UPDATE COMMAND
sliceClient
  .command("update")
  .alias("upgrade")
  .description("Check for and show available updates for CLI and framework")
  .action(async () => {
    Print.info("🔄 Checking for updates...");
    const updateInfo = await versionChecker.checkForUpdates(false);
    
    if (updateInfo) {
      if (updateInfo.cli.status === 'current' && updateInfo.framework.status === 'current') {
        Print.success("✅ All components are up to date!");
      }
    } else {
      Print.warning("⚠️  Could not check for updates. Please check your internet connection.");
    }
  });

// Enhanced help
sliceClient
  .option("--no-version-check", "Skip version check for this command")
  .configureHelp({
    sortSubcommands: true,
    subcommandTerm: (cmd) => cmd.name() + ' ' + cmd.usage()
  });

// Custom help
sliceClient.addHelpText('after', `
💡 Common Usage Examples:
  slice init                     - Initialize new Slice.js project
  slice get Button Card Input    - Install Visual components from registry  
  slice get FetchManager -s      - Install Service component from registry
  slice browse                   - Browse all available components
  slice sync                     - Update local components to latest versions
  slice component create         - Create new local component
  slice update                   - Check for CLI/framework updates

📚 Command Categories:
  • init, version, update        - Project setup and maintenance
  • get, browse, sync            - Quick registry shortcuts  
  • component <cmd>              - Local component management
  • registry <cmd>               - Official repository operations

🔗 More info: https://slice-js-docs.vercel.app/
`);

// Default action
if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse();