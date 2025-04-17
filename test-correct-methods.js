#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Log file for debugging
const LOG_FILE = path.join(process.cwd(), 'correct-methods-debug.log');

// Start logging
console.log(`Starting debugging with correct method names to ${LOG_FILE}`);
fs.writeFileSync(LOG_FILE, `Correct Methods Debug Log - ${new Date().toISOString()}\n\n`);

// Logger function
function log(message) {
  const logMessage = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(LOG_FILE, logMessage);
  console.log(message);
}

log('Starting MCP server...');

// Start the MCP server
const mcpProcess = spawn('node', [
  '--experimental-specifier-resolution=node',
  path.join(process.cwd(), 'dist/index.js'),
  '--api-key',
  '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',
  '--default-model',
  'meta-llama/llama-3-8b-instruct:free'
]);

// Log stderr (server logs)
mcpProcess.stderr.on('data', (data) => {
  const output = data.toString();
  log(`SERVER LOG: ${output.trim()}`);
});

// Handle stdin/stdout for the server
let buffer = '';
mcpProcess.stdout.on('data', (data) => {
  buffer += data.toString();
  
  // Try to parse complete JSON-RPC messages
  const lines = buffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      log(`SERVER OUTPUT: ${line}`);
    }
  }
  buffer = lines[lines.length - 1];
});

// Handle server close
mcpProcess.on('close', (code) => {
  log(`Server process exited with code ${code}`);
});

// Using CORRECT method names from SDK
const testRequests = [
  // Test 1: tools/list - this is the correct method name for ListToolsRequestSchema
  {
    jsonrpc: '2.0',
    id: '1',
    method: 'tools/list',
    params: {}
  },
  
  // Test 2: tools/call - this is the correct method name for CallToolRequestSchema
  {
    jsonrpc: '2.0',
    id: '2',
    method: 'tools/call',
    params: {
      name: 'ask',
      arguments: {
        prompt: 'Say "Hello from SDK with correct method names"'
      }
    }
  }
];

// Send the test requests
let testIndex = 0;
function sendNextTest() {
  if (testIndex >= testRequests.length) {
    log('All tests complete');
    setTimeout(() => {
      log('Shutting down...');
      mcpProcess.kill();
    }, 3000);
    return;
  }
  
  const request = testRequests[testIndex++];
  log(`Sending test ${testIndex}: ${JSON.stringify(request)}`);
  mcpProcess.stdin.write(JSON.stringify(request) + '\n');
  
  // Wait before sending next test
  setTimeout(sendNextTest, 5000);
}

// Wait for server to start, then send tests
setTimeout(() => {
  log('Server should be ready, starting tests...');
  sendNextTest();
}, 3000); 