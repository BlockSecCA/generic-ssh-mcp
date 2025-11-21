#!/usr/bin/env node

/**
 * Generic SSH MCP Server (SSH2 Persistent Connection Version)
 * 
 * Executes commands on a remote server via SSH with optional command wrapper.
 * Uses ssh2 library with persistent connection for improved performance.
 * Supports configurable command wrappers (e.g., srt for sandboxing).
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { Client } from "ssh2";
import { readFileSync } from "fs";

console.error("[STARTUP] Generic SSH MCP Server starting...");

// SSH connection details from command line arguments
let sshHost = null;
let sshUser = null;
let sshKeyPath = null;
let commandTimeout = 15000; // Default 15 seconds
let commandWrapper = ''; // Optional wrapper command
let toolName = 'command'; // Default tool name, can be overridden

// Interactive commands that should be rejected
const INTERACTIVE_COMMANDS = [
  'sudo', 'su',
  'vim', 'vi', 'nano', 'emacs', 'pico',
  'top', 'htop', 'less', 'more', 'man',
  'ssh', 'telnet', 'ftp',
  'mysql', 'psql', 'mongo',
  'python', 'python3', 'node', 'irb', 'ruby'  // Without scripts
];

// Parse command line arguments
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--host' && i + 1 < args.length) {
    sshHost = args[i + 1];
  } else if (args[i] === '--user' && i + 1 < args.length) {
    sshUser = args[i + 1];
  } else if (args[i] === '--key' && i + 1 < args.length) {
    sshKeyPath = args[i + 1];
  } else if (args[i] === '--timeout' && i + 1 < args.length) {
    const timeoutSeconds = parseInt(args[i + 1], 10);
    if (!isNaN(timeoutSeconds) && timeoutSeconds > 0) {
      commandTimeout = timeoutSeconds * 1000; // Convert to milliseconds
      console.error(`[CONFIG] Command timeout set to ${timeoutSeconds} seconds`);
    }
  } else if (args[i] === '--wrapper' && i + 1 < args.length) {
    commandWrapper = args[i + 1].trim();
    if (commandWrapper) {
      console.error(`[CONFIG] Command wrapper set to: ${commandWrapper}`);
    }
  } else if (args[i] === '--tool-name' && i + 1 < args.length) {
    toolName = args[i + 1].trim();
    if (toolName) {
      console.error(`[CONFIG] Tool name set to: ${toolName}`);
    }
  }
}

if (!sshHost || !sshUser || !sshKeyPath) {
  console.error("[FATAL] Missing SSH configuration. --host, --user, and --key are required.");
  process.exit(1);
}

console.error(`[STARTUP] SSH Target: ${sshUser}@${sshHost}`);
console.error(`[STARTUP] SSH Key: ${sshKeyPath}`);
console.error(`[STARTUP] Command Timeout: ${commandTimeout/1000} seconds`);
console.error(`[STARTUP] Command Wrapper: ${commandWrapper || 'none (direct execution)'}`);
console.error(`[STARTUP] Tool Name: ${toolName}`);

// Persistent SSH connection
let sshClient = null;
let isConnecting = false;
let connectionReady = false;

/**
 * Wrap a command with the configured wrapper (if any)
 * @param {string} command - The original command
 * @returns {string} - The wrapped command or original if no wrapper
 */
