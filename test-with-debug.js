#!/usr/bin/env node

import axios from 'axios';

// Configuration
const apiKey = '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';
const model = 'anthropic/claude-3-haiku:free';

// Debug settings
const DEBUG = true;

// Simple logger function
function log(message, data = null) {
  if (DEBUG) {
    console.log(`DEBUG: ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

async function testOpenRouter() {
  try {
    log('Starting OpenRouter test with model:', model);

    // 1. Check key validity first
    log('Verifying API key...');
    try {
      const keyCheck = await axios.get(
        'https://openrouter.ai/api/v1/auth/key',
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      log('API key valid:', keyCheck.data);
    } catch (keyError) {
      log('API key check failed:', keyError.message);
      if (keyError.response) {
        log('Key check response:', keyError.response.data);
      }
    }

    // 2. List available models
    log('Fetching available models...');
    try {
      const modelsResponse = await axios.get(
        'https://openrouter.ai/api/v1/models',
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      log('Available models:', modelsResponse.data);
    } catch (modelError) {
      log('Failed to fetch models:', modelError.message);
      if (modelError.response) {
        log('Models response:', modelError.response.data);
      }
    }

    // 3. Try completion with ALL needed headers
    log('Sending completion request...');
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [{ role: 'user', content: 'Hello, what model are you?' }],
        transforms: ["middle-out"],
        route: "fallback",
        max_tokens: 100
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://cursor.com',
          'X-Title': 'MCP Debug Test',
          'X-Disable-Training': 'true'
        }
      }
    );

    log('Completion successful!');
    log('Response status:', response.status);
    log('Response data:', response.data);

    if (response.data?.choices?.[0]?.message?.content) {
      console.log('\nModel response:');
      console.log(response.data.choices[0].message.content);
    } else {
      console.log('No content in response');
    }

  } catch (error) {
    console.error('ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error data:', error.response.data);
    }
  }
}

testOpenRouter(); 