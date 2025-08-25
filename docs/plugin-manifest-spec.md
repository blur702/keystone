# Plugin Manifest Specification

This document defines the structure and requirements for a Keystone Plugin's `manifest.json` file. The manifest serves as the plugin's "ID card" and makes it self-describing to the platform.

## Overview

Every plugin must include a `manifest.json` file in its root directory. This file contains all the metadata necessary for the platform to discover, validate, install, and manage the plugin.

## Schema Version

Current schema version: `1.0`

## Required Structure

```json
{
  "schemaVersion": "1.0",
  "id": "unique-plugin-identifier",
  "name": "Human Readable Plugin Name",
  "version": "1.0.0",
  "description": "Brief description of what this plugin does",
  "author": {
    "name": "Author Name",
    "email": "author@example.com",
    "url": "https://authorwebsite.com"
  },
  "license": "MIT",
  "homepage": "https://plugin-homepage.com",
  "repository": {
    "type": "git",
    "url": "https://github.com/username/plugin-repo"
  },
  "keywords": ["tag1", "tag2", "category"],
  "category": "utility|business|integration|ui|data",
  "compatibility": {
    "platform": ">=1.0.0",
    "node": ">=18.0.0"
  },
  "dependencies": {
    "required": [],
    "optional": []
  },
  "permissions": [
    "resource:action",
    "users:read",
    "data:write"
  ],
  "entryPoints": {
    "backend": {
      "routes": "./routes/index.js",
      "services": "./services/index.js",
      "migrations": "./migrations/",
      "hooks": {
        "install": "./hooks/install.js",
        "uninstall": "./hooks/uninstall.js",
        "enable": "./hooks/enable.js",
        "disable": "./hooks/disable.js"
      }
    },
    "frontend": {
      "components": "./frontend/components/index.js",
      "pages": "./frontend/pages/index.js",
      "routes": "./frontend/routes.js"
    },
    "admin": {
      "pages": "./admin/pages/index.js",
      "components": "./admin/components/index.js",
      "settings": "./admin/settings.js"
    }
  },
  "configuration": {
    "schema": {
      "type": "object",
      "properties": {
        "apiKey": {
          "type": "string",
          "description": "API key for external service"
        },
        "enabled": {
          "type": "boolean",
          "default": true
        }
      },
      "required": ["apiKey"]
    },
    "ui": {
      "form": "./admin/config-form.js"
    }
  },
  "database": {
    "migrations": "./migrations/",
    "seeds": "./seeds/"
  },
  "assets": {
    "public": "./public/",
    "styles": "./styles/",
    "scripts": "./scripts/"
  },
  "events": {
    "listens": [
      "user.created",
      "data.updated"
    ],
    "emits": [
      "plugin.action_completed",
      "plugin.error_occurred"
    ]
  },
  "api": {
    "version": "1.0",
    "prefix": "/api/plugins/plugin-id",
    "documentation": "./docs/api.md"
  }
}
```

## Field Descriptions

### Core Information

- **schemaVersion** (string, required): Version of the manifest schema used
- **id** (string, required): Unique identifier for the plugin (kebab-case, 3-50 chars)
- **name** (string, required): Human-readable plugin name
- **version** (string, required): Plugin version following semantic versioning
- **description** (string, required): Brief description (max 200 characters)
- **author** (object, required): Author information
- **license** (string, required): License identifier (SPDX format)

### Metadata

- **homepage** (string, optional): Plugin homepage URL
- **repository** (object, optional): Source code repository information
- **keywords** (array, optional): Search keywords and tags
- **category** (string, required): Plugin category for organization

### Compatibility

- **compatibility** (object, required): Platform and runtime requirements
  - **platform**: Minimum Keystone platform version
  - **node**: Minimum Node.js version

### Dependencies

- **dependencies** (object, optional): Plugin dependencies
  - **required**: Array of required plugin IDs
  - **optional**: Array of optional plugin IDs that enhance functionality

### Permissions

- **permissions** (array, required): List of permissions the plugin requires
  - Format: `"resource:action"` (e.g., `"users:read"`, `"data:write"`)
  - Used for RBAC integration

### Entry Points

- **entryPoints** (object, required): Code entry points for different components
  - **backend**: Server-side entry points
    - **routes**: API route definitions
    - **services**: Service implementations
    - **migrations**: Database migration files
    - **hooks**: Lifecycle hooks
  - **frontend**: Client-side entry points
  - **admin**: Admin interface entry points

### Configuration

- **configuration** (object, optional): Plugin configuration schema
  - **schema**: JSON Schema for validation
  - **ui**: Custom configuration UI components

### Database

- **database** (object, optional): Database-related files
  - **migrations**: SQL migration files
  - **seeds**: Database seed files

### Assets

