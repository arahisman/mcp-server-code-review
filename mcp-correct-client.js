#!/usr/bin/env node

import axios from 'axios';

// Configuration
const OPENROUTER_API_KEY = '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';
const MODEL = 'anthropic/claude-3-haiku:free';

// Create a direct client to OpenRouter
async function askOpenRouter(prompt) {
  try {
    console.log(`Asking OpenRouter: "${prompt}"`);
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        transforms: ["middle-out"],
        route: "fallback"
      },
      {
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/yourusername/mcp-server-code-review',
          'X-Title': 'MCP OpenRouter Tool',
          'X-Disable-Training': 'true'
        },
      }
    );
    
    if (response.data?.choices?.length > 0) {
      const content = response.data.choices[0].message.content;
      console.log('Response:', content);
      return content;
    } else {
      console.error('No content in response');
      return null;
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Run the test
askOpenRouter('Write a short poem about coding.'); 