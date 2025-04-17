#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const homeDir = process.env.HOME || process.env.USERPROFILE;
const mcpConfigPath = path.join(homeDir, '.cursor', 'mcp.json');

// Read the current config
console.log(`Reading MCP config from: ${mcpConfigPath}`);
const mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));

// Update the configuration
mcpConfig.mcpServers["mcp-server-code-review"] = {
  "name": "mcp-server-code-review",
  "command": "node",
  "args": [
    "--experimental-specifier-resolution=node",
    `${process.cwd()}/dist/index.js`,
    "--api-key",
    "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",
    "--default-model",
    "anthropic/claude-3-haiku:free"
  ],
  "transport": "stdio"
};

// Write the updated config
fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
console.log('MCP configuration updated successfully.');
console.log('Please restart Cursor to apply the changes.'); 