function wrapCommand(command) {
  if (!commandWrapper) {
    return command; // No wrapper, return as-is
  }
  
  // Escape single quotes in the command for shell safety
  const escaped = command.replace(/'/g, "'\\''");
  
  // Wrap with the configured wrapper
  const wrapped = `${commandWrapper} '${escaped}'`;
  
  console.error(`[WRAPPER] Original: ${command}`);
  console.error(`[WRAPPER] Wrapped:  ${wrapped}`);
  
  return wrapped;
}

/**
 * Check if a command is likely to be interactive
 */
function isInteractiveCommand(command) {
  const trimmed = command.trim();
  const firstWord = trimmed.split(/\s+/)[0];
  
  // Check if it's a known interactive command without arguments
  if (INTERACTIVE_COMMANDS.includes(firstWord)) {
    // Allow if it has arguments (e.g., "python script.py" is okay, but "python" alone is not)
    const hasArgs = trimmed.split(/\s+/).length > 1;
    
    // Special case: sudo with -S or actual command is okay
    if (firstWord === 'sudo' && (trimmed.includes('-S') || hasArgs)) {
      return false;
    }
    
    // Special case: scripting languages with script files are okay
    if (['python', 'python3', 'node', 'ruby', 'irb'].includes(firstWord) && hasArgs) {
      return false;
    }
    
    return !hasArgs;
  }
  
  return false;
}

/**
 * Create and maintain persistent SSH connection
 */
async function ensureConnection() {
  // If already connected and ready, return immediately
  if (connectionReady && sshClient) {
    return sshClient;
  }

  // If currently connecting, wait for it
  if (isConnecting) {
    console.error("[SSH] Already connecting, waiting...");
    // Wait for connection to complete
    while (isConnecting) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    if (connectionReady && sshClient) {
      return sshClient;
    }
  }

  // Need to establish new connection
  isConnecting = true;
  connectionReady = false;

  return new Promise((resolve, reject) => {
    console.error("[SSH] Establishing new connection...");
    
    try {
      // Read private key
      const privateKey = readFileSync(sshKeyPath, 'utf8');
      
      // Create new SSH client
      const client = new Client();
      
      client.on('ready', () => {
        console.error("[SSH] ✓ Connection established and ready");
        sshClient = client;
        connectionReady = true;
        isConnecting = false;
        resolve(client);
      });
      
      client.on('error', (err) => {
        console.error(`[SSH] ✗ Connection error: ${err.message}`);
        connectionReady = false;
        isConnecting = false;
        sshClient = null;
        reject(new Error(`SSH connection failed: ${err.message}`));
      });
      
      client.on('close', () => {
        console.error("[SSH] Connection closed");
        connectionReady = false;
        sshClient = null;
      });
      
      client.on('end', () => {
        console.error("[SSH] Connection ended");
        connectionReady = false;
        sshClient = null;
      });
      
      // Connect
      console.error(`[SSH] Connecting to ${sshUser}@${sshHost}...`);
      client.connect({
        host: sshHost,
        port: 22,
        username: sshUser,
        privateKey: privateKey,
        readyTimeout: 10000,
      });
      
    } catch (error) {
      console.error(`[SSH] ✗ Setup error: ${error.message}`);
      isConnecting = false;
      reject(new Error(`SSH setup failed: ${error.message}`));
    }
  });
}

/**
 * Execute a command on the remote server via persistent SSH connection
 * Commands are automatically wrapped if a wrapper is configured
 * @param {string} command - The command to execute
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
async function executeRemoteCommand(command) {
  console.error(`[EXEC] Running command: ${command}`);
  
  // Check for interactive commands
  if (isInteractiveCommand(command)) {
    const firstWord = command.trim().split(/\s+/)[0];
    throw new Error(`Interactive command '${firstWord}' is not supported. Commands requiring user input cannot be executed. Try adding arguments or use non-interactive alternatives.`);
  }
  
  // Wrap command if wrapper is configured
  const finalCommand = wrapCommand(command);
  
  // Ensure we have a connection
  const client = await ensureConnection();
  
  return new Promise((resolve, reject) => {
    let timeoutHandle = null;
    let streamClosed = false;
    
    // Set up timeout
    timeoutHandle = setTimeout(() => {
      if (!streamClosed) {
        console.error(`[TIMEOUT] Command timed out after ${commandTimeout}ms`);
        streamClosed = true;
        // Kill the connection to force cleanup
        connectionReady = false;
        if (sshClient) {
          sshClient.end();
          sshClient = null;
        }
        reject(new Error(`Command timed out after ${commandTimeout/1000} seconds. Command may be hanging or taking too long.`));
      }
    }, commandTimeout);
    
    client.exec(finalCommand, (err, stream) => {
      if (err) {
        clearTimeout(timeoutHandle);
        console.error(`[ERROR] Exec failed: ${err.message}`);
        // Connection might be dead, clear it
        connectionReady = false;
        sshClient = null;
        reject(new Error(`Command execution failed: ${err.message}`));
        return;
      }
      
      let stdout = '';
      let stderr = '';
      
      stream.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        console.error(`[STDOUT] ${output.trim()}`);
      });
      
      stream.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        console.error(`[STDERR] ${output.trim()}`);
      });
      
      stream.on('close', (code, signal) => {
        if (streamClosed) return; // Already handled by timeout
        streamClosed = true;
        clearTimeout(timeoutHandle);
        
        console.error(`[EXEC] Command completed with exit code: ${code}`);
        resolve({
          stdout: stdout,
          stderr: stderr,
          exitCode: code || 0
        });
      });
      
      stream.on('error', (error) => {
        if (streamClosed) return; // Already handled by timeout
        streamClosed = true;
        clearTimeout(timeoutHandle);
        
        console.error(`[ERROR] Stream error: ${error.message}`);
        reject(new Error(`Stream error: ${error.message}`));
      });
    });
  });
}

// Create server instance
console.error("[STARTUP] Creating MCP Server instance...");
const server = new Server(
  {
    name: "generic-ssh",
    version: "3.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
console.error("[STARTUP] Server instance created successfully");

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  console.error("[HANDLER] ListTools called");
  
  const wrapperDescription = commandWrapper 
    ? `Commands are wrapped with: ${commandWrapper}

This provides additional control or security depending on the wrapper:
- 'srt': Sandboxed execution with filesystem/network restrictions
- 'timeout N': Time-limited execution (N seconds)
- 'nice -n N': Lower priority execution
- Custom wrappers: Any command that accepts a command string`
    : `Commands execute directly via bash with no wrapper.`;
  
  return {
    tools: [
      {
        name: toolName,
        description: `Execute a command on the remote server (${sshUser}@${sshHost}).

This version uses a persistent SSH2 connection for improved performance.

Execution mode: ${commandWrapper || 'direct (no wrapper)'}

${wrapperDescription}

Commands are executed via SSH and run with the privileges of the SSH user.

Examples:
- "ls -la /home/user"
- "df -h"
- "cat /etc/os-release"
- "docker ps"

Limitations:
- Interactive commands (sudo without args, vim, top, etc.) are not supported
- Commands timeout after ${commandTimeout/1000} seconds
- Commands run in a non-interactive shell

For sudo commands, use non-interactive alternatives or configure passwordless sudo.`,
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The command to execute on the remote server" + (commandWrapper ? ` (will be automatically wrapped with '${commandWrapper}')` : ""),
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});
console.error("[STARTUP] ListTools handler registered");

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  console.error(`[HANDLER] CallTool called with tool: ${name}`);
  
  try {
    if (name === toolName) {
      const command = args?.command;
      
      if (!command || typeof command !== 'string') {
        throw new Error("command parameter is required and must be a string");
      }
      
      if (command.trim().length === 0) {
        throw new Error("command cannot be empty");
      }
      
      // Execute the command using persistent connection with optional wrapper
      const result = await executeRemoteCommand(command);
      
      // Build response text
      let output = '';
      if (result.stdout) {
        output += result.stdout;
      }
      if (result.stderr) {
        if (output) output += '\n';
        output += `STDERR:\n${result.stderr}`;
      }
      if (!result.stdout && !result.stderr) {
        output = '(no output)';
      }
      output += `\n(exit code: ${result.exitCode})`;
      
      return {
        content: [
          {
            type: "text",
            text: output
          }
        ]
      };
    }
    
    throw new Error(`Unknown tool: ${name}`);
    
  } catch (error) {
    console.error(`[ERROR] Tool execution failed: ${error.message}`);
    return {
      content: [{
        type: "text",
        text: `Error: ${error.message}`
      }],
      isError: true,
    };
  }
});
console.error("[STARTUP] CallTool handler registered");

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.error("[SHUTDOWN] SIGTERM received, closing SSH connection...");
  if (sshClient) {
    sshClient.end();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.error("[SHUTDOWN] SIGINT received, closing SSH connection...");
  if (sshClient) {
    sshClient.end();
  }
  process.exit(0);
});

// Start the server
async function main() {
  try {
    console.error("[STARTUP] Creating transport...");
    const transport = new StdioServerTransport();
    
    console.error("[STARTUP] Connecting server to transport...");
    await server.connect(transport);
    
    console.error("[STARTUP] ✓ Server connected and ready");
    console.error(`[STARTUP] ✓ Target: ${sshUser}@${sshHost}`);
    console.error(`[STARTUP] ✓ Tool name: ${toolName}`);
    console.error("[STARTUP] ✓ SSH connection will be established on first command");
    if (commandWrapper) {
      console.error(`[STARTUP] ✓ All commands will be wrapped with: ${commandWrapper}`);
    } else {
      console.error("[STARTUP] ✓ Commands will execute directly (no wrapper)");
    }
    console.error("[STARTUP] ✓ Waiting for client requests...");
  } catch (error) {
    console.error("[FATAL] Server initialization failed:", error.message);
    console.error("[FATAL] Stack:", error.stack);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[FATAL] Uncaught error:", error.message);
  console.error("[FATAL] Stack:", error.stack);
  process.exit(1);
});
