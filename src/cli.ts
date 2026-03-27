#!/usr/bin/env node
import { Command } from 'commander';
import { lint } from './index';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require('../package.json') as { version: string };

const program = new Command();

interface CliOptions {
  kongPlugins?: string;
  junit?: string;
  fix?: boolean;
  serviceName?: string;
  systemId?: string;
}

program
  .name('api-linter')
  .description('Lint OpenAPI specs with Spectral rules and optional Kong plugins validation')
  .version(pkg.version)
  .argument('<openapi>', 'Path to the OpenAPI spec file')
  .option('--kong-plugins <file>', 'Path to Kong plugins YAML file for operationId coverage check')
  .option('--fix', 'Add missing operationId entries to the Kong plugins file using the ACL plugin template')
  .option('--service-name <name>', 'Kong service name used when generating missing ACL plugin entries')
  .option('--system-id <id>', 'System ID used when generating missing ACL plugin entries')
  .option('--junit <file>', 'Write results to a JUnit XML file')
  .action(async (openapi: string, options: CliOptions) => {
    if (options.fix && !options.kongPlugins) {
      console.error('Error: --fix requires --kong-plugins');
      process.exit(2);
    }
    if (options.fix && (!options.serviceName || !options.systemId)) {
      console.error('Error: --fix requires --service-name and --system-id');
      process.exit(2);
    }
    try {
      const { hasErrors } = await lint(openapi, {
        kongPlugins: options.kongPlugins,
        junit: options.junit,
        fix: options.fix,
        serviceName: options.serviceName,
        systemId: options.systemId,
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
