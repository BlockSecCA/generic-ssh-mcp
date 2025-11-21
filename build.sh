#!/bin/bash
# Build script for generic-ssh-mcp
# Creates an MCP package with a specified name

set -e

if [ -z "$1" ]; then
    echo "Usage: ./build.sh <package-name>"
    echo ""
    echo "Examples:"
    echo "  ./build.sh ssh-ubuntupc"
    echo "  ./build.sh ssh-pihole"
    echo "  ./build.sh ssh-prodserver"
    echo ""
    echo "This will create a .mcpb file with the specified name."
    exit 1
fi

PACKAGE_NAME="$1"

echo "Building MCP package: ${PACKAGE_NAME}"

# Update manifest.json with the new name
jq ".name = \"${PACKAGE_NAME}\"" manifest.json > manifest.json.tmp
mv manifest.json.tmp manifest.json

echo "Updated manifest.json with name: ${PACKAGE_NAME}"

# Build the package
npx @anthropic-ai/mcpb@1.0.0 pack

# Rename the output file to match the package name
if [ -f "generic-ssh-mcp.mcpb" ]; then
    mv generic-ssh-mcp.mcpb "${PACKAGE_NAME}.mcpb"
    echo "Renamed to: ${PACKAGE_NAME}.mcpb"
fi

echo ""
echo "✓ Build complete!"
echo "✓ Package: ${PACKAGE_NAME}.mcpb"
echo ""
echo "To install:"
echo "  1. Transfer ${PACKAGE_NAME}.mcpb to Windows"
echo "  2. Double-click to install in Claude Desktop"
echo "  3. Configure SSH host, user, key, and optional wrapper (e.g., 'srt' for sandboxing)"
echo ""
