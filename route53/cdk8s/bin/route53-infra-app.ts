import 'source-map-support/register';
import { App } from 'cdk8s';
import { R53ZonesStack } from '../lib/route53-infra';
import { parseYamlConfig } from '../lib/yaml-parser';

const app = new App();

// Load the configuration file for Route 53
const route53Config = parseYamlConfig('./configs/route53.yaml');
// Cross-region deployment information
const region = 'ca-central-1';
const providerConfigName = 'my-provider-config';

// Create Route 53 Zones stack with parsed domain configurations
new R53ZonesStack(app, 'route53-cdks8-app', {
  domainConfigs: route53Config,
  region,
  providerConfigName
  });

app.synth();