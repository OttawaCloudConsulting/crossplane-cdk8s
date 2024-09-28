# SSO Permissions CDK8s Setup

## Table of Contents
- [SSO Permissions CDK8s Setup](#sso-permissions-cdk8s-setup)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Crossplane Dependencies](#crossplane-dependencies)
  - [Directory Structure](#directory-structure)
  - [Updating the configuration YAML files](#updating-the-configuration-yaml-files)
    - [awstags.yaml - AWS Resource Tags](#awstagsyaml---aws-resource-tags)
    - [k8stags.yaml - Kubernetes annotations tags](#k8stagsyaml---kubernetes-annotations-tags)
    - [accounts.yaml - AWS Accounts Configuration](#accountsyaml---aws-accounts-configuration)
    - [groups.yaml - SSO Groups Configuration](#groupsyaml---sso-groups-configuration)
    - [sso-configs.yaml - AWS SSO Configuration](#sso-configsyaml---aws-sso-configuration)
    - [users.yaml - AWS IdentityStore Users Configuration](#usersyaml---aws-identitystore-users-configuration)
    - [boundary policies and custom policies - IAM Policy JSON Files](#boundary-policies-and-custom-policies---iam-policy-json-files)
  - [Executing the CDK8s](#executing-the-cdk8s)
    - [Install dependencies](#install-dependencies)
    - [Create CDK8s manifests](#create-cdk8s-manifests)

## Overview

This project uses **CDK8s** in conjunction with **Crossplane** to manage AWS SSO Permission Sets, IAM Policies, and CloudFormation StackSets. The project automates the generation of Kubernetes manifests based on the provided YAML configuration files to handle permissions across AWS accounts.

**Important Note - IAM Policies included in this project are for example purposes only. They are not suitable for production use, and have not been reviewed for security or even functional use**

## Crossplane Dependencies

To use this project, you'll need to have **Crossplane** installed and running in your Kubernetes cluster. Crossplane allows you to manage AWS resources such as IAM policies, SSO permission sets, and CloudFormation stack sets directly from Kubernetes.

To deploy the created tempaltes, the kubernetes cluster must be running:

+ [provider-aws-ssoadmin](https://marketplace.upbound.io/providers/upbound/provider-aws-ssoadmin/v1.14.0)
+ [provider-aws-identitystore](https://marketplace.upbound.io/providers/upbound/provider-aws-identitystore/v1.14.0)
+ [provider-aws-iam](https://marketplace.upbound.io/providers/upbound/provider-aws-iam/v1.14.0)

For more information, visit the [Crossplane documentation](https://crossplane.io/docs/).

## Directory Structure

```bash
.
├── bin
│   └── sso-permission-sets-infra-app.ts
├── configs
│   ├── accounts.yaml
│   ├── awstags.yaml
│   ├── groups.yaml
│   ├── k8stags.yaml
│   ├── policies
│   │   ├── boundary
│   │   │   ├── SSOBoundaryPolicy-Elevated.json
│   │   │   └── SSOBoundaryPolicy-Standard.json
│   │   └── custom
│   │       ├── Arch-DR-Elevated-CustomPolicy.json
│   │       ├── ...
│   ├── sso-configs.yaml
│   └── users.yaml
├── crds
│   └── crossplane.yaml
├── lib
│   ├── cloudformation-stacksets.ts
│   ├── sso-permissionset-infra.ts
│   ├── tags-parser.ts
│   └── yaml-parser.ts
└── tsconfig.json
```


- **`bin/`**: This directory contains the executable TypeScript files that define command-line tools or scripts for the project. The files in `bin/` are typically compiled to JavaScript and mapped to commands via the `bin` field in `package.json`, making them directly executable through the command line. These scripts are responsible for high-level tasks like deploying infrastructure or running specific commands related to the project’s functionality.
  
- **`lib/`**: The `lib/` directory is used to store the core logic and reusable modules of the project. These TypeScript files contain the main business logic, utilities, or helper functions that are imported and used by other parts of the application, including the scripts in `bin/`. The files in `lib/` are designed to be modular and maintainable, focusing on the core operations behind the scenes, which are separated from the command-line interface.
  
- **`configs/`**: This directory stores configuration templates in formats such as YAML or JSON. These files typically contain structured data, like arrays or key-value pairs, which are parsed and used by the project at runtime. For example, a User list in YAML format is stored in `configs/`, providing a configurable source of data that the scripts in `bin/` or modules in `lib/` can read and process dynamically. This allows for easy updates to the configuration without modifying the code itself.

## Updating the configuration YAML files

### awstags.yaml - AWS Resource Tags

The `awstags.yaml` file defines key-value pairs for tagging AWS resources created by the project. These tags will be applied to all AWS resources (such as SSO Permission Sets and IAM Policies) generated through CDK8s. The structure is simple and follows this format:

```yaml
tags:
  - key: owner
    value: john.doe
  - key: environment
    value: dev
  - key: team
    value: sre
```

You can customize the tag values as needed. These tags are critical for organizing, tracking, and managing resources in AWS. The tags are applied automatically to all supported AWS resources when the manifests are generated.

### k8stags.yaml - Kubernetes annotations tags

The `k8stags.yaml` file contains key-value pairs for Kubernetes annotations. These annotations are applied to the Kubernetes resources defined in the project, providing metadata for Kubernetes-native operations. Example format:

```yaml
tags:
  - key: app
    value: sso-management
  - key: team
    value: sre
```

The annotations specified here will be applied to resources created in the Kubernetes environment, such as IdentityStore users or groups. Modify these tags as needed to provide relevant metadata for your resources.

### accounts.yaml - AWS Accounts Configuration

The `accounts.yaml` file defines the AWS accounts and their associated SSO groups. It is essential for defining which permission sets (groups) apply to which AWS accounts. Example format:

```yaml
Accounts:
  - AccountId: "111111111111"
    AccountName: "MyAccount1"
    AccountEmail: root1.email@example.com
    SSOGroups:
      - SRE-Standard
      - SRE-Elevated
  - AccountId: "222222222222"
    AccountName: "MyAccount2"
    AccountEmail: root2.email@example.com
    SSOGroups:
      - SRE-Standard
      - Infra-Network-Standard
```

Each account can be associated with multiple SSO groups. Modify this file to assign permission sets (SSO groups) to the AWS accounts managed by your organization.

### groups.yaml - SSO Groups Configuration

The `groups.yaml` file defines the SSO groups that are created and configured for AWS SSO. It includes key details about group policies, inline policies, permissions boundaries, and members. Example format:

```yaml
Groups:
  - Name: SRE_Standard
    DisplayName: "Site Reliability Engineering Standard"
    Description: "Standard access for SRE team members."
    ManagedPolicies:
      - AmazonEC2ReadOnlyAccess
      - AmazonS3ReadOnlyAccess
    CustomerManagedPolicies:
      - SRE-Standard-CustomPolicy
    InlinePolicies: []
    BoundaryPolicy: SSOBoundaryPolicy-Standard
    SessionDuration: PT8H
    Members:
      - UserName: "user1"
      - UserName: "user2"
```

This file defines the permissions and policies for each group and the users who belong to them. You can update group memberships, attach custom policies, or define inline policies by modifying this configuration.

### sso-configs.yaml - AWS SSO Configuration

The `sso-configs.yaml` file provides configuration settings for AWS SSO, such as the ARN of the SSO instance. This is necessary for creating resources like permission sets in the correct AWS SSO instance. Example:

```yaml
SSOAdminInstanceARN: arn:aws:sso:::instance/ssoins-xxxxxxxxxxxxxxx
SSOAdminIdentityStoreId: d-xxxxxxxxxxxxxxxxx
```

Make sure this ARN matches the SSO instance in your AWS environment.

### users.yaml - AWS IdentityStore Users Configuration

The `users.yaml` file defines the users to be created in AWS IdentityStore, which is integrated with AWS SSO. Each user has attributes like name, email, and role details. 

- **UserName**: AWS IAM username.
- **DisplayName**: The display name of the user.
- **Email**: User’s email.
- **PreferredLanguage**: Preferred language setting for the user.

Example:

```yaml
users:
  - UserName: "robin.banks"
    DisplayName: "Robin Banks"
    Name:
      FamilyName: "Banks"
      GivenName: "Robin"
    Title: "Cloud Operations Engineer"
    Email: "robin.banks@example.com"
    TimeZone: "Eastern Standard Time"
    PhoneNumber: "+1-202-555-0147"
    PreferredLanguage: "en-US"
```

This file allows you to dynamically manage users across different accounts and SSO groups. Each user is associated with the SSO identity store and managed through the generated manifests.

### boundary policies and custom policies - IAM Policy JSON Files

These directories contain JSON files that define IAM boundary and custom policies, respectively. These policies are linked to the SSO groups via `groups.yaml`.

- **Boundary Policies**: These policies limit the maximum permissions users or groups can have, restricting access to critical actions like resource deletion.
- **Custom Policies**: These policies define specific sets of permissions tailored to different teams and use cases, such as elevated access for disaster recovery or limited read/write access for cost management.

The files must be in valid JSON format and should reflect the specific permissions required by each group.

Example boundary policy file (SSOBoundaryPolicy_Standard.json):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ec2:Describe*",
        "s3:ListBucket"
      ],
      "Resource": "*"
    }
  ]
}
```

Modify these files as required to reflect the actual IAM policies needed in your environment.


## Executing the CDK8s

### Install dependencies

To set up the project, first install the necessary dependencies:

```bash
npm install
```

This will install required packages such as `cdk8s`, `cdk8s-cli`, and other necessary modules for generating Kubernetes manifests.

### Create CDK8s manifests

Once the manifests are generated, deploy them to the Kubernetes cluster:

```bash
cdk8s deploy
```

This will apply the Kubernetes manifests to manage AWS SSO, IAM policies, and CloudFormation StackSets through Crossplane.