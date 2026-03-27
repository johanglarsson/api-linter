import * as fs from 'fs';
import * as path from 'path';
import type { ISpectralDiagnostic } from '@stoplight/spectral-core';
import type { KongIssue, PrintOptions, WriteJunitOptions } from './types';

const SEVERITY_LABEL: Record<number, string> = {
  0: 'error',
  1: 'warning',
  2: 'information',
  3: 'hint',
};

function formatSpectralResults(
  spectralResults: ISpectralDiagnostic[],
  openapiPath: string
): string | null {
  if (spectralResults.length === 0) return null;
  const lines: string[] = [openapiPath];
  for (const result of spectralResults) {
    const line = result.range.start.line + 1;
    const col = result.range.start.character + 1;
    const sev = SEVERITY_LABEL[result.severity] ?? 'unknown';
    lines.push(`  ${line}:${col}  ${sev}  ${String(result.code)}  ${result.message}`);
  }
  return lines.join('\n');
}

function formatKongIssues(kongIssues: KongIssue[], pluginsPath: string): string | null {
  if (kongIssues.length === 0) return null;
  const n = kongIssues.length;
  const lines: string[] = [`Kong plugins check (${pluginsPath})`];
  for (const issue of kongIssues) {
    lines.push(`  [missing]  ${issue.message}`);
  }
  lines.push('');
  lines.push(
    `  ${n} missing entr${n === 1 ? 'y' : 'ies'} — re-run with` +
      ' --fix --service-name <name> --system-id <id> to generate ACL plugin entries'
  );
  return lines.join('\n');
}

export function printResults(
  spectralResults: ISpectralDiagnostic[],
  kongIssues: KongIssue[],
  { openapiPath = '', pluginsPath = '' }: PrintOptions = {}
): { hasErrors: boolean } {
  const spectralOutput = formatSpectralResults(spectralResults, openapiPath);
  const kongOutput = formatKongIssues(kongIssues, pluginsPath);

  if (spectralOutput) console.log(spectralOutput);
  if (kongOutput) console.log(kongOutput);

  const spectralHasErrors = spectralResults.some((r) => r.severity === 0);
  const hasErrors = spectralHasErrors || kongIssues.length > 0;

  if (!hasErrors) {
    console.log('No errors found.');
  }

  return { hasErrors };
}

function escapeXml(str: unknown): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function writeJunit(
  spectralResults: ISpectralDiagnostic[],
  kongIssues: KongIssue[],
  outputPath: string,
  { includeKong = false }: WriteJunitOptions = {}
): void {
  const spectralErrors = spectralResults.filter((r) => r.severity === 0).length;
  const spectralTests = spectralResults.length || 1;

  const spectralTestcases = spectralResults.map((result) => {
    const line = result.range.start.line + 1;
    const sev = SEVERITY_LABEL[result.severity] ?? 'unknown';
    const name = escapeXml(`${String(result.code)} at line ${line}`);
    const classname = escapeXml(String(result.code));
    const detail = escapeXml(`${sev}: ${result.message} (line ${line})`);
    if (result.severity === 0) {
      return (
        `    <testcase name="${name}" classname="${classname}">` +
        `<failure message="${escapeXml(result.message)}">${detail}</failure>` +
        `</testcase>`
      );
    }
    return (
      `    <testcase name="${name}" classname="${classname}">` +
      `<system-out>${detail}</system-out>` +
      `</testcase>`
    );
  });

  if (spectralResults.length === 0) {
    spectralTestcases.push(`    <testcase name="spectral" classname="spectral"/>`);
  }

  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n`;
  xml += `  <testsuite name="spectral" tests="${spectralTests}" failures="${spectralErrors}">\n`;
  xml += spectralTestcases.join('\n') + '\n';
  xml += `  </testsuite>\n`;

  if (includeKong || kongIssues.length > 0) {
    const kongTests = kongIssues.length || 1;
    const kongTestcases = kongIssues.map((issue) => {
      const name = escapeXml(`kong-plugins: ${issue.operationId}`);
      return (
        `    <testcase name="${name}" classname="kong-plugins">` +
        `<failure message="${escapeXml(issue.message)}">${escapeXml(issue.message)}</failure>` +
        `</testcase>`
      );
    });

    if (kongIssues.length === 0) {
      kongTestcases.push(`    <testcase name="kong-plugins" classname="kong-plugins"/>`);
    }

    xml += `  <testsuite name="kong-plugins" tests="${kongTests}" failures="${kongIssues.length}">\n`;
    xml += kongTestcases.join('\n') + '\n';
    xml += `  </testsuite>\n`;
  }

  xml += `</testsuites>\n`;

  fs.writeFileSync(path.resolve(outputPath), xml, 'utf8');
}
