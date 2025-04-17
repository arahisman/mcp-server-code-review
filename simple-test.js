#!/usr/bin/env node

import axios from 'axios';

// Configuration
const apiKey = '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';

// Main function
async function main() {
  try {
    console.log('Testing OpenRouter API with claude-3-haiku:free...');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3-haiku:free',
        messages: [{ role: 'user', content: 'Say "Hello from OpenRouter"' }],
        transforms: ["middle-out"],
        route: "fallback"
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cursor.com',
          'X-Title': 'MCP Test',
          'X-Disable-Training': 'true'
        }
      }
    );
    
    console.log('Test successful!');
    console.log('-----------------');
    console.log('Response:', response.data.choices[0].message.content);
    console.log('-----------------');
    
    console.log('\nTesting with different model - Meta Llama 3 8B...');
    
    const response2 = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3-8b-instruct:free',
        messages: [{ role: 'user', content: 'Say "Hello from OpenRouter"' }],
        transforms: ["middle-out"],
        route: "fallback"
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cursor.com',
          'X-Title': 'MCP Test',
          'X-Disable-Training': 'true'
        }
      }
    );
    
    console.log('Test successful!');
    console.log('-----------------');
    console.log('Response:', response2.data.choices[0].message.content);
    console.log('-----------------');
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

main(); 