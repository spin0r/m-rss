#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies using yarn (as requested by previous Docker setup)
yarn install --frozen-lockfile

# Build the project
yarn build

# Optionally create required directories for persisting data, but note that 
# on Render Native Node Environment without a disk, they are ephemeral.
# If using a background disk, it should be mounted to /app/data or similar.
mkdir -p data sessions
