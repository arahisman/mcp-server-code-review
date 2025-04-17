#!/usr/bin/env node

import axios from 'axios';

// Replace with your actual API key
const apiKey = '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';
const model = 'anthropic/claude-3-haiku:free'; // Using a different model that should be available on free tier

async function testOpenRouter() {
  try {
    console.log('Sending request to OpenRouter...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: 'Hello, what model are you?' }],
        transforms: ["middle-out"], // Add transforms to compress
        route: "fallback" // Ensure using fallback if needed
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/yourusername/mcp-server-code-review',
          'X-Title': 'MCP OpenRouter Tool',
          'X-Disable-Training': 'true'
        },
      }
    );
    
    console.log('Status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.data?.choices?.length > 0) {
      console.log('Message content:', response.data.choices[0].message.content);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testOpenRouter(); 