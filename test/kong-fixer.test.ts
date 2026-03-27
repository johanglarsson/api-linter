import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as yaml from 'js-yaml';
import { fixKongPlugins } from '../src/kong-fixer';
import type { KongIssue } from '../src/types';

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

  test('creates plugins file if it does not exist', () => {
    fixKongPlugins(tmpFile, [makeIssue('get-items')], 'svc', 'sys');
    expect(fs.existsSync(tmpFile)).toBe(true);
  });

  test('generates correct ACL plugin entry', () => {
    fixKongPlugins(tmpFile, [makeIssue('get-items')], 'myservice', 'mysystem');
    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as Record<string, unknown[]>;
    const plugin = written['get-items'][0] as Record<string, unknown>;

    expect(plugin.name).toBe('acl');
    expect((plugin.config as Record<string, unknown>).allow).toContain('myservice_get-items_group');
    expect((plugin.config as Record<string, unknown>).allow).toContain('consumer_group');
    expect((plugin.config as Record<string, unknown>).hide_groups_header).toBe(true);
    expect(plugin.instance_name).toBe('mysystem_myservice_get-items-_acl');
    expect(plugin.route).toBe('myservice__get-items');
  });

  test('appends multiple missing entries', () => {
    fixKongPlugins(tmpFile, [makeIssue('get-items'), makeIssue('post-items')], 'svc', 'sys');
    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as Record<string, unknown[]>;
    expect(Object.keys(written)).toHaveLength(2);
    expect(written['get-items']).toHaveLength(1);
    expect(written['post-items']).toHaveLength(1);
  });

  test('preserves existing entries when adding missing ones', () => {
    const existing = { 'existing-op': [{ name: 'key-auth' }] };
    fs.writeFileSync(tmpFile, yaml.dump(existing), 'utf8');

    fixKongPlugins(tmpFile, [makeIssue('new-op')], 'svc', 'sys');

    const written = yaml.load(fs.readFileSync(tmpFile, 'utf8')) as Record<string, unknown[]>;
    expect(written['existing-op']).toBeDefined();
    expect((written['existing-op'][0] as Record<string, unknown>).name).toBe('key-auth');
    expect(written['new-op']).toBeDefined();
  });
});
