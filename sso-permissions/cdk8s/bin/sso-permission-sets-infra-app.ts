import 'source-map-support/register';
import { App } from 'cdk8s';
import { parseYamlConfig } from '../lib/yaml-parser';
import { SsoPermissionsStack } from '../lib/sso-permissionset-infra';
import { CloudFormationStackSets } from '../lib/cloudformation-stacksets';

const app = new App();

//Load the configuration files:
const accountsConfig = parseYamlConfig('./configs/accounts.yaml');
const awsTagsConfig = parseYamlConfig('./configs/awstags.yaml');
const groupsConfig = parseYamlConfig('./configs/groups.yaml');
const k8sTagsConfig = parseYamlConfig('./configs/k8stags.yaml');
const ssoConfigData = parseYamlConfig('./configs/sso-configs.yaml');
const userConfigs = parseYamlConfig('./configs/users.yaml');

// Cross-region deployment information
const region = 'ca-central-1';
const providerConfigName = 'occawslz-root-account';
const providerConfigStacksets = 'occawslz-root-account';

// Create SSO Permissions Management Manifest with parsed configurations
new SsoPermissionsStack(app, 'sso-permission-sets-cdks8-app', {
  accountsConfig,
  awsTagsConfig,
  groupsConfig,
  k8sTagsConfig,
  ssoConfigData,
  userConfigs,
  region,
  providerConfigName,
  providerConfigStacksets
  }); 

// Create CloudFormation StackSets Stack
new CloudFormationStackSets(app, 'cloudformation-stacksets', {
  accountsConfig,
  groupsConfig,
  region,
  providerConfigStacksets,
  k8sTagsConfig,
  awsTagsConfig,
});

app.synth();
