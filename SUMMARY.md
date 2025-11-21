# Generic SSH MCP - Summary

## What Changed from ubuntu-shell-mcp-srt

### 1. Directory Renamed
```
ubuntu-shell-mcp-srt → generic-ssh-mcp
```

### 2. Tool Name Changed
```
Tool: bash → command
```

Why: More accurate. The tool executes commands, which may or may not be bash depending on wrapper configuration.

### 3. Configurable Wrapper Added

**New config field in manifest.json:**
```json
"command_wrapper": {
  "title": "Command Wrapper",
  "description": "Optional wrapper command (e.g., 'srt', 'timeout 30', or empty)",
  "type": "string",
  "required": false,
  "default": ""
}
```

**Behavior:**
- Empty string: Direct execution (bash on remote)
- `srt`: Sandboxed execution with SRT
- `timeout 30`: Time-limited execution
- Any command that accepts a command string

### 4. Build Script Added

**New file:** `build.sh`

**Usage:**
```bash
./build.sh ssh-ubuntupc    # Creates ssh-ubuntupc.mcpb
./build.sh ssh-pihole      # Creates ssh-pihole.mcpb
```

**What it does:**
1. Updates manifest.json with specified name
2. Builds the package
3. Renames output to match specified name

### 5. Generic Naming

Package is now agnostic to target system and wrapper. You decide:
- Package name via build script
- Target system via config
- Wrapper via config

## How to Use

### Single System (Most Common)

1. Build once with target name:
```bash
cd ~/code/generic-ssh-mcp
./build.sh ssh-ubuntupc
```

2. Install `ssh-ubuntupc.mcpb` in Claude Desktop

3. Configure:
   - Host: yourserver
   - User: youruser
   - Key: C:\Users\YourUsername\.ssh\id_ed25519
   - Wrapper: `srt` (or empty for no wrapper)

### Multiple Systems

Build once for each:
```bash
./build.sh ssh-ubuntupc
./build.sh ssh-pihole
./build.sh ssh-prodserver
```

Install all three. Each has independent config.

## Configuration Examples

### Sandboxed Execution (SRT)
```
Host: yourserver
User: youruser
Key: C:\Users\YourUsername\.ssh\id_ed25519
Timeout: 30
Wrapper: srt
```

Commands execute as: `srt 'your-command'`

### Direct Execution
```
Host: yourserver
User: youruser  
Key: C:\Users\YourUsername\.ssh\id_ed25519
Timeout: 15
Wrapper: (empty)
```

Commands execute as: `your-command`

### Time-Limited Execution
```
Host: prodserver
User: deploy
Key: C:\Users\YourUsername\.ssh\id_rsa_prod
Timeout: 60
Wrapper: timeout 30
```

Commands execute as: `timeout 30 'your-command'`

## What Stays the Same

- Persistent SSH2 connection (fast)
- Interactive command detection
- Configurable timeout
- Error handling
- Logging
- Security model (when using SRT)

## Migration from Old Version

If you have `ubuntu-shell-mcp-srt` installed:

1. Build new version:
```bash
cd ~/code/generic-ssh-mcp
./build.sh ssh-ubuntupc
```

2. Install alongside old version (or replace it)

3. Configure wrapper field as `srt`

4. Test both work identically

5. Uninstall old version when comfortable

## Key Files

```
generic-ssh-mcp/
├── build.sh              # NEW: Build script for named packages
├── manifest.json         # UPDATED: Added wrapper config
├── server/index.js       # UPDATED: Tool renamed, wrapper logic
├── package.json          # UPDATED: New name/version
├── README.md             # UPDATED: Generic focus
├── SUMMARY.md            # NEW: This file
├── INSTALLATION.md       # Existing: SRT setup guide
├── COMPARISON.md         # Existing: Standard vs SRT
└── QUICKSTART.md         # Existing: Quick setup
```

## Version Number

**3.0.0** - Major version bump because:
- Breaking change: Tool renamed from `bash` to `command`
- New feature: Configurable wrapper
- Architecture: Generic instead of SRT-specific

## Backwards Compatibility

**Not compatible** with v2.x due to tool name change. Claude will see `command` tool instead of `bash` tool.

If you need both:
- Keep v2.x installed as `ubuntu-shell-mcp-srt`
- Install v3.x as `ssh-ubuntupc`
- Both will coexist with different tool names
