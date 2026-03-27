'use strict';

const path = require('path');
const { runKongCheck } = require('../src/kong-linter');

const VALID_SPEC = path.join(__dirname, 'fixtures/valid-openapi.yaml');
const VALID_PLUGINS = path.join(__dirname, 'fixtures/valid-plugins.yaml');
const MISSING_PLUGINS = path.join(__dirname, 'fixtures/missing-ops-plugins.yaml');

describe('runKongCheck', () => {
  test('all operations covered returns empty issues', async () => {
    const issues = await runKongCheck(VALID_SPEC, VALID_PLUGINS);
    expect(issues).toHaveLength(0);
  });

  test('missing operationId in plugins returns one issue', async () => {
    const issues = await runKongCheck(VALID_SPEC, MISSING_PLUGINS);
    expect(issues).toHaveLength(1);
    expect(issues[0].operationId).toBe('get-items');
  });

  test('issue message includes the operationId', async () => {
    const issues = await runKongCheck(VALID_SPEC, MISSING_PLUGINS);
    expect(issues[0].message).toMatch(/get-items/);
  });

  test('throws when OpenAPI file does not exist', async () => {
    await expect(runKongCheck('/nonexistent.yaml', VALID_PLUGINS)).rejects.toThrow(
      'Cannot read OpenAPI file'
    );
  });

  test('throws when plugins file does not exist', async () => {
    await expect(runKongCheck(VALID_SPEC, '/nonexistent-plugins.yaml')).rejects.toThrow(
      'Cannot read Kong plugins file'
    );
  });
});
