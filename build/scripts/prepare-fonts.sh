#!/bin/bash
# Wrapper script to prepare Gothic fonts for StageForge
# This script delegates to the actual font download script

set -e

# Get the repository root directory
REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FONTS_SCRIPT="${REPO_ROOT}/src/renderer/fonts/download-fonts.sh"

echo "Preparing Gothic fonts for build..."

# Check if the font download script exists
if [ ! -f "${FONTS_SCRIPT}" ]; then
    echo "Error: Font download script not found at ${FONTS_SCRIPT}"
    exit 1
fi

# Make the font download script executable
chmod +x "${FONTS_SCRIPT}"

# Execute the font download script
bash "${FONTS_SCRIPT}"

echo "Font preparation complete!"
