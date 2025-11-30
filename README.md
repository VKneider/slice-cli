# Slice.js CLI

Command-line interface for developing web applications with the Slice.js framework.

## Installation

### Local Installation (Recommended)

```bash
npm install slicejs-cli --save-dev
```

### Global Installation

```bash
npm install -g slicejs-cli
```

## Usage

After installation, you can use the `slice` command directly:

```bash
slice [command] [options]
```

Or with npx (no installation required):

```bash
npx slicejs-cli [command]
```

## Commands

### Project Initialization

```bash
slice init
```

Initializes a new Slice.js project with the complete framework structure.

### Development Server

```bash
# Start development server on default port (3000)
slice dev

# Start on custom port
slice dev -p 8080

# Alternative command (same as dev)
slice start
slice start -p 8080
```

### Component Management (Local)

```bash
# Create a new component (interactive)
slice component create

# List all local components
slice component list

# Delete a component (interactive)
slice component delete
```

**Shortcuts:**
```bash
slice component create → slice comp create
slice component list   → slice comp ls
slice component delete → slice comp remove
```

### Component Registry (Official Repository)

```bash
# Install components from official repository
slice get Button Card Input

# Install service component
slice get FetchManager --service

# Force overwrite existing components
slice get Button --force

# Browse available components
slice browse

# Update all local components to latest versions
slice sync

# Force update without confirmation
slice sync --force
```

**Shortcuts:**
```bash
slice registry get Button → slice get Button
slice registry list       → slice browse
slice registry sync       → slice sync
```

### Utilities

```bash
# Show version information
slice version
slice -v

# Check for available updates
slice update

# Show help
slice --help
slice [command] --help
```

## NPM Scripts

When you install `slicejs-cli`, the following scripts are automatically added to your project's `package.json`:

### Recommended (New)

```json
{
  "scripts": {
    "dev": "slice dev",
    "start": "slice start",
    "get": "slice get",
    "browse": "slice browse",
    "sync": "slice sync",
    "component:create": "slice component create",
    "component:list": "slice component list",
    "component:delete": "slice component delete"
  }
}
```

Usage:
```bash
npm run dev
npm run get
npm run browse
```

### Legacy (Still Supported)

```json
{
  "scripts": {
    "slice:dev": "slice dev",
    "slice:start": "slice start",
    "slice:get": "slice get"
  }
}
```

## Quick Start

```bash
# 1. Create a new project directory
mkdir my-slice-project
cd my-slice-project

# 2. Initialize npm and install Slice CLI
npm init -y
npm install slicejs-cli --save-dev

# 3. Initialize Slice.js project
slice init

# 4. Start development server
slice dev

# 5. Open browser at http://localhost:3000
```

## Common Workflows

### Starting a New Project

```bash
slice init
slice dev
```

### Adding Components

```bash
# Browse available components
slice browse

# Install specific components
slice get Button Card Input

# Create custom component
slice component create
```

### Keeping Components Updated

```bash
# Check what needs updating
slice browse

# Update all components
slice sync
```

## Development Mode

The development server (`slice dev` or `slice start`) provides:

- ✅ Hot reload for instant changes
- ✅ Serves files directly from `/src`
- ✅ No build step required
- ✅ Port validation
- ✅ Clear error messages

## Requirements

- Node.js >= 20.0.0
- npm or yarn

## Configuration

Project configuration is stored in `src/sliceConfig.json`, created automatically during `slice init`.

## Features

- 🚀 Fast development server with hot reload
- 📦 Component registry for sharing components
- 🎨 Visual and Service component types
- ✨ Interactive component creation
- 🔄 Automatic component synchronization
- 🛠️ Built-in validation and error handling
- 📝 Clear, actionable error messages

## Troubleshooting

### Port Already in Use

```bash
# Use a different port
slice dev -p 8080
```

### Project Not Initialized

```bash
# Make sure to run init first
slice init
```

### Command Not Found

```bash
# Use npx if not installed globally
npx slicejs-cli dev

# Or install globally
npm install -g slicejs-cli
```

## Links

- 📘 Documentation: https://slice-js-docs.vercel.app/
- 🐙 GitHub: https://github.com/VKneider/slice-cli
- 📦 npm: https://www.npmjs.com/package/slicejs-cli

## License

ISC

## Author

vkneider
