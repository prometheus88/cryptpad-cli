#!/usr/bin/env node

/**
 * Real-Time Collaborative Editor for CryptPad
 * 
 * This module provides real-time collaborative editing from the CLI.
 * Changes made in the local editor are instantly sent to CryptPad,
 * and changes made by collaborators are instantly reflected in the local file.
 */

const fs = require('fs');
const { spawn } = require('child_process');
const CpNetflux = require('../../node_modules/chainpad-netflux');
const CpCrypto = require('../../node_modules/chainpad-crypto');
const ChainPad = require('../../node_modules/chainpad');
const Netflux = require('../../node_modules/netflux-websocket');
const WebSocket = require('../../node_modules/ws');

/**
 * Parse a CryptPad pad URL to extract keys and channel
 */
const parsePadUrl = (padUrl) => {
    const url = new URL(padUrl);
    const hash = url.hash;
    
    // Format: #/2/{type}/edit/{key}/
    const parts = hash.split('/');
    const version = parts[1];
    const type = parts[2];
    const mode = parts[3];
    const key = parts[4];
    
    return { version, type, mode, key };
};

/**
 * Get cryptographic keys from pad URL
 */
const getKeys = (padUrl) => {
    const { key } = parsePadUrl(padUrl);
    return CpCrypto.createEditCryptor2(key);
};

/**
 * Convert base64 to hex
 */
const base64ToHex = (b64String) => {
    const hexArray = [];
    const buffer = Buffer.from(b64String.replace(/-/g, '/'), 'base64');
    buffer.forEach((byte) => {
        let h = byte.toString(16);
        if (h.length === 1) { h = '0' + h; }
        hexArray.push(h);
    });
    return hexArray.join('');
};

/**
 * Open a text editor (vim, nano, or custom)
 */
const openEditor = (filePath, editor = null) => {
    // Determine editor to use
    const editorCmd = editor || process.env.EDITOR || process.env.VISUAL || 'nano';
    
    console.log(`Opening ${filePath} in ${editorCmd}...`);
    console.log('');
    console.log('📝 Real-time collaborative editing active!');
    console.log('   - Your changes will sync automatically');
    console.log('   - Collaborator changes will appear in real-time');
    console.log('   - Save frequently (most editors auto-save is fine)');
    console.log('   - Close the editor when done (Ctrl+X for nano, :wq for vim)');
    console.log('');
    
    // Spawn the editor in a way that inherits stdio
    const editorProcess = spawn(editorCmd, [filePath], {
        stdio: 'inherit',
        shell: true
    });
    
    return editorProcess;
};

/**
 * Start real-time collaborative editing
 * 
 * @param {string} padUrl - Full URL to the CryptPad document
 * @param {string} wsUrl - WebSocket URL
 * @param {string} localPath - Path to local file
 * @param {string} editor - Editor to use (optional)
 * @param {function} callback - Callback when editor closes
 */
