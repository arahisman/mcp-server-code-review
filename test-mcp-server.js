#!/usr/bin/env node

import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import axios from 'axios';

// Start the MCP server directly
const mcpProcess = spawn('node', [
  '--experimental-specifier-resolution=node',
  path.join(process.cwd(), 'dist/index.js'),
  '--api-key',
  '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',
  '--default-model',
  'anthropic/claude-3-haiku:free'
]);

// Buffer to collect stdout
let stdoutBuffer = '';
let serverReady = false;

// Listen for server output
mcpProcess.stderr.on('data', (data) => {
  const output = data.toString();
  console.log(`Server log: ${output}`);
  
  if (output.includes('OpenRouter MCP Server running on stdio')) {
    serverReady = true;
    sendRequests();
  }
});

// Function to create a JSON-RPC request
function createRequest(method, params) {
  return {
    jsonrpc: '2.0',
    id: uuidv4(),
    method,
    params
  };
}

// Handle server responses
mcpProcess.stdout.on('data', (data) => {
  stdoutBuffer += data.toString();
  processBuffer();
});

// Process the output buffer for JSON responses
function processBuffer() {
  const lines = stdoutBuffer.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    if (line) {
      try {
        const response = JSON.parse(line);
        console.log('Received response:', JSON.stringify(response, null, 2));
      } catch (e) {
        console.log('Non-JSON line:', line);
      }
    }
  }
  stdoutBuffer = lines[lines.length - 1];
}

// Send test requests to the server
function sendRequests() {
  console.log('Server is ready, sending requests...');
  
  // 1. First, test if OpenRouter API works directly
  testOpenRouterDirectly().then(() => {
    // 2. Send listTools request
    console.log('Sending MCP/listTools request...');
    const listToolsRequest = createRequest('MCP/listTools', {});
    mcpProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');
    
    // 3. Wait a bit then send callTool request
    setTimeout(() => {
      console.log('Sending MCP/callTool request...');
      const callToolRequest = createRequest('MCP/callTool', {
        name: 'ask',
        arguments: {
          prompt: 'What is your model name?'
        }
      });
      mcpProcess.stdin.write(JSON.stringify(callToolRequest) + '\n');
    }, 2000);
  });
}

// Test OpenRouter API directly
async function testOpenRouterDirectly() {
  console.log('Testing OpenRouter API directly...');
  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-haiku:free',
        messages: [{ role: 'user', content: 'Hello, can you say "MCP Test successful"?' }],
        transforms: ["middle-out"],
        route: "fallback"
      },
      {
        headers: {
          'Authorization': `Bearer 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`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cursor.com',
          'X-Title': 'MCP Debug Test',
          'X-Disable-Training': 'true'
        }
      }
    );
    
    console.log('Direct API test successful:', response.data.choices[0].message.content);
    return true;
  } catch (error) {
    console.error('Direct API test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Clean up after 30 seconds
setTimeout(() => {
  console.log('Test complete, shutting down...');
  mcpProcess.kill();
  process.exit(0);
}, 30000); 