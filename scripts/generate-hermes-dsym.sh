#!/bin/sh

set -eu

if [ "${CONFIGURATION:-}" != "Release" ]; then
  exit 0
fi

hermes_framework_binary="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}/hermesvm.framework/hermesvm"
hermes_dsym_bundle="${DWARF_DSYM_FOLDER_PATH}/hermesvm.framework.dSYM"
hermes_dwarf_binary="${hermes_dsym_bundle}/Contents/Resources/DWARF/hermesvm"

if [ ! -f "$hermes_framework_binary" ]; then
  echo "warning: Hermes framework was not found at $hermes_framework_binary"
  exit 0
fi

if [ -d "$hermes_dsym_bundle" ]; then
  rm -rf "$hermes_dsym_bundle"
fi

if ! xcrun dsymutil "$hermes_framework_binary" -o "$hermes_dsym_bundle" 2>/dev/null; then
  echo "error: dsymutil could not generate the Hermes dSYM."
  exit 1
fi

if [ ! -f "$hermes_dwarf_binary" ]; then
  echo "error: Failed to generate the Hermes dSYM."
  exit 1
fi

hermes_framework_uuid="$(xcrun dwarfdump --uuid "$hermes_framework_binary" | awk '{print $2}')"
hermes_dsym_uuid="$(xcrun dwarfdump --uuid "$hermes_dwarf_binary" | awk '{print $2}')"

if [ -z "$hermes_framework_uuid" ] || [ "$hermes_framework_uuid" != "$hermes_dsym_uuid" ]; then
  echo "error: Hermes dSYM UUID does not match the embedded framework."
  exit 1
fi

echo "Generated Hermes dSYM with UUID $hermes_dsym_uuid"
