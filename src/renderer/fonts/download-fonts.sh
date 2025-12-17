#!/bin/bash
# Script to download Noto Sans CJK Gothic fonts

FONTS_DIR="$(dirname "$0")"
NOTO_VERSION="Sans2.004"

echo "Downloading Noto Sans CJK fonts..."

# Create temporary directory
TEMP_DIR=$(mktemp -d)

# Download Noto Sans CJK
echo "Downloading Noto Sans CJK..."
curl -L "https://github.com/notofonts/noto-cjk/releases/download/${NOTO_VERSION}/01_NotoSansCJK-OTF-VF.zip" -o "${TEMP_DIR}/noto-sans-cjk.zip"

# Extract fonts
echo "Extracting fonts..."
unzip -q "${TEMP_DIR}/noto-sans-cjk.zip" -d "${TEMP_DIR}/noto-sans-cjk"

# Copy Variable fonts (smaller size)
echo "Copying fonts..."
mkdir -p "${FONTS_DIR}"

# Copy Japanese Gothic
if [ -f "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKjp-VF.otf" ]; then
    cp "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKjp-VF.otf" "${FONTS_DIR}/NotoSansJP-VF.otf"
    echo "✓ Copied NotoSansJP-VF.otf"
fi

# Copy Simplified Chinese Gothic
if [ -f "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKsc-VF.otf" ]; then
    cp "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKsc-VF.otf" "${FONTS_DIR}/NotoSansSC-VF.otf"
    echo "✓ Copied NotoSansSC-VF.otf"
fi

# Copy Traditional Chinese Gothic
if [ -f "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKtc-VF.otf" ]; then
    cp "${TEMP_DIR}/noto-sans-cjk/Variable/OTF/NotoSansCJKtc-VF.otf" "${FONTS_DIR}/NotoSansTC-VF.otf"
    echo "✓ Copied NotoSansTC-VF.otf"
fi

# Cleanup
rm -rf "${TEMP_DIR}"

echo "Done! Fonts downloaded to ${FONTS_DIR}"
