import { runSpectral } from './spectral-linter';
import { runKongCheck } from './kong-linter';
import { fixKongPlugins } from './kong-fixer';
import { printResults, writeJunit } from './reporter';
import type { LintOptions, LintResult } from './types';

export type { KongIssue, LintOptions, LintResult } from './types';

export async function lint(openapiPath: string, options: LintOptions = {}): Promise<LintResult> {
  const spectralResults = await runSpectral(openapiPath);
  let kongIssues = options.kongPlugins
    ? await runKongCheck(openapiPath, options.kongPlugins)
    : [];

  let fixedCount = 0;

  if (options.fix && options.kongPlugins && kongIssues.length > 0) {
    if (!options.serviceName || !options.systemId) {
      throw new Error('--fix requires --service-name and --system-id');
    }
    fixKongPlugins(options.kongPlugins, kongIssues, options.serviceName, options.systemId);
    fixedCount = kongIssues.length;
    console.log(
      `Fixed: added ${fixedCount} missing operationId entr${
        fixedCount === 1 ? 'y' : 'ies'
      } to ${options.kongPlugins}`
    );
    kongIssues = [];
  }

  const { hasErrors } = printResults(spectralResults, kongIssues, {
    openapiPath,
    pluginsPath: options.kongPlugins ?? '',
  });

  if (options.junit) {
    writeJunit(spectralResults, kongIssues, options.junit, {
      includeKong: !!options.kongPlugins,
    });
  }

  return { hasErrors, spectralResults, kongIssues, fixedCount };
}
