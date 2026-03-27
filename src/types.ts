import type { ISpectralDiagnostic } from '@stoplight/spectral-core';

export interface KongIssue {
  operationId: string;
  path: string;
  method: string;
  message: string;
}

export interface LintOptions {
  kongPlugins?: string;
  junit?: string;
  fix?: boolean;
  serviceName?: string;
  systemId?: string;
}

export interface LintResult {
  hasErrors: boolean;
  spectralResults: ISpectralDiagnostic[];
  kongIssues: KongIssue[];
  fixedCount: number;
}

export interface PrintOptions {
  openapiPath?: string;
  pluginsPath?: string;
}

export interface WriteJunitOptions {
  includeKong?: boolean;
}
