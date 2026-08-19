#!/bin/sh
set -e

# Install Homebrew dependencies
brew install node@20 || true
brew link node@20 --force --overwrite || true

# Install npm dependencies from repo root
cd "$CI_PRIMARY_REPOSITORY_PATH"
npm install

# Run pod install
cd ios
pod install
