const session = require('./session');
const CpCrypto = require('../../node_modules/chainpad-crypto');
const WebSocket = require('../../node_modules/ws');

// Set up WebSocket for Node.js environment
if (typeof(globalThis.WebSocket) === 'undefined') {
    globalThis.WebSocket = WebSocket;
}

// Message types
const Types = {
    message: 'MSG',
    unfriend: 'UNFRIEND',
    mapId: 'MAP_ID',
    mapIdAck: 'MAP_ID_ACK'
};

// Active channels
const channels = {};

// Base64 to hex conversion for channel IDs
const base64ToHex = (b64String) => {
    const hexArray = [];
    Buffer.from(b64String.replace(/-/g, '/'), 'base64').forEach((byte) => {
        let h = byte.toString(16);
        if (h.length === 1) { h = '0' + h; }
        hexArray.push(h);
    });
    return hexArray.join('');
};

// Open a channel to a friend using raw Netflux
const openChannel = (friend, wsUrl, callback) => {
    if (!session.isAuthenticated()) {
        return callback(new Error('Not authenticated'));
    }
    
    if (!friend || !friend.channel) {
        return callback(new Error('Invalid friend data'));
    }
    
    const channelId = friend.channel;
    
    // Return existing channel if already open
    if (channels[channelId]) {
        return callback(null, channels[channelId]);
    }
    
    console.log(`Opening message channel: ${channelId}`);
    
    const proxy = session.getProxy();
    
    // Derive Curve keys for encryption
    const curveKeys = CpCrypto.Curve.deriveKeys(friend.curvePublic, proxy.curvePrivate);
    if (!curveKeys) {
        return callback(new Error('Failed to derive curve keys'));
    }
    
    const encryptor = CpCrypto.Curve.createEncryptor(curveKeys);
    console.log(`Derived curve keys for ${friend.displayName}`);
    
    const ws = new WebSocket(wsUrl);
    let seq = 1;
    let joined = false;
    let historyRequested = false;
    let historyKeeper = null;
    const messages = [];
    const requests = {};
    const peers = [];
    
    const channel = {
        id: channelId,
        friend: friend,
        keys: curveKeys,
        encryptor: encryptor,
        messages: messages,
        ws: ws,
        seq: () => seq++,
        send: (msg) => {
            if (ws.readyState === 1) {
                ws.send(JSON.stringify(msg));
                return true;
            }
            return false;
        }
    };
    
    channels[channelId] = channel;
    
    ws.on('open', () => {
        console.log('✅ WebSocket connected');
        
        // Join the channel
        const joinMsg = [channel.seq(), 'JOIN', channelId];
        channel.send(joinMsg);
        console.log('📤 Sent JOIN to channel');
    });
    
    ws.on('message', (data) => {
        try {
            const dataStr = data.toString();
            const msg = JSON.parse(dataStr);
            
            // (Debug logging removed)
            
            if (!Array.isArray(msg)) return;
            
            const seq = msg[0];
            const peerId = msg[1];
            const type = msg[2]; // CRITICAL: Type is at index 2, not 1!
            
            // Handle ACK responses
            if (typeof seq === 'number' && requests[seq]) {
                const req = requests[seq];
                clearTimeout(req.timeout);
                req.resolve();
                delete requests[seq];
            }
            
            // Join acknowledged
            if (type === 'JACK') {
                joined = true;
                console.log('✅ Joined channel');
                return;
            }
            
            // Track peer joins to identify history keeper
            if (type === 'JOIN' && msg[3] === channelId) {
                if (!peers.includes(peerId)) {
                    peers.push(peerId);
                }
                
                // First peer to join is usually the history keeper
                if (!historyKeeper && peers.length > 0) {
                    historyKeeper = peers[0];
                    console.log(`History keeper identified for channel`);
                }
                
                // Request history after we identify the history keeper
                if (historyKeeper && !historyRequested) {
                    historyRequested = true;
                    setTimeout(() => {
                        const historySeq = channel.seq();
                        const historyMsg = [historySeq, 'MSG', historyKeeper, JSON.stringify([
                            'GET_HISTORY', channelId, {
                                metadata: {
                                    validateKey: curveKeys.validateKey,
                                    owners: [proxy.edPublic, friend.edPublic]
                                },
                                lastKnownHash: friend.lastKnownHash || ''
                            }
                        ])];
                        channel.send(historyMsg);
                    }, 200);
                }
                return;
            }
            
            // History message from history keeper: [seq, historyKeeper, "MSG", ourClientId, messageContent]
            // The content is a JSON array: [seq, hk, msgType, channelId, encryptedMsg]
            if (type === 'MSG' && peerId === historyKeeper && msg[4]) {
                try {
                    // msg[4] might be a JSON string or already an array
                    const content = typeof msg[4] === 'string' ? JSON.parse(msg[4]) : msg[4];
                    
                    // Check if it's the end-of-history signal
                    if (!Array.isArray(content) && content.state === 1 && content.channel === channelId) {
                        console.log(`✅ Loaded ${messages.length} messages from history`);
                        callback(null, channel);
                        return;
                    }
                    
                    // Check if it's a history message for our channel (format: [seq, hk, "MSG", channelId, encrypted])
                    if (Array.isArray(content) && content[3] === channelId) {
                        const encrypted = content[4]; // The actual encrypted message content
                        const decrypted = encryptor.decrypt(encrypted);
                        if (decrypted) {
                            const parsed = JSON.parse(decrypted);
                        
                            // Only process MSG type messages
                            if (parsed[0] === Types.message) {
                                const message = {
                                    type: parsed[0],
                                    author: parsed[1],
                                    timestamp: parsed[2],
                                    content: parsed[3],
                                    sig: encrypted.substring(0, 64)
                                };
                                
                                // Check for duplicates
                                const isDuplicate = messages.some(m => 
                                    m.timestamp === message.timestamp && m.author === message.author
                                );
                                
                                if (!isDuplicate) {
                                    messages.push(message);
                                }
                            }
                        }
                    }
                } catch (e) {
                    // Ignore parse/decrypt errors
                }
            }
            
            // End of history - check if peerId is actually a state object
            // Format: [0, {state: 1, channel: channelId}]
            if (typeof peerId === 'object' && peerId !== null && peerId.state === 1 && peerId.channel === channelId) {
                console.log(`✅ History complete: ${messages.length} messages loaded`);
                callback(null, channel);
                return;
            }
            
            // Real-time message: [sender, "MSG", encryptedContent]
            if (type === 'MSG' && typeof msg[2] === 'string') {
                try {
                    const decrypted = encryptor.decrypt(msg[2]);
                    if (decrypted) {
                        const parsed = JSON.parse(decrypted);
                        
                        if (parsed[0] === Types.message) {
                            const message = {
                                type: parsed[0],
                                author: parsed[1],
                                timestamp: parsed[2],
                                content: parsed[3],
                                sig: msg[2].substring(0, 64)
                            };
                            
                            // Check for duplicates
                            const isDuplicate = messages.some(m => 
                                m.timestamp === message.timestamp && m.author === message.author
                            );
                            
                            if (!isDuplicate) {
                                messages.push(message);
                                console.log(`📨 New message: "${message.content}"`);
                            }
                        }
                    }
                } catch (e) {
                    // Ignore decryption errors
                }
            }
        } catch (e) {
            // Ignore parse errors
        }
    });
    
    ws.on('error', (err) => {
        console.error(`❌ WebSocket error: ${err.message}`);
        callback(err);
    });
    
    ws.on('close', () => {
        console.log('🔌 WebSocket closed');
        delete channels[channelId];
    });
    
    // Timeout if we don't get history within 5 seconds
    setTimeout(() => {
        if (!historyRequested || messages.length === 0) {
            // No history received, but we're connected
            console.log('⚠️  No history received (channel might be empty)');
            if (joined) {
                callback(null, channel);
            }
        }
    }, 5000);
};

