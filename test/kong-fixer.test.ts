import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { fixKongPlugins } from '../src/kong-fixer';
import type { KongIssue } from '../src/types';

interface KongPluginsFile {
  _format_version?: string;
  plugins?: Array<Record<string, unknown>>;
}

const makeIssue = (operationId: string): KongIssue => ({
  operationId,
  path: '/items',
  method: 'get',
  message: `operationId "${operationId}" not found`,
});

describe('fixKongPlugins', () => {
  let tmpFile: string;

  beforeEach(() => {
    tmpFile = path.join(os.tmpdir(), `plugins-fix-test-${Date.now()}.yaml`);
  });

  afterEach(() => {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  });

  test('does nothing when kongIssues is empty', () => {
    fixKongPlugins(tmpFile, [], 'svc', 'sys');
    expect(fs.existsSync(tmpFile)).toBe(false);
  });

  test('creates plugins file with _format_version if it does not exist', () => {
    fixKongPlugins(tmpFile, [makeIssue('get-items')], 'svc', 'sys');
    expect(fs.existsSync(tmpFile)).toBe(true);
    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as KongPluginsFile;
    expect(written._format_version).toBe('3.0');
  });

  test('generates correct ACL plugin entry', () => {
    fixKongPlugins(tmpFile, [makeIssue('get-items')], 'myservice', 'mysystem');
    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as KongPluginsFile;
    const plugin = written.plugins?.[0] as Record<string, unknown>;

    expect(plugin.name).toBe('acl');
    const config = plugin.config as Record<string, unknown>;
    expect(config.allow).toContain('consumer_group');
    expect(config.allow).toContain('myservice_get-items_group');
    expect(config.hide_groups_header).toBe(true);
    expect(plugin.instance_name).toBe('mysystem_myservice_get-items_acl');
    expect(plugin.route).toBe('myservice_get-items');
  });

  test('appends multiple missing entries to plugins array', () => {
    fixKongPlugins(tmpFile, [makeIssue('get-items'), makeIssue('post-items')], 'svc', 'sys');
    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as KongPluginsFile;
    expect(written.plugins).toHaveLength(2);
  });

  test('preserves existing plugins when adding missing ones', () => {
    const existing: KongPluginsFile = {
      _format_version: '3.0',
      plugins: [{ name: 'key-auth', route: 'svc_existing-op' }],
    };
    fs.writeFileSync(tmpFile, yaml.dump(existing), 'utf8');

    fixKongPlugins(tmpFile, [makeIssue('new-op')], 'svc', 'sys');

    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as KongPluginsFile;
    expect(written.plugins).toHaveLength(2);
    expect(written.plugins?.[0].name).toBe('key-auth');
    expect(written.plugins?.[1].name).toBe('acl');
  });

  test('preserves _format_version from existing file', () => {
    const existing: KongPluginsFile = { _format_version: '2.0', plugins: [] };
    fs.writeFileSync(tmpFile, yaml.dump(existing), 'utf8');

    fixKongPlugins(tmpFile, [makeIssue('get-items')], 'svc', 'sys');

    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as KongPluginsFile;
    expect(written._format_version).toBe('2.0');
  });
});
