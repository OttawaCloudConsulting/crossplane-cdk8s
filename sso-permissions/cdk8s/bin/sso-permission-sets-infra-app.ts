import 'source-map-support/register';
import { App } from 'cdk8s';
import { parseYamlConfig } from '../lib/yaml-parser';
import { SsoPermissionsStack } from '../lib/sso-permissionset-infra';

const app = new App();

//Load the configuration files:
const accountsConfig = parseYamlConfig('./configs/accounts.yaml');
const awsTagsConfig = parseYamlConfig('./configs/awstags.yaml');
const groupsCOnfig = parseYamlConfig('./configs/groups.yaml');
const kl8sTagsConfig = parseYamlConfig('./configs/k8stags.yaml');
const ssoConfigData = parseYamlConfig('./configs/sso-configs.yaml');
const userConfigs = parseYamlConfig('./configs/users.yaml');

// Cross-region deployment information
const region = 'ca-central-1';
const providerConfigName = 'my-provider-config';

// Create SSO Permissions Management Manifest with parsed configurations
new SsoPermissionsStack(app, 'sso-permission-sets-cdks8-app', {
  accountsConfig,
  awsTagsConfig,
  groupsCOnfig,
  kl8sTagsConfig,
  ssoConfigData,
  userConfigs,
  region,
  providerConfigName
  }); 

app.synth();
