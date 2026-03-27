import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { KongIssue } from './types';

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'delete',
  'patch',
  'options',
  'head',
  'trace',
] as const;

interface OpenApiOperation {
  operationId?: string;
  [key: string]: unknown;
}

interface OpenApiPathItem {
  [method: string]: OpenApiOperation | unknown;
}

interface OpenApiSpec {
  paths?: Record<string, OpenApiPathItem>;
  [key: string]: unknown;
}

function collectOperations(
  openapiPath: string
): Array<{ operationId: string; path: string; method: string }> {
  const absolutePath = path.resolve(openapiPath);
  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (err) {
    throw new Error(
      `Cannot read OpenAPI file "${openapiPath}": ${(err as NodeJS.ErrnoException).message}`
    );
  }

  const parsed = yaml.load(content) as OpenApiSpec | null;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`OpenAPI file "${openapiPath}" is empty or not a valid YAML mapping`);
  }

  const operations: Array<{ operationId: string; path: string; method: string }> = [];
  const paths = parsed.paths ?? {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const operation = (pathItem as OpenApiPathItem)[method];
      if (!operation || typeof operation !== 'object') continue;
      const op = operation as OpenApiOperation;
      if (typeof op.operationId === 'string') {
        operations.push({ operationId: op.operationId, path: pathKey, method });
      }
    }
  }
  return operations;
}

export async function runKongCheck(
  openapiPath: string,
  pluginsPath: string
): Promise<KongIssue[]> {
  const operations = collectOperations(openapiPath);

  const absolutePluginsPath = path.resolve(pluginsPath);
  let pluginsContent: string;
  try {
    pluginsContent = fs.readFileSync(absolutePluginsPath, 'utf8');
  } catch (err) {
    throw new Error(
      `Cannot read Kong plugins file "${pluginsPath}": ${(err as NodeJS.ErrnoException).message}`
    );
  }

  const pluginsMap = yaml.load(pluginsContent);
  if (!pluginsMap || typeof pluginsMap !== 'object' || Array.isArray(pluginsMap)) {
    throw new Error(
      `Kong plugins file "${pluginsPath}" is empty or not a valid YAML mapping`
    );
  }

  const pluginKeys = new Set(Object.keys(pluginsMap as object));
  const issues: KongIssue[] = [];
  for (const { operationId, path: opPath, method } of operations) {
    if (!pluginKeys.has(operationId)) {
      issues.push({
        operationId,
        path: opPath,
        method,
        message: `operationId "${operationId}" is not present as a top-level key in ${pluginsPath}`,
      });
    }
  }
  return issues;
}
