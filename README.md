# api-linter

OpenAPI linter with [Spectral](https://stoplight.io/open-source/spectral) rules and optional Kong plugins validation.

## Installation

```bash
npm install
npm run build
```

To use the CLI globally:

```bash
npm link
```

## CLI usage

```bash
api-linter <openapi> [options]
```

### Options

| Flag | Description |
|------|-------------|
| `--kong-plugins <file>` | Validate that every `operationId` in the spec exists as a top-level key in the Kong plugins YAML file |
| `--fix` | Generate missing ACL plugin entries in the Kong plugins file (requires `--kong-plugins`, `--service-name`, `--system-id`) |
| `--service-name <name>` | Kong service name used when generating ACL plugin entries |
| `--system-id <id>` | System ID used when generating ACL plugin entries |
| `--junit <file>` | Write results to a JUnit XML file |
| `--version` | Show version |
| `--help` | Show help |

### Examples

```bash
# Spectral lint only
api-linter openapi.yaml

# Lint + check Kong plugins coverage
api-linter --kong-plugins plugins.yaml openapi.yaml

# Lint + check + write JUnit XML for CI
api-linter --kong-plugins plugins.yaml --junit results.xml openapi.yaml

# Lint + fix missing Kong plugin entries
api-linter --kong-plugins plugins.yaml --fix --service-name myservice --system-id mysystem openapi.yaml
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | All checks passed (warnings are allowed) |
| `1` | Lint errors or missing Kong plugin coverage |
| `2` | Operational error (file not found, invalid YAML, missing required flags) |

## Kong plugins file format

The plugins file maps each `operationId` to a list of Kong plugin objects:

```yaml
get-items:
  - name: rate-limiting
    config:
      minute: 100

post-items:
  - name: key-auth
```

When `--kong-plugins` is given, the linter checks that every `operationId` in the OpenAPI spec has a corresponding top-level key in this file.

## `--fix`: generating missing entries

When an `operationId` is missing from the plugins file, `--fix` appends an ACL plugin block for it:

```yaml
get-items:
  - name: acl
    config:
      allow:
        - consumer_group
        - myservice_get-items_group
      hide_groups_header: true
    instance_name: mysystem_myservice_get-items-_acl
    route: myservice__get-items
```

Existing entries are never overwritten. If the plugins file does not exist it is created.

## Spectral rules

Inherits all [OAS recommended rules](https://docs.stoplight.io/docs/spectral/4декабря-oas-rules) plus two custom rules:

| Rule | Severity | Description |
|------|----------|-------------|
| `operation-id-kebab-case` | warn | `operationId` must be kebab-case (e.g. `get-items`) |
| `operation-must-have-description` | warn | Every operation must have a `description` field |

## Programmatic API

```ts
import { lint } from 'api-linter';

const { hasErrors, spectralResults, kongIssues, fixedCount } = await lint('openapi.yaml', {
  kongPlugins: 'plugins.yaml',   // optional
  fix: true,                     // optional
  serviceName: 'myservice',      // required with fix
  systemId: 'mysystem',          // required with fix
  junit: 'results.xml',          // optional
});
```

### Types

```ts
interface LintOptions {
  kongPlugins?: string;
  fix?: boolean;
  serviceName?: string;
  systemId?: string;
  junit?: string;
}

interface LintResult {
  hasErrors: boolean;
  spectralResults: ISpectralDiagnostic[];
  kongIssues: KongIssue[];   // empty after a successful --fix
  fixedCount: number;
}

interface KongIssue {
  operationId: string;
  path: string;
  method: string;
  message: string;
}
```

## Development

```bash
npm install        # install dependencies
npm run build      # compile TypeScript → dist/
npm test           # tsc + jest
```