// Send a message to a friend
const sendMessage = (friend, messageText, wsUrl, callback) => {
    openChannel(friend, wsUrl, (err, channel) => {
        if (err) {
            return callback(err);
        }
        
        const proxy = session.getProxy();
        
        // CRITICAL: For friend chats, displayName is NOT included!
        // Message format: ["MSG", curvePublic, timestamp, content]
        const message = [
            Types.message,
            proxy.curvePublic,
            Date.now(),
            messageText
        ];
        
        const msgStr = JSON.stringify(message);
        
        try {
            // Encrypt the message
            const encrypted = channel.encryptor.encrypt(msgStr);
            
            // Broadcast to channel
            const broadcastSeq = channel.seq();
            const broadcastMsg = [broadcastSeq, 'MSG', channel.id, encrypted];
            
            console.log(`📤 Broadcasting message...`);
            
            const sent = channel.send(broadcastMsg);
            if (!sent) {
                return callback(new Error('Failed to send - WebSocket not open'));
            }
            
            // Add to local messages immediately
            channel.messages.push({
                type: message[0],
                author: message[1],
                timestamp: message[2],
                content: message[3],
                sig: encrypted.substring(0, 64)
            });
            
            // Wait for server ACK
            const timeout = setTimeout(() => {
                console.log('⚠️  No ACK received, but message may have been delivered');
                callback(null);
            }, 2000);
            
            // Store request for ACK handling
            channel.ws._requests = channel.ws._requests || {};
            channel.ws._requests[broadcastSeq] = {
                resolve: () => {
                    clearTimeout(timeout);
                    console.log(`✅ Message delivered to ${friend.displayName}: "${messageText}"`);
                    callback(null);
                },
                timeout: timeout
            };
            
        } catch (error) {
            callback(new Error('Failed to send message: ' + error.message));
        }
    });
};

// Get message history with a friend
const getMessages = (friend, wsUrl, callback) => {
    openChannel(friend, wsUrl, (err, channel) => {
        if (err) {
            return callback(err);
        }
        
        // Wait a bit to ensure all history is loaded
        setTimeout(() => {
            callback(null, channel.messages);
        }, 500);
    });
};

// Close a channel
const closeChannel = (friendChannel) => {
    const channel = channels[friendChannel];
    if (channel && channel.ws) {
        try {
            // Send LEAVE message
            const leaveMsg = [channel.seq(), 'LEAVE', channel.id, 'manual'];
            channel.send(leaveMsg);
            
            setTimeout(() => {
                if (channel.ws.readyState === 1) {
                    channel.ws.close();
                }
            }, 100);
            
            console.log(`Closed message channel: ${friendChannel.slice(0, 16)}...`);
        } catch (e) {
            console.error(`Error closing channel: ${e.message}`);
        }
        delete channels[friendChannel];
    }
};

// Close all channels
const closeAllChannels = () => {
    Object.keys(channels).forEach(channelId => {
        closeChannel(channelId);
    });
    console.log('All message channels closed');
};

module.exports = {
    openChannel,
    sendMessage,
    getMessages,
    closeChannel,
    closeAllChannels
};
