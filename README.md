# MCP Server - Code Review

A server implementation for the Model Context Protocol (MCP) that connects Cursor to OpenRouter API via stdio, enabling code review and AI chat functionalities.

## Features

- Connects to OpenRouter API to access various large language models
- Provides two main functionalities:
  - Simple text prompt responses (`ask` tool)
  - Automated code review with project context analysis (`code_review` tool)
- Integrates with repomix for codebase packaging and analysis
- Supports multi-language project detection
- Runs as a stdio server compatible with the MCP protocol

## Installation

```bash
# Install globally
npm install -g mcp-server-code-review

# Or install locally in your project
npm install mcp-server-code-review
```

## Requirements

- Node.js v16 or higher
- OpenRouter API key - obtain one at [OpenRouter](https://openrouter.ai)

## Usage

### Command Line

```bash
mcp-server-code-review --api-key YOUR_OPENROUTER_API_KEY [--default-model MODEL_ID]
```

### Options

- `--api-key`, `-k` (required): Your OpenRouter API key
- `--default-model`, `-m` (optional): Default model to use (defaults to `google/gemini-2.0-flash-thinking-exp:free`)

### Example

```bash
mcp-server-code-review --api-key sk-or-v1-xxxxxxxxxxxx --default-model anthropic/claude-3-haiku:free
```

## MCP Tools

This server implements two main MCP tools:

### 1. Ask Tool

Sends a simple text prompt to OpenRouter API and returns the response.

```javascript
"mcp-openrouter-stdio": {
      "name": "mcp-openrouter-stdio",
      "command": "npx",
      "args": [
        "mcp-openrouter-stdio",
        "--api-key",
        "sk-or-v1-your_key",
        "--default-model",
        "google/gemini-2.0-flash-thinking-exp:free"
      ],
      "transport": "stdio"
    },
```

### 2. Code Review Tool

Performs a code review using OpenRouter API with project context analysis.

```javascript
{
  name: "code_review",
  arguments: {
    completed_tasks: ["Task 1", "Task 2"],
    work_report: "Details of the work performed",
    project_path: "/absolute/path/to/project",
    planned_tasks: ["Future task 1", "Future task 2"],
    language: "js", // Primary language of the project
    model: "optional-model-id" // Uses default if not specified
  }
}
```

## Supported Languages

The server can automatically detect and analyze projects in various programming languages:

- JavaScript/TypeScript (js)
- Python (python)
- C# (csharp)
- PHP (php)
- Java (java)
- Ruby (ruby)
- Go (go)
- Rust (rust)
- C++ (cpp)
- Swift (swift)

## Development

```bash
# Clone the repository
git clone https://github.com/arahisman/mcp-server-code-review.git
cd mcp-server-code-review

# Install dependencies
npm install

# Build the project
npm run build

# Watch mode for development
npm run watch
```

## Testing

The repository includes several test scripts:

```bash
# Basic server test
node test-mcp-server.js

# Test the ask tool
node test-ask.js

# Simple functionality test
node simple-test.js
```

## License

MIT

## Author

Adam Rahisman
