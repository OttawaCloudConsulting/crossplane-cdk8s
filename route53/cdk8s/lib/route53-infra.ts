import { Construct } from 'constructs';
import { Chart } from 'cdk8s';
import { Route53Record as CrossplaneRecord, Route53Zone as Zone } from '../imports/route53_records/route53.aws.upbound.io';
import { K8sTagsYaml, AWSTagsYaml } from './tags-parser';

export interface R53ZonesStackProps {
  domainConfigs: any;
  region: string;
  providerConfigName: string;
}

export class R53ZonesStack extends Chart {
  constructor(scope: Construct, id: string, props: R53ZonesStackProps) {
    super(scope, id);

    const { domainConfigs, region, providerConfigName } = props;

    const awsTags = new AWSTagsYaml('./configs/awstags.yaml');
    const k8sTags = new K8sTagsYaml('./configs/k8stags.yaml');

    for (const domain in domainConfigs) {
      // Create a Crossplane Zone resource for each domain
      const zone = new Zone(this, `Zone-${domain}`, {
        metadata: {
          annotations: k8sTags.tags.reduce((acc, tag) => ({ ...acc, [tag.key]: tag.value }), {}),
        },
        spec: {
          forProvider: {
            name: domainConfigs[domain].hosted_zone_name,
            region: region,
            tags: awsTags.tags.reduce((acc, tag) => ({ ...acc, [tag.key]: tag.value }), {}) // Corrected to apply AWS tags here
          },
          providerConfigRef: {
            name: providerConfigName
          }
        }
      });

      // Create Crossplane Record resources for each record set in the domain
      for (const recordSet of domainConfigs[domain].record_sets) {
        // Generate the metadata name using the hosted zone name, record type, and a unique suffix
        const hostedZoneName = domainConfigs[domain].hosted_zone_name.replace(/\./g, '-');
        const uniqueSuffix = Math.random().toString(36).substr(2, 6); // Generate a short unique suffix

        const metadataName = `RecordSet-${hostedZoneName}-${recordSet.type}-${uniqueSuffix}`.slice(0, 63); // Ensure name is under 63 characters
        
        new CrossplaneRecord(this, metadataName, {
          spec: {
            forProvider: {
              name: recordSet.name, // Untouched forProvider name
              type: recordSet.type,
              ttl: recordSet.ttl ?? 3600,
              records: recordSet.values,
              zoneIdRef: { name: zone.name },
              region: region
            },
            providerConfigRef: {
              name: providerConfigName
            }
          }
        });
      }

    }
  }
}