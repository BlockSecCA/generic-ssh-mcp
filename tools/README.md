# Claude Desktop Log Management Tools

Tools for viewing and archiving logs from Claude Desktop and MCP servers.

## Quick Start

**View logs**: Open `mcp-log-viewer.html` in your browser and drag/drop any `.log` file from `%APPDATA%\Claude\logs\`

**Archive logs**: 
```powershell
cd tools
.\archive-mcp-logs.ps1
```

## Available Tools

| File | Purpose |
|------|---------|
| `mcp-log-viewer.html` | Web-based log viewer with filtering and JSON parsing |
| `archive-mcp-logs.ps1` | Archives logs by date with incremental processing |
| `archive-logs.bat` | Batch launcher for archive script |
| `CLAUDE_LOG_FORMATS.md` | Complete log format reference |
| `LOG_ROTATION_README.md` | Log rotation best practices |

## Universal Log Viewer

**Supports all Claude Desktop log formats**:
- MCP server logs (`mcp-server-*.log`)
- Unified MCP log (`mcp.log`)
- Main application log (`main.log`)
- Web/window logs (`claude.ai-web.log`, `unknown-window.log`)

**Key features**:
- Automatic format detection and parsing
- Filter by message type, server name, log level, time range
- Extract and display MCP JSON-RPC messages
- Command-only view for tool call analysis
- Statistics dashboard
- Max file size: 5MB (browser limitation)

**Usage**:
1. Open in browser (Chrome, Firefox, Edge)
2. Drag/drop log file or use file picker
3. Apply filters to narrow results
4. Click entries to view full JSON payloads

## Archive Script

Archives logs by date with incremental processing to avoid reprocessing lines.

**Features**:
- Handles ISO and simple timestamp formats
- Creates dated files: `{basename}-YYYY-MM-DD.log`
- Tracks processing state in `.mcp-archive-state.json`
- Archives only new log lines on subsequent runs

**Output structure**:
```
%APPDATA%\Claude\logs\
├── archive/
│   ├── mcp-server-ssh-ubuntupc-2025-11-20.log
│   ├── mcp-2025-11-20.log
│   └── main-2025-11-20.log
└── .mcp-archive-state.json
```

**Typical log sizes** (daily):
- MCP server logs: 100KB - 5MB
- Unified MCP log: 200KB - 10MB
- Main log: 50KB - 2MB

**Recommendation**: Archive daily if logs exceed 10MB

## Automated Archiving (Optional)

Schedule daily archiving with Task Scheduler:

```powershell
$action = New-ScheduledTaskAction -Execute "PowerShell.exe" `
    -Argument "-File C:\path\to\tools\archive-mcp-logs.ps1"

$trigger = New-ScheduledTaskTrigger -Daily -At 2am

Register-ScheduledTask -TaskName "Archive Claude Logs" `
    -Action $action -Trigger $trigger
```

## Troubleshooting

**Viewer shows "Failed to parse"**: Check browser console for unparsed line format. May indicate new log format.

**Archive script skips many lines**: Log lines don't match expected timestamp formats. Review skipped lines.

**Large files crash browser**: Archive logs first, then view dated archives. Or use command-line tools for files >5MB.

**Archive script doesn't process recent entries**: Delete `.mcp-archive-state.json` and re-run to reprocess entire log.

## Advanced Usage

**Time range filtering**: Load log in viewer, use "Time Range" filter or quick filters (Last Hour, Last 3 Hours, etc.)

**Command analysis**: Open MCP server log, click "Commands Only" filter, review tool call sequences

**Correlating logs**: Note timestamp in one log, open related log in new tab, use time range filter to find corresponding events

**Export data**: Use "Select All" in raw view and copy/paste, or process archived dated logs with PowerShell

## Log Formats

See `CLAUDE_LOG_FORMATS.md` for complete format specifications and examples.

---

**Log Directory**: `%APPDATA%\Claude\logs\`  
**Archive Directory**: `%APPDATA%\Claude\logs\archive\`
