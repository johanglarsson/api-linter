#!/usr/bin/env node
import { Command } from 'commander';
import { lint } from './index';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const program = new Command();

program
  .name('api-linter')
  .description('Lint OpenAPI specs with Spectral rules and optional Kong plugins validation')
  .version(pkg.version)
  .argument('<openapi>', 'Path to the OpenAPI spec file')
  .option('--kong-plugins <file>', 'Path to Kong plugins YAML file for operationId coverage check')
  .option('--junit <file>', 'Write results to a JUnit XML file')
  .action(async (openapi: string, options: { kongPlugins?: string; junit?: string }) => {
    try {
      const { hasErrors } = await lint(openapi, {
        kongPlugins: options.kongPlugins,
        junit: options.junit,
      });
      process.exit(hasErrors ? 1 : 0);
    } catch (err) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(2);
    }
  });

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  process.exit(2);
});
