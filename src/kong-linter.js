'use strict';

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace'];

function collectOperations(openapiPath) {
  const absolutePath = path.resolve(openapiPath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read OpenAPI file "${openapiPath}": ${err.message}`);
  }

  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error(`OpenAPI file "${openapiPath}" is empty or not a valid YAML mapping`);
  }

  const operations = [];
  const paths = parsed.paths || {};
  for (const [pathKey, pathItem] of Object.entries(paths)) {
    if (!pathItem || typeof pathItem !== 'object') continue;
    for (const method of HTTP_METHODS) {
      const operation = pathItem[method];
      if (!operation || typeof operation !== 'object') continue;
      if (typeof operation.operationId === 'string') {
        operations.push({ operationId: operation.operationId, path: pathKey, method });
      }
    }
  }
  return operations;
}

async function runKongCheck(openapiPath, pluginsPath) {
  const operations = collectOperations(openapiPath);

  const absolutePluginsPath = path.resolve(pluginsPath);
  let pluginsContent;
  try {
    pluginsContent = fs.readFileSync(absolutePluginsPath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read Kong plugins file "${pluginsPath}": ${err.message}`);
  }

  const pluginsMap = yaml.load(pluginsContent);
  if (!pluginsMap || typeof pluginsMap !== 'object' || Array.isArray(pluginsMap)) {
    throw new Error(
      `Kong plugins file "${pluginsPath}" is empty or not a valid YAML mapping`
    );
  }

  const pluginKeys = new Set(Object.keys(pluginsMap));
  const issues = [];
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

module.exports = { runKongCheck };
