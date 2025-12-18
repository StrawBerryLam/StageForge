#!/bin/bash
# Script to download Noto Sans CJK Gothic fonts
# This script downloads the Noto Sans CJK variable fonts for Japanese, Simplified Chinese, and Traditional Chinese

set -e  # Exit on error

# Configuration
NOTO_VERSION="Sans2.004"
MIN_EXPECTED_SIZE=100000000  # 100MB minimum (actual file is ~247MB)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FONTS_DIR="${SCRIPT_DIR}"
DOWNLOAD_URL="https://github.com/notofonts/noto-cjk/releases/download/${NOTO_VERSION}/01_NotoSansCJK-OTF-VF.zip"

echo "Downloading Noto Sans CJK fonts..."
echo "Target directory: ${FONTS_DIR}"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "${TEMP_DIR}"' EXIT  # Cleanup on exit

# Download Noto Sans CJK
echo "Downloading Noto Sans CJK from ${DOWNLOAD_URL}..."
if ! curl -L --fail --silent --show-error "${DOWNLOAD_URL}" -o "${TEMP_DIR}/noto-sans-cjk.zip"; then
    echo "Error: Failed to download fonts from ${DOWNLOAD_URL}" >&2
    exit 1
fi

# Validate download (check file size - should be around 247MB)
FILE_SIZE=$(wc -c < "${TEMP_DIR}/noto-sans-cjk.zip" | tr -d ' ')
if [ "${FILE_SIZE}" -lt "${MIN_EXPECTED_SIZE}" ]; then
    echo "Error: Downloaded file is too small (${FILE_SIZE} bytes). Download may have failed." >&2
    exit 1
fi

# Format file size for display
if [ "${FILE_SIZE}" -ge 1073741824 ]; then
    SIZE_DISPLAY="$((FILE_SIZE / 1073741824))GiB"
elif [ "${FILE_SIZE}" -ge 1048576 ]; then
    SIZE_DISPLAY="$((FILE_SIZE / 1048576))MiB"
else
    SIZE_DISPLAY="${FILE_SIZE} bytes"
fi
echo "Downloaded ${SIZE_DISPLAY}"

# Extract fonts
echo "Extracting fonts..."
if ! unzip -q "${TEMP_DIR}/noto-sans-cjk.zip" -d "${TEMP_DIR}/noto-sans-cjk"; then
    echo "Error: Failed to extract fonts archive" >&2
    exit 1
fi

# Create fonts directory if it doesn't exist
mkdir -p "${FONTS_DIR}"

# Copy Variable fonts (smaller size)
echo "Copying fonts to ${FONTS_DIR}..."

FONTS_COPIED=0

# Copy Japanese Gothic
if [ -f "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKjp-VF.otf" ]; then
    cp "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKjp-VF.otf" "${FONTS_DIR}/NotoSansJP-VF.otf"
    echo "✓ Copied NotoSansJP-VF.otf"
    FONTS_COPIED=$((FONTS_COPIED + 1))
else
    echo "Warning: NotoSansCJKjp-VF.otf not found in archive" >&2
fi

# Copy Simplified Chinese Gothic
if [ -f "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKsc-VF.otf" ]; then
    cp "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKsc-VF.otf" "${FONTS_DIR}/NotoSansSC-VF.otf"
    echo "✓ Copied NotoSansSC-VF.otf"
    FONTS_COPIED=$((FONTS_COPIED + 1))
else
    echo "Warning: NotoSansCJKsc-VF.otf not found in archive" >&2
fi

# Copy Traditional Chinese Gothic
if [ -f "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKtc-VF.otf" ]; then
    cp "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKtc-VF.otf" "${FONTS_DIR}/NotoSansTC-VF.otf"
    echo "✓ Copied NotoSansTC-VF.otf"
    FONTS_COPIED=$((FONTS_COPIED + 1))
else
    echo "Warning: NotoSansCJKtc-VF.otf not found in archive" >&2
fi

# Verify at least one font was copied
if [ "${FONTS_COPIED}" -eq 0 ]; then
    echo "Error: No fonts were copied. Archive structure may have changed." >&2
    exit 1
fi

echo "Done! ${FONTS_COPIED} font(s) installed to ${FONTS_DIR}"
