#!/bin/bash
# build.sh — Build Rime resource sync module ZIP
set -e

VERSION="${1:-v1.0.0}"
VERSION_CODE="${2:-1}"
MODULE_ID="rime_helper"
OUT_DIR="out"

echo "=== Rime Update Helper Build ==="
echo "Version: $VERSION ($VERSION_CODE)"

# Update module.prop
sed -i "s/^version=.*/version=$VERSION/" module/module.prop
sed -i "s/^versionCode=.*/versionCode=$VERSION_CODE/" module/module.prop

# Build WebUI
echo "--- Building WebUI ---"
cd webui
if [ ! -d node_modules ]; then
    echo "Installing dependencies..."
    npm install
fi
npm run build
cd ..

# Remove gitkeep from webroot if real files exist
if [ "$(ls -A module/webroot/ 2>/dev/null | grep -v .gitkeep)" ]; then
    rm -f module/webroot/.gitkeep
fi

# Package ZIP
echo "--- Packaging module ---"
mkdir -p "$OUT_DIR"
ZIP_NAME="${MODULE_ID}-${VERSION}.zip"
cd module
if ! command -v zip >/dev/null 2>&1; then
    echo "Error: zip 未安装，请先安装 zip 后再执行构建。" >&2
    exit 1
fi
zip -r9 "../${OUT_DIR}/${ZIP_NAME}" . \
    -x '*.gitkeep' \
    -x '.git/*'
cd ..

echo "--- Build complete ---"
echo "Output: ${OUT_DIR}/${ZIP_NAME}"
ls -lh "${OUT_DIR}/${ZIP_NAME}"