- **assets** (object, optional): Static assets
  - **public**: Public files (images, etc.)
  - **styles**: CSS/SCSS files
  - **scripts**: Client-side JavaScript

### Events

- **events** (object, optional): Event system integration
  - **listens**: Events the plugin listens for
  - **emits**: Events the plugin can emit

### API

- **api** (object, optional): API-specific metadata
  - **version**: API version
  - **prefix**: URL prefix for plugin routes
  - **documentation**: API documentation file

## Categories

Valid plugin categories:

- **utility**: General utility functions
- **business**: Business logic and workflows
- **integration**: External service integrations
- **ui**: User interface enhancements
- **data**: Data processing and analytics
- **security**: Security and authentication
- **monitoring**: Logging and monitoring
- **communication**: Email, notifications, messaging

## Permission Format

Permissions follow the format: `resource:action`

### Standard Resources
- **users**: User management
- **roles**: Role management
- **plugins**: Plugin management
- **data**: Generic data access
- **files**: File operations
- **settings**: System settings

### Standard Actions
- **create**: Create new resources
- **read**: Read/view resources
- **update**: Update existing resources
- **delete**: Delete resources
- **manage**: Full management (all CRUD operations)
- **execute**: Execute operations/commands

### Examples
```json
[
  "users:read",
  "users:manage",
  "data:create",
  "data:read",
  "files:upload",
  "settings:update"
]
```

## Lifecycle Hooks

Plugins can define hooks that run during lifecycle events:

- **install**: Run when plugin is first installed
- **uninstall**: Run when plugin is being removed
- **enable**: Run when plugin is enabled
- **disable**: Run when plugin is disabled
- **update**: Run when plugin is updated

## Validation Rules

### ID Requirements
- Must be unique across all plugins
- 3-50 characters
- Only lowercase letters, numbers, and hyphens
- Must start with a letter
- Cannot end with a hyphen

### Version Requirements
- Must follow semantic versioning (major.minor.patch)
- Pre-release and build metadata allowed

### File Path Requirements
- All paths must be relative to plugin root
- Must use forward slashes
- Cannot contain `..` or absolute paths

## Example Manifest

```json
{
  "schemaVersion": "1.0",
  "id": "address-validator",
  "name": "Address Validator",
  "version": "1.2.0",
  "description": "Validates and standardizes postal addresses using multiple providers",
  "author": {
    "name": "Keystone Team",
    "email": "plugins@kevinalthaus.com"
  },
  "license": "MIT",
  "category": "utility",
  "compatibility": {
    "platform": ">=1.0.0",
    "node": ">=18.0.0"
  },
  "keywords": ["address", "validation", "postal", "geocoding"],
  "permissions": [
    "data:read",
    "data:write",
    "external-api:access"
  ],
  "entryPoints": {
    "backend": {
      "routes": "./routes/validator.js",
      "services": "./services/AddressService.js"
    },
    "frontend": {
      "components": "./components/AddressValidator.jsx"
    },
    "admin": {
      "pages": "./admin/ValidatorSettings.jsx"
    }
  },
  "configuration": {
    "schema": {
      "type": "object",
      "properties": {
        "provider": {
          "type": "string",
          "enum": ["google", "here", "mapbox"],
          "default": "google"
        },
        "apiKey": {
          "type": "string",
          "description": "API key for the selected provider"
        }
      },
      "required": ["apiKey"]
    }
  },
  "events": {
    "emits": [
      "address.validated",
      "address.validation_failed"
    ]
  },
  "api": {
    "version": "1.0",
    "prefix": "/api/plugins/address-validator"
  }
}
```

## Best Practices

1. **Keep it minimal**: Only include necessary permissions and dependencies
2. **Use descriptive names**: Make IDs and names clear and meaningful
3. **Document thoroughly**: Provide clear descriptions and documentation
4. **Version properly**: Follow semantic versioning for updates
5. **Test compatibility**: Ensure compatibility requirements are accurate
6. **Organize logically**: Group related functionality in the entry points
7. **Follow conventions**: Use established patterns for file organization

## Validation Process

The platform validates manifests during plugin discovery:

1. **Schema validation**: Ensures all required fields are present and correctly typed
2. **ID uniqueness**: Verifies the plugin ID is not already in use
3. **Version validity**: Checks version format and compatibility
4. **File existence**: Verifies all referenced files exist
5. **Permission validity**: Ensures all permissions are valid format
6. **Dependency resolution**: Checks that dependencies are available

## Migration Guide

When the manifest schema is updated, plugins may need to be updated:

### From Schema 1.0 to Future Versions
Migration guides will be provided as the schema evolves.

## References

- [Plugin Development Guide](plugin-development.md)
- [Permission System Documentation](permissions.md)
- [Event System Documentation](events.md)
- [API Development Guidelines](api-guidelines.md)