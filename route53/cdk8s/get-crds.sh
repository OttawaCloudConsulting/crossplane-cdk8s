#!/bin/bash

# Array of keywords to filter CRDs.
provider_package=(
  "route53"
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