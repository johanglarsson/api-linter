'use strict';

const { oas } = require('@stoplight/spectral-rulesets');
const { truthy } = require('@stoplight/spectral-functions');

function operationIdKebabCase(targetVal) {
  if (typeof targetVal !== 'string') return;
  if (!/^[a-z][a-z0-9-]*$/.test(targetVal)) {
    return [
      {
        message: `operationId "${targetVal}" must be kebab-case (lowercase letters, digits, hyphens only)`,
      },
    ];
  }
}

module.exports = {
  extends: [[oas, 'recommended']],
  rules: {
    'operation-id-kebab-case': {
      description: 'operationId must be kebab-case',
      message: '{{error}}',
      severity: 'warn',
      given: '$.paths[*][get,post,put,delete,patch,options,head].operationId',
      then: {
        function: operationIdKebabCase,
      },
    },
    'operation-must-have-description': {
      description: 'Every operation must have a non-empty description',
      severity: 'warn',
      given: '$.paths[*][get,post,put,delete,patch,options,head]',
      then: {
        field: 'description',
        function: truthy,
      },
    },
  },
};
