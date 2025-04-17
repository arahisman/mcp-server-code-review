#!/usr/bin/env node

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import path from 'path';

// Create the server process
const serverProcess = spawn('node', [
  '--experimental-specifier-resolution=node',
  path.join(process.cwd(), 'dist/index.js'),
  '--api-key',
  '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',
  '--default-model',
  'meta-llama/llama-3-8b-instruct:free'
]);

// Create logs
serverProcess.stderr.on('data', (data) => {
  console.log(`SERVER LOG: ${data.toString().trim()}`);
});

// Wait for server to start up
setTimeout(async () => {
  try {
    console.log('Server should be ready, creating MCP client...');
    
    // Create MCP client with stdio transport
    const transport = new StdioClientTransport({
      input: serverProcess.stdout,
      output: serverProcess.stdin,
    });
    
    const client = new Client();
    await client.connect(transport);
    
    console.log('MCP client connected, listing tools...');
    
    // First, list the available tools
    const tools = await client.listTools({});
    console.log('Available tools:', JSON.stringify(tools.tools, null, 2));
    
    // Then, call the ask tool
    console.log('\nCalling ask tool...');
    const result = await client.callTool({
      name: 'ask',
      arguments: {
        prompt: 'Say "Hello from MCP SDK client" in Russian'
      }
    });
    
    console.log('Ask tool result:', JSON.stringify(result, null, 2));
    
    // Clean up
    console.log('Test complete, shutting down...');
    await client.close();
    serverProcess.kill();
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    serverProcess.kill();
    process.exit(1);
  }
}, 3000); 