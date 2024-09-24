# Route53 CDK8s Setup

## Table of Contents

- [Route53 CDK8s Setup](#route53-cdk8s-setup)
  - [Table of Contents](#table-of-contents)
  - [Importing CRDs for Crossplane](#importing-crds-for-crossplane)
    - [Example Bash Script for Importing CRDs:](#example-bash-script-for-importing-crds)
    - [Import the Providers/CRDs into the CDK8s Project:](#import-the-providerscrds-into-the-cdk8s-project)
  - [Coding with CDK8s (TypeScript)](#coding-with-cdk8s-typescript)
    - [Directory Structure:](#directory-structure)

## Importing CRDs for Crossplane

Create the shell file to import your CRDs for the Crossplane Provider resource templates.

Each provider set creates CRDs under the name `{service}.aws.upbound.io`, for example:

- `iam.aws.upbound.io`
- `ecs.aws.upbound.io`
- `s3.aws.upbound.io`

Each of these CRDs represents a template kind, for example:

- `accountpasswordpolicies.iam.aws.upbound.io`
- `accountsettingdefaults.ecs.aws.upbound.io`
- `bucketaccelerateconfigurations.s3.aws.upbound.io`

A complete list is available at [Crossplane Provider Upjet AWS CRDs](https://github.com/crossplane-contrib/provider-upjet-aws/tree/main/package/crds).

### Example Bash Script for Importing CRDs:

```bash
#!/bin/bash

# Array of keywords to filter CRDs.
provider_package=(
  "route53" 
  "iam" 
  "ecr"
)

# Create the directory if it doesn't exist and initialize the output YAML file.
mkdir -p crds
: > crds/crossplane.yaml

# Loop through the array and filter CRDs for each keyword.
for keyword in "${provider_package[@]}"; do
  # Get the list of CRDs that match the aws.upbound.io domain and the current keyword.
  while IFS= read -r crd; do
    echo "---" >> crds/crossplane.yaml
    kubectl get crd "$crd" --output yaml >> crds/crossplane.yaml
  done < <(kubectl get crd --no-headers | grep aws.upbound.io | grep "$keyword" | awk '{print $1}')
done
```

### Import the Providers/CRDs into the CDK8s Project:

If you only import the `crds/crossplane.yaml` file, execute the following command:

```sh
import k8s crds/crossplane.yaml
```

In the **Route53** provider, there is a bug where 'record' collides with the default TypeScript `Record`. To resolve this, ensure you add a `--class-prefix` as a workaround.
Ensure to use `--output` flag to prevent overwriting from general imports of the same type.

```sh
cdk8s import --class-prefix Route53 --output imports/route53_records https://raw.githubusercontent.com/crossplane-contrib/provider-upjet-aws/main/package/crds/route53.aws.upbound.io_records.yaml
```

You can add additional libraries by including them in the import command.

## Coding with CDK8s (TypeScript)

We follow a standardized data structure for our CDK8s project.

### Directory Structure:

- **`bin/`**: This directory contains the executable TypeScript files that define command-line tools or scripts for the project. The files in `bin/` are typically compiled to JavaScript and mapped to commands via the `bin` field in `package.json`, making them directly executable through the command line. These scripts are responsible for high-level tasks like deploying infrastructure or running specific commands related to the project’s functionality.
  
- **`lib/`**: The `lib/` directory is used to store the core logic and reusable modules of the project. These TypeScript files contain the main business logic, utilities, or helper functions that are imported and used by other parts of the application, including the scripts in `bin/`. The files in `lib/` are designed to be modular and maintainable, focusing on the core operations behind the scenes, which are separated from the command-line interface.
  
- **`configs/`**: This directory stores configuration templates in formats such as YAML or JSON. These files typically contain structured data, like arrays or key-value pairs, which are parsed and used by the project at runtime. For example, a DNS list in YAML format is stored in `configs/`, providing a configurable source of data that the scripts in `bin/` or modules in `lib/` can read and process dynamically. This allows for easy updates to the configuration without modifying the code itself.