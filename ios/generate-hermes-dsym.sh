#!/bin/sh

set -eu

if [ "${CONFIGURATION:-}" != "Release" ] || [ "${PLATFORM_NAME:-}" != "iphoneos" ]; then
  exit 0
fi

hermes_binary="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}/hermesvm.framework/hermesvm"
hermes_dsym="${DWARF_DSYM_FOLDER_PATH}/hermesvm.framework.dSYM"
hermes_dwarf="${hermes_dsym}/Contents/Resources/DWARF/hermesvm"

if [ ! -f "${hermes_binary}" ]; then
  echo "error: Hermes binary was not found at ${hermes_binary}" >&2
  exit 1
fi

echo "Generating Hermes dSYM at ${hermes_dsym}"
if ! dsymutil_output=$(/usr/bin/dsymutil --quiet "${hermes_binary}" -o "${hermes_dsym}" 2>&1); then
  echo "${dsymutil_output}" >&2
  exit 1
fi

binary_uuid=$(/usr/bin/dwarfdump --uuid "${hermes_binary}" | /usr/bin/awk 'NR == 1 { print $2 }')
dsym_uuid=$(/usr/bin/dwarfdump --uuid "${hermes_dwarf}" | /usr/bin/awk 'NR == 1 { print $2 }')

if [ -z "${binary_uuid}" ] || [ "${binary_uuid}" != "${dsym_uuid}" ]; then
  echo "error: Hermes dSYM UUID (${dsym_uuid:-missing}) does not match the framework UUID (${binary_uuid:-missing})" >&2
  exit 1
fi

echo "Hermes dSYM UUID verified: ${binary_uuid}"
