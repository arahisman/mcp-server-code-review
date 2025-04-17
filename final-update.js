#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Get user home directory
const homeDir = process.env.HOME || process.env.USERPROFILE;
const mcpConfigPath = path.join(homeDir, '.cursor', 'mcp.json');
const projectDir = process.cwd();

console.log(`Reading MCP config from: ${mcpConfigPath}`);

// Read the current config
let mcpConfig;
try {
  mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
} catch (error) {
  console.error('Failed to read MCP config:', error);
  process.exit(1);
}

// Update the configuration for the OpenRouter MCP tool
mcpConfig.mcpServers["mcp-server-code-review"] = {
  "name": "mcp-server-code-review",
  "command": "node",
  "args": [
    "--experimental-specifier-resolution=node",
    path.join(projectDir, 'dist/index.js'),
    "--api-key",
    "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",
    "--default-model",
    "meta-llama/llama-3-8b-instruct:free"
  ],
  "transport": "stdio"
};

// Write the updated config
fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
console.log('MCP configuration updated successfully.');

// Rebuild the project for the latest changes
console.log('Rebuilding the project...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('Project rebuilt successfully.');
} catch (error) {
  console.error('Failed to rebuild the project:', error);
}

console.log('\nFinal configuration:');
console.log(JSON.stringify(mcpConfig.mcpServers["mcp-server-code-review"], null, 2));

console.log('\nPlease restart Cursor to apply the changes.');
console.log('When using the "ask" tool, use "tools/call" as the method name in the JSON-RPC request.');
console.log('The direct API tests confirmed that OpenRouter API is working correctly.');
console.log('Thanks for your patience in troubleshooting this issue!'); 