const startRealtimeEdit = (padUrl, wsUrl, localPath, editor, callback) => {
    console.log('Connecting to collaborative pad...');
    
    // Parse URL and get keys
    const keys = getKeys(padUrl);
    const channel = base64ToHex(keys.chanId);
    
    // Create network connection
    const getNetwork = () => {
        const f = () => new WebSocket(wsUrl);
        return Netflux.connect('', f);
    };
    
    // Track state
    let rt;
    let chainpad;
    let lastRemoteContent = '';
    let lastLocalContent = '';
    let isUpdatingFromRemote = false;
    let isUpdatingFromLocal = false;
    let watcher;
    let editorProcess;
    let isClosing = false;
    
    // ChainPad configuration
    const config = {
        network: getNetwork(),
        channel: channel,
        crypto: CpCrypto.createEncryptor(keys),
        logLevel: 0,
        ChainPad: ChainPad,
        
        // Called when pad is ready with initial content
        onReady: (info) => {
            chainpad = info.realtime;
            const initialContent = chainpad.getUserDoc();
            
            console.log('✓ Connected to pad');
            console.log(`  Channel: ${channel.slice(0, 16)}...`);
            console.log('');
            
            // Write initial content to local file
            try {
                // Parse CryptPad document structure
                let textContent = initialContent;
                try {
                    const parsed = JSON.parse(initialContent);
                    textContent = parsed.content || initialContent;
                } catch (e) {
                    // Not JSON, use as-is
                }
                
                fs.writeFileSync(localPath, textContent, 'utf8');
                lastRemoteContent = textContent;
                lastLocalContent = textContent;
                
                console.log('✓ Initial content loaded');
            } catch (err) {
                console.error('Failed to write initial content:', err.message);
                cleanup();
                return callback(err);
            }
            
            // Start watching for local changes
            startWatching();
            
            // Open the editor
            editorProcess = openEditor(localPath, editor);
            
            editorProcess.on('exit', (code) => {
                console.log('');
                console.log('Editor closed');
                cleanup();
                callback(null, { closed: true, exitCode: code });
            });
            
            editorProcess.on('error', (err) => {
                console.error('Editor error:', err.message);
                cleanup();
                callback(err);
            });
        },
        
        // Called when remote changes are received
        onRemote: (info) => {
            if (isUpdatingFromLocal || isClosing) return;
            if (!chainpad) return; // Not ready yet
            
            const remoteContent = chainpad.getUserDoc();
            
            // Parse CryptPad document structure
            let textContent = remoteContent;
            try {
                const parsed = JSON.parse(remoteContent);
                textContent = parsed.content || remoteContent;
            } catch (e) {
                // Not JSON, use as-is
            }
            
            // Check if content actually changed
            if (textContent === lastRemoteContent) {
                return;
            }
            
            console.log('📥 Received remote changes from collaborator');
            
            isUpdatingFromRemote = true;
            lastRemoteContent = textContent;
            
            try {
                // Update local file
                fs.writeFileSync(localPath, textContent, 'utf8');
                lastLocalContent = textContent;
            } catch (err) {
                console.error('Failed to update local file:', err.message);
            }
            
            isUpdatingFromRemote = false;
        },
        
        onError: (err) => {
            console.error('Pad error:', err);
            cleanup();
            callback(new Error('Pad error: ' + err));
        }
    };
    
    // Start watching local file for changes
    const startWatching = () => {
        let debounceTimer = null;
        
        watcher = fs.watch(localPath, (eventType, filename) => {
            if (isUpdatingFromRemote || isClosing) return;
            
            // Debounce file changes (editors often write multiple times)
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                handleLocalChange();
            }, 100);
        });
    };
    
    // Handle local file changes
    const handleLocalChange = () => {
        if (isUpdatingFromRemote || isClosing || !chainpad) return;
        
        try {
            const newContent = fs.readFileSync(localPath, 'utf8');
            
            // Check if content actually changed
            if (newContent === lastLocalContent) {
                return;
            }
            
            console.log('📤 Sending your changes to collaborators...');
            
            isUpdatingFromLocal = true;
            lastLocalContent = newContent;
            
            // Wrap in CryptPad document structure if needed
            let docContent = newContent;
            const currentDoc = chainpad.getUserDoc();
            try {
                const parsed = JSON.parse(currentDoc);
                if (parsed.content !== undefined) {
                    // Preserve document structure
                    parsed.content = newContent;
                    docContent = JSON.stringify(parsed);
                }
            } catch (e) {
                // Not JSON, use plain text
            }
            
            // Send to CryptPad
            chainpad.contentUpdate(docContent);
            
            console.log('✓ Changes sent');
            
            isUpdatingFromLocal = false;
        } catch (err) {
            console.error('Failed to read local changes:', err.message);
            isUpdatingFromLocal = false;
        }
    };
    
    // Cleanup function
    const cleanup = () => {
        if (isClosing) return;
        isClosing = true;
        
        console.log('Cleaning up...');
        
        if (watcher) {
            watcher.close();
            watcher = null;
        }
        
        if (editorProcess && !editorProcess.killed) {
            editorProcess.kill();
        }
        
        if (rt && rt.stop) {
            rt.stop();
        }
        
        // Remove temporary file
        try {
            if (fs.existsSync(localPath)) {
                fs.unlinkSync(localPath);
            }
        } catch (e) {
            // Ignore cleanup errors
        }
    };
    
    // Handle process termination
    process.on('SIGINT', () => {
        console.log('');
        console.log('Interrupted, cleaning up...');
        cleanup();
        process.exit(0);
    });
    
    process.on('SIGTERM', () => {
        cleanup();
        process.exit(0);
    });
    
    // Start the ChainPad connection
    try {
        rt = CpNetflux.start(config);
    } catch (err) {
        console.error('Failed to start ChainPad:', err.message);
        cleanup();
        callback(err);
    }
};

module.exports = {
    startRealtimeEdit,
    parsePadUrl,
    getKeys
};

