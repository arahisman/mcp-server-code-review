#!/usr/bin/env node

import axios from 'axios';

// API key to check
const apiKey = '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';

async function checkApiKey() {
  try {
    console.log('Checking OpenRouter API key...');
    
    const response = await axios.get(
      'https://openrouter.ai/api/v1/auth/key',
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
      }
    );
    
    console.log('Status:', response.status);
    console.log('Key info:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

checkApiKey(); 