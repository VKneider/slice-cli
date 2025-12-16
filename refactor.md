# Plan de Refactorización del CLI para MCP

## Objetivo
Separar la lógica de negocio de la presentación CLI para permitir importación directa desde el MCP server, manteniendo **100% de compatibilidad** con el CLI actual.

---

## Estructura Propuesta

```
commands/
├── createComponent/
│   ├── createComponent.js        # CLI wrapper (presentación)
│   ├── core.js                   # ⭐ NUEVO - Lógica pura exportable
│   └── VisualComponentTemplate.js
│
├── listComponents/
│   ├── listComponents.js         # CLI wrapper (presentación)
│   └── core.js                   # ⭐ NUEVO - Lógica pura exportable
│
├── deleteComponent/
│   ├── deleteComponent.js        # CLI wrapper (presentación)
│   └── core.js                   # ⭐ NUEVO - Lógica pura exportable
│
├── getComponent/
│   ├── getComponent.js           # CLI wrapper (presentación)
│   └── core.js                   # ⭐ NUEVO - Lógica pura exportable
│
└── init/
    ├── init.js                   # CLI wrapper (presentación)
    └── core.js                   # ⭐ NUEVO - Lógica pura exportable
```

---

## Principios de Refactorización

### 1. Separación de Responsabilidades
- **core.js**: Lógica pura sin dependencias de CLI (Print, chalk, Table, inquirer)
- **[comando].js**: Solo presentación CLI, usa funciones del core

### 2. Funciones Puras en Core
- Reciben parámetros explícitos (no usan import.meta.url implícitamente)
- Retornan objetos con estructura `{ success: boolean, data?, error? }`
- No imprimen a consola directamente
- Son agnósticas del entorno (CLI vs MCP)

### 3. Compatibilidad Total
- Los archivos CLI actuales se mantienen funcionales
- Misma API de comandos
- Mismo comportamiento observable
- No romper ningún test existente

---

## Pasos de Refactorización por Comando

### Fase 1: List Components

#### Paso 1.1: Análisis del Código Actual
- Identificar toda la lógica de negocio en `listComponents.js`
- Separar mentalmente: lógica vs presentación
- Funciones a extraer: `loadConfig`, `getComponents`, `countComponentFiles`, `listComponentDirectories`

#### Paso 1.2: Crear core.js
- Crear archivo `commands/listComponents/core.js`
- Extraer funciones de lógica pura
- Modificar para que acepten `projectPath` como parámetro opcional
- Retornar objetos estructurados en lugar de imprimir

#### Paso 1.3: Adaptar listComponents.js
- Importar funciones desde `core.js`
- Mantener solo la lógica de presentación (Print, Table, chalk)
- Re-exportar funciones del core: `export { getComponents, ... } from './core.js'`

#### Paso 1.4: Verificación
- Ejecutar `slice list` - debe funcionar idéntico
- Probar importación directa: `import { getComponents } from './commands/listComponents/core.js'`
- Verificar que retorna datos correctos sin CLI

---

### Fase 2: Create Component

#### Paso 2.1: Análisis
- Identificar lógica: validaciones, generación de templates, creación de archivos
- Identificar presentación: mensajes de error, comandos de ejemplo

#### Paso 2.2: Crear core.js
- Crear `commands/createComponent/core.js`
- Extraer: `validateComponentName`, `validateCategory`, `generateTemplate`, `createComponentFiles`
- Cada función retorna `{ success, data, error }`

#### Paso 2.3: Adaptar createComponent.js
- Importar funciones del core
- Mantener solo los Print y mensajes de ayuda
- Re-exportar funciones del core

#### Paso 2.4: Verificación
- Ejecutar `slice component create` - debe funcionar igual
- Probar importación directa y creación programática

---

### Fase 3: Delete Component

#### Paso 3.1: Análisis
- Identificar lógica: validaciones, verificación de existencia, eliminación de archivos
- Identificar presentación: mensajes de confirmación, errores

#### Paso 3.2: Crear core.js
- Crear `commands/deleteComponent/core.js`
- Extraer: `deleteComponentFiles` (con validaciones integradas)

