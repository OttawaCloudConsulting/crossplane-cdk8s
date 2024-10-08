# crossplane-cdk8s

This project contains various CDK8s based proejcts that create Crossplane resources.

## Why CDK8s?

When working with Crossplane to manage infrastructure, one option is to write raw YAML manifests directly. However, this approach can become cumbersome, especially as the infrastructure scales or becomes more complex. Instead, we use CDK8s to generate Crossplane manifests programmatically, which offers several advantages in terms of efficiency, maintainability, and scalability.

### 1. DRY (Don't Repeat Yourself) Principle

CDK8s allows us to apply the DRY principle by enabling the reuse of components and logic. Instead of writing repetitive YAML manifests for each resource, CDK8s lets us define abstractions and reusable patterns in TypeScript. These reusable components simplify the creation of multiple resources while reducing the redundancy typically associated with writing raw YAML.

For example, when creating multiple Route 53 records or hosted zones, CDK8s allows us to define a single, reusable function or class. This can be applied to different records and zones with slight configuration changes, reducing the need for copy-pasting similar YAML blocks and making the codebase cleaner and easier to maintain.

### 2. Simplified Maintenance with Configuration Files

Another key benefit of CDK8s is the separation of configuration from logic. By storing infrastructure details—such as domain names, DNS records, or tags—in simple YAML configuration files, we reduce the effort needed to manage or update infrastructure. Instead of editing complex YAML manifests directly, we can make changes to the configuration files, and CDK8s will automatically generate the necessary Crossplane manifests based on those updates.

This approach simplifies the process of scaling or modifying infrastructure, making it as easy as adjusting a few parameters in a YAML file, without touching the underlying logic or structure of the manifests.

### 3. Increased Efficiency and Scalability

CDK8s allows us to programmatically define infrastructure using TypeScript, which is inherently more powerful and flexible than writing static YAML manifests. With CDK8s, we can use loops, conditionals, and other programming constructs to automate the creation of complex infrastructure configurations. This greatly increases efficiency, particularly when managing large-scale infrastructure that would otherwise require manually writing dozens or hundreds of YAML files.

In addition, by keeping our infrastructure definitions as code, we make it easier to scale, modify, and extend the infrastructure over time. As new requirements emerge, we can leverage the same TypeScript logic to handle different environments, regions, or configurations, all while minimizing errors and the effort required to make changes.

### 4. Easier Collaboration and Extensibility

CDK8s integrates seamlessly with modern development workflows, making it easier for teams to collaborate. Developers familiar with TypeScript can quickly understand and contribute to the infrastructure code. This is more accessible than maintaining a large collection of static YAML manifests, especially as the project grows and evolves.

In summary, writing CDK8s code to generate Crossplane manifests provides us with a more maintainable, scalable, and efficient way to manage our infrastructure. By combining the power of programmatic infrastructure definitions with simple YAML configuration files, we ensure that our infrastructure remains flexible, modular, and easy to modify as the project grows.

## Why not Helm or other tool?

### 1. If you all you have is a hammer ...

We like to test and experiment with other tools, so that we can understand their benefits and limitations. Whilst Helm, Kustomize, etc., are all great sometimes it's good to experiment.
There are times where we can come up against edge cases that regular tools just are not a great fit. Rather than force ourselves down a particular development path, we have an alternative option.

### 2. Tool familiarity

As an AWS Developer / Infrastructure Developer, we've worked a lot with the AWS CDK tool to generate IaC. In a project where we migrate from AWS CDK to Crossplane, CDK8s provided a very convenient bridge to use for complex templating.

### 3. The template generator is less important than the templates

In great agile teams there is a large amount of consistency for tooling, practices and process. Every Developer/Engineer is a unique individual, however, and this is usually exhibited in the 'local dev' spaces. Nobody uses cookie cutter terminals, we all have bash configs, plugins, and various tools that we individually use that are a best fit our own personalities and styles.

With this concept at the base of working practicalities, the code that gets committed to git is more important than 'how' or 'where' it came from. Templates can be written by hand from scratch, copied from public repos and tweaked for our environment, copied from various online Tutorials or How-Tos or (*Shudders*) generated by a GPT! At the end of the day, if the code is clean, functional, and conforms with our internal standards then it passes QC to be merged.

## Packages

**[route53](./route53)** | Creates AWS Route53 Zones and RecordSets from simple YAML
**[SSO Permissions](./sso-permissions)** | Creates AWS SSO Permissions Sets, including IAM Policies, Boundary Policies, and AWS IdentityStore Users and Groups.
