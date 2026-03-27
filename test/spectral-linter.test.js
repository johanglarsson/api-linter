'use strict';

const path = require('path');
const { runSpectral } = require('../src/spectral-linter');

const VALID_SPEC = path.join(__dirname, 'fixtures/valid-openapi.yaml');
const INVALID_SPEC = path.join(__dirname, 'fixtures/invalid-openapi.yaml');

describe('runSpectral', () => {
  test('valid spec returns no error-severity results', async () => {
    const results = await runSpectral(VALID_SPEC);
    const errors = results.filter((r) => r.severity === 0);
    expect(errors).toHaveLength(0);
  });

  test('invalid spec triggers operation-id-kebab-case rule', async () => {
    const results = await runSpectral(INVALID_SPEC);
    const codes = results.map((r) => r.code);
    expect(codes).toContain('operation-id-kebab-case');
  });

  test('invalid spec triggers operation-must-have-description rule', async () => {
    const results = await runSpectral(INVALID_SPEC);
    const codes = results.map((r) => r.code);
    expect(codes).toContain('operation-must-have-description');
  });

  test('throws when file does not exist', async () => {
    await expect(runSpectral('/nonexistent/path/spec.yaml')).rejects.toThrow(
      'Cannot read OpenAPI file'
    );
  });
});
