#!/bin/bash
# Example builds for common scenarios

echo "Building example MCP packages..."
echo ""

# Ubuntu PC with SRT sandboxing
echo "1. Building ssh-ubuntupc (for SRT-sandboxed execution)..."
./build.sh ssh-ubuntupc

# Pi-hole without sandboxing
echo ""
echo "2. Building ssh-pihole (for direct execution)..."
./build.sh ssh-pihole

echo ""
echo "✓ Built example packages:"
ls -lh *.mcpb
echo ""
echo "Configuration suggestions:"
echo ""
echo "ssh-ubuntupc:"
echo "  Host: ubuntupc"
echo "  User: yourusername"
echo "  Key: C:\\Users\\YourUsername\\.ssh\\id_ed25519"
echo "  Wrapper: srt"
echo ""
echo "ssh-pihole:"
echo "  Host: pihole (or IP address)"
echo "  User: pi"
echo "  Key: C:\\Users\\YourUsername\\.ssh\\id_rsa"
echo "  Wrapper: (empty - direct execution)"
echo ""
