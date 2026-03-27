'use strict';

const { Spectral, Document } = require('@stoplight/spectral-core');
const { Yaml, Json } = require('@stoplight/spectral-parsers');
const path = require('path');
const fs = require('fs');
const ruleset = require('./ruleset');

async function runSpectral(openapiPath) {
  const absolutePath = path.resolve(openapiPath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (err) {
    throw new Error(`Cannot read OpenAPI file "${openapiPath}": ${err.message}`);
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const parser = ext === '.json' ? Json : Yaml;

  const document = new Document(content, parser, absolutePath);
  const spectral = new Spectral();
  spectral.setRuleset(ruleset);

  return spectral.run(document);
}

module.exports = { runSpectral };
