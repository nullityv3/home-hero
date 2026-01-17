#!/bin/bash

# Deploy all Supabase Edge Functions
# Usage: ./deploy.sh [function-name]
# If no function name is provided, all functions will be deployed

set -e

FUNCTIONS=(
  "create-job"
  "list-jobs"
  "express-interest"
  "choose-hero"
  "send-chat"
)

if [ -z "$1" ]; then
  echo "Deploying all functions..."
  for func in "${FUNCTIONS[@]}"; do
    echo "Deploying $func..."
    supabase functions deploy "$func"
  done
  echo "All functions deployed successfully!"
else
  echo "Deploying $1..."
  supabase functions deploy "$1"
  echo "$1 deployed successfully!"
fi
