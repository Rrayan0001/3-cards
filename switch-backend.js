#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const useSocketPath = path.join(__dirname, 'client/src/hooks/useSocket.tsx');

function switchBackend(type) {
  let content = fs.readFileSync(useSocketPath, 'utf8');
  
  if (type === 'local') {
    content = content.replace(
      /const serverUrl = process\.env\.NODE_ENV === 'production'[\s\S]*?\? '.*?'/,
      "const serverUrl = process.env.NODE_ENV === 'production'\n      ? 'http://localhost:5001' // Using local backend"
    );
    console.log('✅ Switched to LOCAL backend');
  } else if (type === 'production') {
    content = content.replace(
      /const serverUrl = process\.env\.NODE_ENV === 'production'[\s\S]*?\? '.*?'/,
      "const serverUrl = process.env.NODE_ENV === 'production'\n      ? 'https://three-cards.onrender.com' // Production backend"
    );
    console.log('✅ Switched to PRODUCTION backend');
  }
  
  fs.writeFileSync(useSocketPath, content);
  console.log('🔄 Please restart your frontend for changes to take effect');
}

const type = process.argv[2];

if (!type || !['local', 'production'].includes(type)) {
  console.log('Usage: node switch-backend.js [local|production]');
  console.log('  local      - Use local backend (localhost:5001)');
  console.log('  production - Use production backend (three-cards.onrender.com)');
  process.exit(1);
}

switchBackend(type);
