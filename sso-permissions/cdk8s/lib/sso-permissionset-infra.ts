import { Construct } from 'constructs';
import * as fs from 'fs';
import { Chart } from 'cdk8s';
import { 
  AWSTagsYaml, 
  // K8sTagsYaml 
} from './tags-parser';
import { User, Group, GroupMembership } from '../imports/identitystore.aws.upbound.io';
import { Policy } from '../imports/iam.aws.upbound.io';
import { PermissionSet, ManagedPolicyAttachment, CustomerManagedPolicyAttachment, PermissionSetInlinePolicy, AccountAssignment, PermissionsBoundaryAttachment } from '../imports/ssoadmin.aws.upbound.io';

export interface SsoPermissionsStackProps {
  accountsConfig: any;
  awsTagsConfig: any;
  groupsCOnfig: any;
  kl8sTagsConfig: any;
  ssoConfigData: any;
  userConfigs: any;
  region: string;
  providerConfigName: string;
}

export class SsoPermissionsStack extends Chart {
  constructor(scope: Construct, id: string, props: SsoPermissionsStackProps) {
    super(scope, id);

    const { 
      accountsConfig, 
      // awsTagsConfig, 
      groupsCOnfig, 
      // kl8sTagsConfig, 
      ssoConfigData, 
      userConfigs, 
      region, 
      providerConfigName 
    } = props;

    const awsTags = new AWSTagsYaml('./configs/awstags.yaml');
    // const k8sTags = new K8sTagsYaml('./configs/k8stags.yaml');

    // Create users
    for (const user of userConfigs.users) {
      new User(this, `User-${user.UserName}`, {
        spec: {
          forProvider: {
            displayName: user.DisplayName,
            name: [{
              givenName: user.Name.GivenName,
              familyName: user.Name.FamilyName,
            }],
            title: user.Title,
            emails: [user.Email],
            timezone: user.TimeZone,
            phoneNumbers: [user.PhoneNumber],
            preferredLanguage: user.PreferredLanguage,
            identityStoreId: ssoConfigData.IdentityStoreId,
            region: region,
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });
    }

    // Iterate over each file in the boundary-policies directory and create a policy for each
    const boundaryPoliciesDir = '../configs/boundary-policies/';
    const boundaryPolicyFiles = fs.readdirSync(boundaryPoliciesDir);

    for (const boundaryPolicyFile of boundaryPolicyFiles) {
      console.log(`File: ${boundaryPolicyFile}`);
      const policyName = boundaryPolicyFile.replace('.json', '');
      new Policy(this, policyName, {
        spec: {
          forProvider: {
            policy: JSON.parse(fs.readFileSync(`${boundaryPoliciesDir}${boundaryPolicyFile}`, 'utf8')),
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });
    }

    // Create IAM Policies for each custom  policy
    // const policiesDir = './configs/';
    // const customPolicyFiles = group.CustomerManagedPolicies.map(
    //   (policy: string) => `${policiesDir}custom-policies/${policy}.json`
    // );
    const customPoliciesDir = './configs/custom-policies/';
    const customPolicyFiles = fs.readdirSync(customPoliciesDir);
    console.log(customPolicyFiles);

    for (const policyFile of customPolicyFiles) {
      const policyName = policyFile.split('/').pop()?.replace('.json', '');
      console.log(`File: ${customPoliciesDir}${policyFile}`);
      new Policy(this, `${policyName}`, {
        spec: {
          forProvider: {
            policy: JSON.parse(fs.readFileSync(`${customPoliciesDir}${policyFile}`, 'utf8')),
            // policy: JSON.parse(fs.readFileSync(`${customPoliciesDir}${policyFile}`, 'utf8')),
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });
    }

    // Create groups
    for (const group of groupsCOnfig.Groups) {
      const groupResource = new Group(this, `Group-${group.Name}`, {
        spec: {
          forProvider: {
            displayName: group.DisplayName,
            description: group.Description,
            identityStoreId: ssoConfigData.IdentityStoreId,
            region: region,
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });

      // Create group memberships
      for (const member of group.Members) {
        new GroupMembership(this, `GroupMembership-${group.Name}-${member.UserName}`, {
          spec: {
            forProvider: {
              groupId: groupResource.metadata.name,
              memberId: member.UserName, // Use user reference or ID
              region: region,
              identityStoreId: ssoConfigData.IdentityStoreId,
            },
            providerConfigRef: {
              name: providerConfigName,
            },
          },
        });
      }



      // Create Permission Set
      const permissionSet = new PermissionSet(this, `PermissionSet-${group.Name}`, {
        spec: {
          forProvider: {
            name: group.Name,
            instanceArn: ssoConfigData.SSOAdminInstanceARN,
            sessionDuration: group.SessionDuration,
            region: region,
            tags: awsTags.tags.reduce((acc: { [key: string]: string }, tag: { key: string; value: string }) => {
              acc[tag.key] = tag.value;
              return acc;
            }, {}),
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });

      // Attach Managed Policies
      for (const managedPolicy of group.ManagedPolicies) {
        new ManagedPolicyAttachment(this, `ManagedPolicyAttachment-${group.Name}-${managedPolicy}`, {
          spec: {
            forProvider: {
              permissionSetArn: permissionSet.metadata.name,
              managedPolicyArn: managedPolicy,
              instanceArn: ssoConfigData.SSOAdminInstanceARN,
              region: region,
            },
            providerConfigRef: {
              name: providerConfigName,
            },
          },
        });
      }

      // Attach Inline Policies
      if (group.InlinePolicies && group.InlinePolicies.length > 0) {
        for (const inlinePolicy of group.InlinePolicies) {
          new PermissionSetInlinePolicy(this, `InlinePolicy-${group.Name}-${inlinePolicy}`, {
            spec: {
              forProvider: {
                permissionSetArn: permissionSet.metadata.name,
                inlinePolicy: inlinePolicy,
                instanceArn: ssoConfigData.SSOAdminInstanceARN,
                region: region,
              },
              providerConfigRef: {
                name: providerConfigName,
              },
            },
          });
        }
      }

      // Attach Customer Managed Policies
      for (const customerPolicy of group.CustomerManagedPolicies) {
        new CustomerManagedPolicyAttachment(this, `CustomerManagedPolicyAttachment-${group.Name}-${customerPolicy}`, {
          spec: {
            forProvider: {
              permissionSetArn: permissionSet.metadata.name,
              customerManagedPolicyReference: [{ name: customerPolicy }],
              instanceArn: ssoConfigData.SSOAdminInstanceARN,
              region: region,
            },
            providerConfigRef: {
              name: providerConfigName,
            },
          },
        });
      }

      // Attach Permissions Boundary
      new PermissionsBoundaryAttachment(this, `PermissionsBoundary-${group.Name}-${group.BoundaryPolicy}`, {
        spec: {
          forProvider: {
            permissionSetArn: permissionSet.metadata.name,
            permissionsBoundary: group.BoundaryPolicy,
            instanceArn: ssoConfigData.SSOAdminInstanceARN,
            region: region,
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });

      // Assign permission set to accounts
      for (const account of accountsConfig.Accounts) {
        if (account.SSOGroups.includes(group.Name)) {
          new AccountAssignment(this, `AccountAssignment-${account.AccountId}-${group.Name}`, {
            spec: {
              forProvider: {
                targetId: account.AccountId,
                permissionSetArn: permissionSet.metadata.name,
                instanceArn: ssoConfigData.SSOAdminInstanceARN,
                region: region,
                principalType: 'AWSAccount',
              },
              providerConfigRef: {
                name: providerConfigName,
              },
            },
          });
        }
      }
    }
  }
}