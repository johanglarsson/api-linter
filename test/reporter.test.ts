import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import type { ISpectralDiagnostic } from '@stoplight/spectral-core';
import { printResults, writeJunit } from '../src/reporter';
import type { KongIssue } from '../src/types';

const mockSpectralError: ISpectralDiagnostic = {
  code: 'oas3-schema',
  message: 'Schema error',
  severity: 0, // DiagnosticSeverity.Error
  range: { start: { line: 5, character: 2 }, end: { line: 5, character: 10 } },
  path: ['paths', '/items', 'get'],
  source: '/fake/spec.yaml',
};

const mockSpectralWarn: ISpectralDiagnostic = {
  ...mockSpectralError,
  code: 'operation-id-kebab-case',
  message: 'operationId must be kebab-case',
  severity: 1, // DiagnosticSeverity.Warning
};

const mockKongIssue: KongIssue = {
  operationId: 'get-items',
  path: '/items',
  method: 'get',
  message: 'operationId "get-items" has no ACL plugin entry in plugins.yaml',
};

describe('printResults', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  test('hasErrors true when spectral error present', () => {
    const { hasErrors } = printResults([mockSpectralError], [], { openapiPath: 'spec.yaml' });
    expect(hasErrors).toBe(true);
  });

  test('hasErrors false for warnings only', () => {
    const { hasErrors } = printResults([mockSpectralWarn], [], { openapiPath: 'spec.yaml' });
    expect(hasErrors).toBe(false);
  });

  test('hasErrors true when kong issues present', () => {
    const { hasErrors } = printResults([], [mockKongIssue], { pluginsPath: 'plugins.yaml' });
    expect(hasErrors).toBe(true);
  });

  test('hasErrors false for empty results', () => {
    const { hasErrors } = printResults([], []);
    expect(hasErrors).toBe(false);
  });

  test('prints "No errors found." when clean', () => {
    printResults([], []);
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('No errors found.'));
  });
});

describe('writeJunit', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `junit-test-${Date.now()}.xml`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  test('writes valid XML file', () => {
    writeJunit([mockSpectralError], [], tmpFile);
    expect(fs.existsSync(tmpFile)).toBe(true);
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).toContain('<?xml version="1.0"');
    expect(content).toContain('<testsuites>');
    expect(content).toContain('</testsuites>');
  });

  test('includes spectral failure in XML', () => {
    writeJunit([mockSpectralError], [], tmpFile);
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).toContain('<failure');
    expect(content).toContain('oas3-schema');
  });

  test('includes kong failure in XML when kong issues present', () => {
    writeJunit([], [mockKongIssue], tmpFile);
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).toContain('kong-plugins');
    expect(content).toContain('get-items');
  });

  test('clean run produces no failure elements', () => {
    writeJunit([], [], tmpFile);
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).not.toContain('<failure');
  });

  test('includes passing kong suite when includeKong is true and no issues', () => {
    writeJunit([], [], tmpFile, { includeKong: true });
    const content = fs.readFileSync(tmpFile, 'utf8');
    expect(content).toContain('kong-plugins');
    expect(content).not.toContain('<failure');
  });
});
