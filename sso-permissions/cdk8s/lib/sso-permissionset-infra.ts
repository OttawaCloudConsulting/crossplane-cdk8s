import { Construct } from 'constructs';
import * as fs from 'fs';
import { Chart } from 'cdk8s';
import { User, Group, GroupMembership } from '../imports/identitystore.aws.upbound.io';
import { Policy } from '../imports/iam.aws.upbound.io';
import { PermissionSet, ManagedPolicyAttachment, CustomerManagedPolicyAttachment, PermissionSetInlinePolicy, AccountAssignment, PermissionsBoundaryAttachment } from '../imports/ssoadmin.aws.upbound.io';

export interface SsoPermissionsStackProps {
  accountsConfig: any;
  awsTagsConfig: any;
  groupsCOnfig: any;
  k8sTagsConfig: any;
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
      awsTagsConfig, 
      groupsCOnfig, 
      k8sTagsConfig, 
      ssoConfigData, 
      userConfigs, 
      region, 
      providerConfigName 
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

    // Create users
    for (const user of userConfigs.users) {
      new User(this, `User-${user.UserName}`, {
        metadata: {
          name: `${user.UserName}`,
          annotations: k8sTags,
        },
        spec: {
          forProvider: {
            userName: user.UserName,
            displayName: user.DisplayName,
            name: [{
              givenName: user.Name.GivenName,
              familyName: user.Name.FamilyName,
            }],
            title: user.Title,
            emails: [{
              value: user.Email,
            }],
            timezone: user.TimeZone,
            phoneNumbers: [{
              value: user.PhoneNumber,
            }],
            preferredLanguage: user.PreferredLanguage,
            identityStoreId: ssoConfigData.SSOAdminInstanceARN,
            region: region,
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });
    }

    // Iterate over each file in the boundary-policies directory and create a policy for each
    const boundaryPoliciesDir = './configs/boundary-policies/';
    const boundaryPolicyFiles = fs.readdirSync(boundaryPoliciesDir)

    for (const boundaryPolicyFile of boundaryPolicyFiles) {
      const awsTags = { ...defaultTags };
      awsTags['policytype'] = 'ssoboundary';
      const policyName = boundaryPolicyFile.replace('.json', '');
      new Policy(this, policyName, {
        metadata: {
          name: `${policyName}`.toLowerCase(),
          annotations: k8sTags,
        },
        spec: {
          forProvider: {
            policy: JSON.stringify(fs.readFileSync(`${boundaryPoliciesDir}${boundaryPolicyFile}`, 'utf8')),
            tags: awsTags,
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });
    }

    // Create IAM Policies for each custom  policy
    const customPoliciesDir = './configs/custom-policies/';
    const customPolicyFiles = fs.readdirSync(customPoliciesDir);

    for (const policyFile of customPolicyFiles) {
      const awsTags = { ...defaultTags };
      awsTags['policytype'] = 'ssocustom';
      const policyName = policyFile.split('/').pop()?.replace('.json', '').toLowerCase()!;
      new Policy(this, `${policyName}`, {
        metadata: {
          name: `${policyName}`,
          annotations: k8sTags,
        },
        spec: {
          forProvider: {
            policy: JSON.stringify(fs.readFileSync(`${customPoliciesDir}${policyFile}`, 'utf8')),
            tags: awsTags,
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
        metadata: {
          name: group.Name.toLowerCase(),
          annotations: k8sTags,
        },
        spec: {
          forProvider: {
            displayName: group.DisplayName,
            description: group.Description,
            identityStoreId: ssoConfigData.SSOAdminInstanceARN,
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
          metadata: {
            annotations: k8sTags
          },
          spec: {
            forProvider: {
              groupIdRef: {
                name: groupResource.metadata.name!,
              },
              memberIdRef: {
                name: member.UserName,
              },
              region: region,
              identityStoreId: ssoConfigData.SSOAdminInstanceARN,
            },
            providerConfigRef: {
              name: providerConfigName,
            },
          },
        });
      }

      // Create Permission Set
      const awsTags = { ...defaultTags };
      const permissionSet = new PermissionSet(this, `PermissionSet-${group.Name}`, {
        metadata: {
          name: `${group.Name}`.toLowerCase(),
          annotations: k8sTags,
        },
        spec: {
          forProvider: {
            name: group.Name.toLowerCase(),
            instanceArn: ssoConfigData.SSOAdminInstanceARN,
            sessionDuration: String(group.SessionDuration),
            region: region,
            tags: awsTags,
          },
          providerConfigRef: {
            name: providerConfigName,
          },
        },
      });

      // Attach Managed Policies
      for (const managedPolicy of group.ManagedPolicies) {
        new ManagedPolicyAttachment(this, `ManagedPolicyAttachment-${group.Name}-${managedPolicy}`, {
          metadata: {
            annotations: k8sTags,
          },
          spec: {
            forProvider: {
              permissionSetArnRef: {
                name: permissionSet.metadata.name!,
              },
              managedPolicyArn: `arn:aws:iam::aws:policy/${managedPolicy}`,
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
            metadata: {
              annotations: k8sTags,
            },
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
              permissionSetArnRef: {
                name: permissionSet.metadata.name!,
              },
              customerManagedPolicyReference: [{ 
                name: customerPolicy.toLowerCase() 
              }],
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
        metadata: {
          annotations: k8sTags,
        },
        spec: {
          forProvider: {
            permissionSetArnRef: {
              name: permissionSet.metadata.name!,
            },
            permissionsBoundary: [
              {
                customerManagedPolicyReference: [
                  {
                    name: group.BoundaryPolicy.toLowerCase(),
                  }
                ]
              }
            ],
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
            metadata: {
              annotations: k8sTags,
            },
            spec: {
              forProvider: {
                targetId: account.AccountId,
                targetType: 'AWS_ACCOUNT',
                permissionSetArnRef: {
                  name: permissionSet.metadata.name!,
                },
                instanceArn: ssoConfigData.SSOAdminInstanceARN,
                region: region,
                principalIdFromGroupRef: {
                  name: groupResource.metadata.name!,
                },
                principalType: 'GROUP',
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