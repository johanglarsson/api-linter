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

interface KongPluginEntry {
  route?: string;
  [key: string]: unknown;
}

interface KongPluginsFile {
  _format_version?: string;
  plugins?: KongPluginEntry[];
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

  const parsed = yaml.load(pluginsContent) as KongPluginsFile | null;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`Kong plugins file "${pluginsPath}" is empty or not a valid YAML mapping`);
  }

  // Build set of route values from the plugins array
  const routes = new Set(
    (parsed.plugins ?? [])
      .map((p) => p.route)
      .filter((r): r is string => typeof r === 'string')
  );

  // An operationId is covered when a route ends with _${operationId}
  // (format: ${serviceName}_${operationId})
  const isCovered = (operationId: string): boolean =>
    [...routes].some((route) => route === operationId || route.endsWith(`_${operationId}`));

  const issues: KongIssue[] = [];
  for (const { operationId, path: opPath, method } of operations) {
    if (!isCovered(operationId)) {
      issues.push({
        operationId,
        path: opPath,
        method,
        message: `operationId "${operationId}" has no ACL plugin entry in ${pluginsPath}`,
      });
    }
  }
  return issues;
}
