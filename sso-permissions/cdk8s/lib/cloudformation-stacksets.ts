// lib/cloudformation-stacksets.ts

import { Construct } from 'constructs';
import * as fs from 'fs';
import * as path from 'path';
import { Chart } from 'cdk8s';
import { StackSet, StackSetInstance } from '../imports/cloudformation.aws.upbound.io';

export interface CloudFormationStackSetsProps {
  accountsConfig: any;
  groupsConfig: any;
  region: string;
  providerConfigStacksets: string;
  k8sTagsConfig: any;
  awsTagsConfig: any;
}

export class CloudFormationStackSets extends Chart {
  constructor(scope: Construct, id: string, props: CloudFormationStackSetsProps) {
    super(scope, id);

    const {
      accountsConfig,
      groupsConfig,
      region,
      providerConfigStacksets,
      k8sTagsConfig,
      awsTagsConfig,
    } = props;

    // AWS Resource Default Tags
    const defaultTags = awsTagsConfig.tags.reduce(
      (acc: { [key: string]: string }, tag: { key: string; value: string }) => {
        acc[tag.key] = tag.value;
        return acc;
      },
      {}
    );

    // K8S Default Tags for Annotations
    const k8sTags = k8sTagsConfig.tags.reduce(
      (acc: { [key: string]: string }, tag: { key: string; value: string }) => {
        acc[tag.key] = tag.value;
        return acc;
      },
      {}
    );

    // Directories containing IAM policy JSON files
    const boundaryPolicyDir = './configs/policies/boundary/';
    const customPolicyDir = './configs/policies/custom/';

    // Read policy files
    const boundaryPolicyFiles = fs.readdirSync(boundaryPolicyDir).filter(file => file.endsWith('.json'));
    const customPolicyFiles = fs.readdirSync(customPolicyDir).filter(file => file.endsWith('.json'));

    // Read accounts configuration
    const accounts = accountsConfig.Accounts;

    // Build a list of all AccountIds
    const allAccountIds = accounts.map((account: any) => account.AccountId);

    // Map custom policies to accounts based on SSOGroups
    const customPolicyToAccounts: { [policyName: string]: string[] } = {};

    for (const policyFile of customPolicyFiles) {
      const policyName = path.basename(policyFile, '.json');
      // Initialize the set of target accounts for this policy
      const targetAccounts = new Set<string>();

      // Find groups that use this custom policy
      const groupsUsingPolicy = groupsConfig.Groups.filter((group: any) =>
        group.CustomerManagedPolicies.includes(policyName)
      );

      // Collect AccountIds where these groups are assigned
      for (const group of groupsUsingPolicy) {
        for (const account of accounts) {
          if (account.SSOGroups && account.SSOGroups.includes(group.Name)) {
            targetAccounts.add(account.AccountId);
          }
        }
      }

      customPolicyToAccounts[policyName] = Array.from(targetAccounts);
    }

    // Map boundary policies to all accounts
    const boundaryPolicyToAccounts: { [policyName: string]: string[] } = {};

    for (const policyFile of boundaryPolicyFiles) {
      const policyName = path.basename(policyFile, '.json');
      // Boundary policies are deployed to all accounts
      boundaryPolicyToAccounts[policyName] = allAccountIds;
    }

    // Function to create StackSet and StackSetInstances
    const createStackSetAndInstances = (
      policyName: string,
      policyDocument: any,
      targetAccounts: string[]
    ) => {
      // Create CloudFormation template for the policy
      const cloudFormationTemplate = {
        AWSTemplateFormatVersion: '2010-09-09',
        Resources: {
          IAMPolicy: {
            Type: 'AWS::IAM::ManagedPolicy',
            Properties: {
              PolicyDocument: policyDocument,
              ManagedPolicyName: policyName,
            },
          },
        },
      };

      // Convert CloudFormation template to JSON string
      const templateBody = JSON.stringify(cloudFormationTemplate);

      // Create the StackSet
      const annotations = { ...k8sTags };
      annotations[`argocd.argoproj.io/sync-wave`] = '-5';
      const stackSet = new StackSet(this, `StackSet-${policyName}`, {
        metadata: {
          name: `stackset-${policyName.toLowerCase()}`,
          annotations: annotations,
        },
        spec: {
          forProvider: {
            templateBody: templateBody,
            capabilities: ['CAPABILITY_NAMED_IAM'],
            // parameters: {},
            // permissionModel: 'SELF_MANAGED',
            // autoDeployment: [{
            //   enabled: true,
            //   retainStacksOnAccountRemoval: false,
            // }],
            // executionRoleName: 'AWSCloudFormationStackSetExecutionRole',
            region: region,
            tags: defaultTags,
          },
          providerConfigRef: {
            name: providerConfigStacksets,
          },
        },
      });

      // Create StackSetInstance for the target accounts
      for (const account of targetAccounts) {
        const annotations = { ...k8sTags };
        annotations[`argocd.argoproj.io/sync-wave`] = '-1';
        new StackSetInstance(this, `StackSetInstance-${policyName}-${account}`, {
          metadata: {
            name: `stacksetinstance-${policyName.toLowerCase()}-${account}`,
            annotations: annotations,
          },
          spec: {
            forProvider: {
              stackSetNameRef: {
                name: stackSet.metadata.name!,
              },
              accountId: account,
              region: region,
            },
            providerConfigRef: {
              name: providerConfigStacksets,
            },
          },
        });
      };
      }

    // Create StackSets and StackSetInstances for boundary policies
    for (const policyFile of boundaryPolicyFiles) {
      const policyName = path.basename(policyFile, '.json');
      const policyContent = fs.readFileSync(path.join(boundaryPolicyDir, policyFile), 'utf8');
      const policyDocument = JSON.parse(policyContent);
      const targetAccounts = boundaryPolicyToAccounts[policyName];

      createStackSetAndInstances(policyName, policyDocument, targetAccounts);
    }

    // Create StackSets and StackSetInstances for custom policies
    for (const policyFile of customPolicyFiles) {
      const policyName = path.basename(policyFile, '.json');
      const policyContent = fs.readFileSync(path.join(customPolicyDir, policyFile), 'utf8');
      const policyDocument = JSON.parse(policyContent);
      const targetAccounts = customPolicyToAccounts[policyName];

      // Skip if there are no target accounts
      if (targetAccounts.length === 0) {
        continue;
      }

      createStackSetAndInstances(policyName, policyDocument, targetAccounts);
    }
  }
}