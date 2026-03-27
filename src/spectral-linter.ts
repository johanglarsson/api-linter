import { Spectral, Document } from '@stoplight/spectral-core';
import type { ISpectralDiagnostic } from '@stoplight/spectral-core';
import { Yaml } from '@stoplight/spectral-parsers';
import * as path from 'path';
import * as fs from 'fs';
import ruleset from './ruleset';

export async function runSpectral(openapiPath: string): Promise<ISpectralDiagnostic[]> {
  const absolutePath = path.resolve(openapiPath);
  let content: string;
  try {
    content = fs.readFileSync(absolutePath, 'utf8');
  } catch (err) {
    throw new Error(
      `Cannot read OpenAPI file "${openapiPath}": ${(err as NodeJS.ErrnoException).message}`
    );
  }

  // Yaml parser handles both .yaml and .json (JSON is valid YAML)
  const document = new Document(content, Yaml, absolutePath);
  const spectral = new Spectral();
  spectral.setRuleset(ruleset);

  return spectral.run(document);
}
