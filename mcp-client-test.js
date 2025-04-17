#!/usr/bin/env node

import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// Function to create a JSON-RPC request
function createRequest(method, params) {
  return {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params
  };
}

// Start the MCP server
const mcpProcess = spawn('npx', [
  'mcp-server-code-review',
  '--api-key',
  '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',
  '--default-model',
  'anthropic/claude-3-haiku:free'
]);

// Listen for server output
mcpProcess.stderr.on('data', (data) => {
  console.log(`Server log: ${data}`);
});

// Wait for the server to start up
setTimeout(() => {
  console.log('Sending MCP/listTools request...');
  
  // First, send the correct listTools request using MCP protocol
  const listToolsRequest = createRequest('MCP/listTools', {});
  mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
  
  // After some time, send a callTool request
  setTimeout(() => {
    console.log('Sending MCP/callTool request...');
    
    // Use the correct MCP/callTool method and parameters structure
    const callToolRequest = createRequest('MCP/callTool', {
      name: 'ask',
      arguments: {
        prompt: 'Hello, what model are you?'
      }
    });
    
    mcpProcess.stdin.write(JSON.stringify(callToolRequest) + '\n');
  }, 2000);
}, 1000);

// Listen for responses from the server
let buffer = '';
mcpProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  
  try {
    // Try to parse JSON responses (may be partial)
    const lines = buffer.split('\n');
    
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      if (line) {
        const response = JSON.parse(line);
        console.log('Received response:', JSON.stringify(response, null, 2));
      }
    }
    
    // Keep the last potentially incomplete line
    buffer = lines[lines.length - 1];
  } catch (error) {
    // This is fine - just means we got partial data
  }
});

// Clean up after 15 seconds
setTimeout(() => {
  console.log('Shutting down test client...');
  mcpProcess.kill();
  process.exit(0);
}, 15000); 