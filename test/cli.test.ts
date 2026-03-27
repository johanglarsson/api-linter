import * as path from 'path';
import { spawnSync } from 'child_process';
import type { SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';

const CLI = path.join(__dirname, '..', 'dist', 'cli.js');
const VALID_SPEC = path.join(__dirname, 'fixtures/valid-openapi.yaml');
const VALID_PLUGINS = path.join(__dirname, 'fixtures/valid-plugins.yaml');
const MISSING_PLUGINS = path.join(__dirname, 'fixtures/missing-ops-plugins.yaml');

function runCli(...args: string[]): SpawnSyncReturns<string> {
  return spawnSync('node', [CLI, ...args], { encoding: 'utf8', timeout: 30000 });
}

describe('CLI', () => {
  test('exits 0 for valid spec', () => {
    const result = runCli(VALID_SPEC);
    expect(result.status).toBe(0);
  });

  test('exits 0 when all kong operations covered', () => {
    const result = runCli('--kong-plugins', VALID_PLUGINS, VALID_SPEC);
    expect(result.status).toBe(0);
  });

  test('exits 1 when kong plugins operationId is missing', () => {
    const result = runCli('--kong-plugins', MISSING_PLUGINS, VALID_SPEC);
    expect(result.status).toBe(1);
  });

  test('exits 2 for non-existent file', () => {
    const result = runCli('/nonexistent/spec.yaml');
    expect(result.status).toBe(2);
  });

  test('--junit writes XML file', () => {
    const tmpFile = path.join(os.tmpdir(), `junit-cli-${Date.now()}.xml`);
    try {
      runCli('--junit', tmpFile, VALID_SPEC);
      expect(fs.existsSync(tmpFile)).toBe(true);
      const content = fs.readFileSync(tmpFile, 'utf8');
      expect(content).toContain('<testsuites>');
    } finally {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  });
});
