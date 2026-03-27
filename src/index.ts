import { runSpectral } from './spectral-linter';
import { runKongCheck } from './kong-linter';
import { printResults, writeJunit } from './reporter';
import type { LintOptions, LintResult } from './types';

export type { KongIssue, LintOptions, LintResult } from './types';

export async function lint(openapiPath: string, options: LintOptions = {}): Promise<LintResult> {
  const spectralResults = await runSpectral(openapiPath);
  const kongIssues = options.kongPlugins
    ? await runKongCheck(openapiPath, options.kongPlugins)
    : [];

  const { hasErrors } = printResults(spectralResults, kongIssues, {
    openapiPath,
    pluginsPath: options.kongPlugins ?? '',
  });

  if (options.junit) {
    writeJunit(spectralResults, kongIssues, options.junit, {
      includeKong: !!options.kongPlugins,
    });
  }

  return { hasErrors, spectralResults, kongIssues };
}
