import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import type { KongIssue } from './types';

interface AclPlugin {
  name: string;
  config: {
    allow: string[];
    hide_groups_header: boolean;
  };
  instance_name: string;
  route: string;
}

function generateAclPlugin(
  operationId: string,
  serviceName: string,
  systemId: string
): AclPlugin {
  return {
    name: 'acl',
    config: {
      allow: ['consumer_group', `${serviceName}_${operationId}_group`],
      hide_groups_header: true,
    },
    instance_name: `${systemId}_${serviceName}_${operationId}-_acl`,
    route: `${serviceName}__${operationId}`,
  };
}

export function fixKongPlugins(
  pluginsPath: string,
  kongIssues: KongIssue[],
  serviceName: string,
  systemId: string
): void {
  if (kongIssues.length === 0) return;

  const absolutePath = path.resolve(pluginsPath);

  let pluginsMap: Record<string, unknown[]> = {};
  if (fs.existsSync(absolutePath)) {
    const content = fs.readFileSync(absolutePath, 'utf8');
    const parsed = yaml.load(content);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      pluginsMap = parsed as Record<string, unknown[]>;
    }
  }

  for (const issue of kongIssues) {
    pluginsMap[issue.operationId] = [generateAclPlugin(issue.operationId, serviceName, systemId)];
  }

  fs.writeFileSync(absolutePath, yaml.dump(pluginsMap, { indent: 2 }), 'utf8');
}
