'use strict';

const { runSpectral } = require('./spectral-linter');
const { runKongCheck } = require('./kong-linter');
const { printResults, writeJunit } = require('./reporter');

async function lint(openapiPath, options = {}) {
  const spectralResults = await runSpectral(openapiPath);
  const kongIssues = options.kongPlugins
    ? await runKongCheck(openapiPath, options.kongPlugins)
    : [];

  const { hasErrors } = printResults(spectralResults, kongIssues, {
    openapiPath,
    pluginsPath: options.kongPlugins || '',
  });

  if (options.junit) {
    writeJunit(spectralResults, kongIssues, options.junit, {
      includeKong: !!options.kongPlugins,
    });
  }

  return { hasErrors, spectralResults, kongIssues };
}

module.exports = { lint };
