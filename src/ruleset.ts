import type { RulesetDefinition } from '@stoplight/spectral-core';
import { oas } from '@stoplight/spectral-rulesets';
import { truthy } from '@stoplight/spectral-functions';

function operationIdKebabCase(targetVal: unknown): { message: string }[] | void {
  if (typeof targetVal !== 'string') return;
  if (!/^[a-z][a-z0-9-]*$/.test(targetVal)) {
    return [
      {
        message: `operationId "${targetVal}" must be kebab-case (lowercase letters, digits, hyphens only)`,
      },
    ];
  }
}

const ruleset: RulesetDefinition = {
  extends: [[oas, 'recommended']],
  rules: {
    'operation-id-kebab-case': {
      description: 'operationId must be kebab-case',
      message: '{{error}}',
      severity: 'warn',
      given: '$.paths[*][get,post,put,delete,patch,options,head].operationId',
      then: {
        // @ts-expect-error custom function signature is compatible at runtime
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

export default ruleset;