#### Paso 3.3: Adaptar deleteComponent.js
- Importar del core
- Mantener presentación CLI
- Re-exportar funciones

#### Paso 3.4: Verificación
- Ejecutar `slice component delete`
- Verificar funcionamiento idéntico

---

### Fase 4: Get Component (Registry)

#### Paso 4.1: Análisis
- Identificar lógica: descarga de registry, instalación de componentes, actualización
- Es el más complejo - tiene clase ComponentRegistry

#### Paso 4.2: Crear core.js
- Crear `commands/getComponent/core.js`
- Extraer clase `ComponentRegistry` limpia (sin inquirer, sin Print)
- Métodos retornan objetos estructurados

#### Paso 4.3: Adaptar getComponent.js
- Importar ComponentRegistry del core
- Envolver con lógica interactiva (inquirer) solo en CLI
- Mantener funciones: `getComponents`, `listComponents`, `syncComponents`

#### Paso 4.4: Verificación
- Probar: `slice get Button`, `slice browse`, `slice sync`
- Verificar descarga y registro correctos

---

### Fase 5: Init Project

#### Paso 5.1: Análisis
- Identificar lógica: copia de estructuras, configuración de package.json
- Separar spinners y mensajes visuales

#### Paso 5.2: Crear core.js
- Crear `commands/init/core.js`
- Extraer: funciones de scaffolding, configuración

#### Paso 5.3: Adaptar init.js
- Importar del core
- Mantener spinners y presentación
- Re-exportar funciones

#### Paso 5.4: Verificación
- Ejecutar `slice init` en proyecto nuevo
- Verificar estructura completa creada

---

## Patrón de Estructura de Funciones Core

### Firma de Función Estándar
```
function operationName({ param1, param2, projectPath = null }) {
    // Validaciones
    // Lógica de negocio
    return { success: boolean, data?, error? }
}
```

### Objeto de Retorno Estándar
```javascript
// Éxito
{
    success: true,
    data: { ... },
    // Campos adicionales específicos
}

// Error
{
    success: false,
    error: "mensaje descriptivo"
}
```

---

## Estrategia de Dependencias

### Dependencias Permitidas en core.js
- ✅ `fs`, `fs-extra`
- ✅ `path`
- ✅ `Validations.js` (lógica pura)
- ✅ Helpers de PathHelper (refactorizar para aceptar projectPath)

### Dependencias NO Permitidas en core.js
- ❌ `Print.js` (específico de CLI)
- ❌ `chalk` (presentación)
- ❌ `cli-table3` (presentación)
- ❌ `inquirer` (interacción CLI)
- ❌ `ora` (spinners CLI)

---

## Refactorización de PathHelper

### Problema Actual
PathHelper usa `import.meta.url` internamente, asumiendo que se llama desde dentro del CLI

### Solución
Crear versiones alternativas que acepten `projectPath`:

```
// Versión CLI (actual)
getSrcPath(import.meta.url, ...paths)

// Versión core (nueva)
getProjectSrcPath(projectPath, ...paths)
```

O mejor: modificar funciones existentes para aceptar ambos modos:
```
getSrcPath(importMetaUrlOrProjectPath, ...paths)
```

---

## Testing de la Refactorización

### Test 1: CLI Functionality
Para cada comando refactorizado:
- Ejecutar comando CLI
- Verificar output idéntico al anterior
- Verificar archivos creados/modificados

### Test 2: Importación Directa
```javascript
// test-mcp-import.js
import { getComponents } from './commands/listComponents/core.js';

const result = getComponents('/ruta/proyecto');
console.log(result); // Debe retornar objeto con componentes
```

### Test 3: Sin Dependencias CLI
Verificar que core.js no tiene imports de Print, chalk, etc:
```bash
grep -r "from.*Print" commands/*/core.js  # debe estar vacío
grep -r "from.*chalk" commands/*/core.js  # debe estar vacío
```

---

## Orden de Implementación Recomendado

1. **listComponents** (más simple, establece patrón)
2. **createComponent** (complejidad media)
3. **deleteComponent** (similar a create)
4. **getComponent** (más complejo, tiene clase)
5. **init** (el más complejo)

