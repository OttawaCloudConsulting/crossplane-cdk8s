# SSO Permissions CDK8s Setup

## Table of Contents

- [SSO Permissions CDK8s Setup](#sso-permissions-cdk8s-setup)
  - [Table of Contents](#table-of-contents)
  - [Overview](#overview)
  - [Crossplane Dependencies](#crossplane-dependencies)
  - [Directory Structure:](#directory-structure)
  - [Updating the configuration YAML files](#updating-the-configuration-yaml-files)
    - [awstags.yaml - AWS Resource Tags](#awstagsyaml---aws-resource-tags)
    - [k8stags.yaml - Kubernetes annotations tags](#k8stagsyaml---kubernetes-annotations-tags)
    - [accounts.yaml - AWS Accounts Configuration](#accountsyaml---aws-accounts-configuration)
    - [groups.yaml - SSO Groups Configuration](#groupsyaml---sso-groups-configuration)
    - [sso-configs.yaml - AWS SSO Configuration](#sso-configsyaml---aws-sso-configuration)
    - [users.yaml - AWS IdentityStore Users Configuration](#usersyaml---aws-identitystore-users-configuration)
    - [boundary-policies/ and custom-policies/ - IAM Policy JSON Files](#boundary-policies-and-custom-policies---iam-policy-json-files)
  - [Executing the CDK8s](#executing-the-cdk8s)
    - [Install dependencies](#install-dependencies)
    - [Create CDK8s manifests](#create-cdk8s-manifests)

## Overview

This project leverages CDK8s to manage AWS SSO Permission Sets, and AWS Identity Center Users and Groups resources. The infrastructure is defined using TypeScript, and manifests are generated and deployed via Crossplane. Tags for AWS resources and Kubernetes annotations are stored in YAML files, allowing for dynamic configuration. The CDK8s setup enables easy management of AWS Identity Center Users, Groups, AWS SSO Admin Permission Sets, and custom IAM Policies configurations using Kubernetes-native resources.

**Important Note - IAM Policies included in this project are for example purposes only. They are not suitable for production use, and have not been reviewed for security or even functional use**

## Crossplane Dependencies

This code was written with [Upbound AWS Providers Version 11.0](https://marketplace.upbound.io/providers/upbound/provider-family-aws/v1.11.0/providers?)

To deploy the created tempaltes, the kubernetes cluster must be running:
+ [provider-aws-ssoadmin](https://marketplace.upbound.io/providers/upbound/provider-aws-ssoadmin/v1.14.0)
+ [provider-aws-identitystore](https://marketplace.upbound.io/providers/upbound/provider-aws-identitystore/v1.14.0)
+ [provider-aws-iam](https://marketplace.upbound.io/providers/upbound/provider-aws-iam/v1.14.0)

## Directory Structure:

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
      - SRE_Standard
      - SRE_Elevated
  - AccountId: "222222222222"
    AccountName: "MyAccount2"
    AccountEmail: root2.email@example.com
    SSOGroups:
      - SRE_Standard
      - Infra_Network_Standard
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
      - SRE_Standard_CustomPolicy
    InlinePolicies: []
    BoundaryPolicy: SSOBoundaryPolicy_Standard
    SessionDuration: 3600
    Members:
      - UserName: "user1"
      - UserName: "user2"
```

This file defines the permissions and policies for each group and the users who belong to them. You can update group memberships, attach custom policies, or define inline policies by modifying this configuration.

### sso-configs.yaml - AWS SSO Configuration

The `sso-configs.yaml` file provides configuration settings for AWS SSO, such as the ARN of the SSO instance. This is necessary for creating resources like permission sets in the correct AWS SSO instance. Example:

```yaml
SSOAdminInstanceARN: arn:aws:sso:::instance/ssoins-12345678901234567
```

Make sure this ARN matches the SSO instance in your AWS environment.

### users.yaml - AWS IdentityStore Users Configuration

The `users.yaml` file defines the users to be created in AWS IdentityStore, which is integrated with AWS SSO. Each user has attributes like name, email, and role details. Example:

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

### boundary-policies/ and custom-policies/ - IAM Policy JSON Files

These directories contain JSON files that define IAM boundary and custom policies, respectively. These policies are linked to the SSO groups via `groups.yaml`.

- **Boundary Policies**: Policies applied as permission boundaries for specific SSO groups.
- **Custom Policies**: Policies created and attached to SSO groups as customer-managed policies.

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

Ensure all dependencies are installed by running the following command in the project root directory:

```bash
npm install
```

This will install required packages such as `cdk8s`, `cdk8s-cli`, and other necessary modules for generating Kubernetes manifests.

### Create CDK8s manifests

Once the configuration files are updated and dependencies installed, generate the manifests by running:

```bash
cdk8s synth
```

This command generates the Kubernetes manifests for AWS SSO users, groups, permission sets​⬤
