#!/usr/bin/env node

/**
 * Real-Time Collaborative Editing Example
 * 
 * This demonstrates how to edit a CryptPad document in real-time
 * using your local text editor. Changes made by collaborators in
 * their browsers will appear in your editor in real-time, and your
 * changes will appear in their browsers instantly.
 * 
 * Usage:
 *   node realtime-edit-example.js <pad_url> [editor]
 * 
 * Example:
 *   node realtime-edit-example.js "http://localhost:3000/code/#/2/code/edit/abc123.../" vim
 *   node realtime-edit-example.js "http://localhost:3000/pad/#/2/pad/edit/xyz789.../"
 */

const realtimeEditor = require('../src/cryptpad/realtime-editor');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

// Get arguments
const padUrl = process.argv[2];
const editor = process.argv[3]; // Optional

if (!padUrl) {
    console.error('Usage: node realtime-edit-example.js <pad_url> [editor]');
    console.error('');
    console.error('Arguments:');
    console.error('  pad_url  - Full URL to the CryptPad document');
    console.error('  editor   - Text editor to use (optional, defaults to $EDITOR or nano)');
    console.error('');
    console.error('Example:');
    console.error('  node realtime-edit-example.js \\');
    console.error('    "http://localhost:3000/code/#/2/code/edit/abc123.../" vim');
    console.error('');
    process.exit(1);
}

// Extract WebSocket URL from pad URL
const url = new URL(padUrl);
const wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}/cryptpad_websocket`;

console.log('='.repeat(70));
console.log('CryptPad - Real-Time Collaborative Editing');
console.log('='.repeat(70));
console.log('');
console.log(`Pad URL: ${padUrl}`);
console.log(`WebSocket: ${wsUrl}`);
console.log('');

// Create temporary file
const tempId = crypto.randomBytes(8).toString('hex');
const tempPath = path.join(os.tmpdir(), `cryptpad-${tempId}.txt`);

// Start real-time editing
realtimeEditor.startRealtimeEdit(
    padUrl,
    wsUrl,
    tempPath,
    editor,
    (err, result) => {
        console.log('');
        console.log('='.repeat(70));
        
        if (err) {
            console.error('✗ Error:', err.message);
            process.exit(1);
        } else {
            console.log('✓ Editing session completed successfully');
            console.log('  All changes have been synced to CryptPad');
            console.log('  Collaborators can see your edits in their browsers');
        }
        
        console.log('='.repeat(70));
        console.log('');
        process.exit(0);
    }
);

