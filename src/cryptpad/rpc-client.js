#!/usr/bin/env node

/**
 * WebSocket RPC Client for CryptPad
 * 
 * Implements anonymous RPC calls over WebSocket, similar to CryptPad's anonRpc
 */

const WebSocket = require('../../node_modules/ws');
const crypto = require('crypto');

// Message timeout
const TIMEOUT = 30000; // 30 seconds

/**
 * Create an anonymous RPC client
 */
class AnonRpcClient {
    constructor(wsUrl) {
        this.wsUrl = wsUrl;
        this.ws = null;
        this.connected = false;
        this.pending = new Map(); // txid -> {resolve, reject, timeout}
        this.messageQueue = [];
    }

    /**
     * Connect to WebSocket server
     */
    connect(callback) {
        if (this.connected) {
            return callback(null);
        }

        console.log(`Connecting to RPC WebSocket: ${this.wsUrl}`);

        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
            console.log('RPC WebSocket connected');
            this.connected = true;

            // Process queued messages
            while (this.messageQueue.length > 0) {
                const msg = this.messageQueue.shift();
                this.ws.send(msg);
            }

            callback(null);
        });

        this.ws.on('message', (data) => {
            this.handleMessage(data.toString());
        });

        this.ws.on('error', (err) => {
            console.error('RPC WebSocket error:', err.message);
            if (!this.connected) {
                callback(err);
            }
        });

        this.ws.on('close', () => {
            console.log('RPC WebSocket closed');
            this.connected = false;
            
            // Reject all pending requests
            this.pending.forEach((req) => {
                clearTimeout(req.timeout);
                req.reject(new Error('WebSocket closed'));
            });
            this.pending.clear();
        });
    }

    /**
     * Handle incoming WebSocket message
     */
    handleMessage(data) {
        try {
            const msg = JSON.parse(data);
            
            // RPC responses are in format: [txid, error, result]
            if (Array.isArray(msg) && msg.length >= 2) {
                const txid = msg[0];
                const error = msg[1];
                const result = msg[2];

                const pending = this.pending.get(txid);
                if (pending) {
                    clearTimeout(pending.timeout);
                    this.pending.delete(txid);

                    if (error) {
                        pending.reject(new Error(error));
                    } else {
                        pending.resolve(result);
                    }
                }
            }
        } catch (err) {
            console.error('Failed to parse RPC message:', err.message);
        }
    }

    /**
     * Send an RPC command
     * 
     * @param {string} command - RPC command name (e.g., 'WRITE_PRIVATE_MESSAGE')
     * @param {Array} args - Command arguments
     * @param {function} callback - Callback(error, result)
     */
    send(command, args, callback) {
        if (!this.connected) {
            return this.connect((err) => {
                if (err) return callback(err);
                this.send(command, args, callback);
            });
        }

        // Generate transaction ID
        const txid = crypto.randomBytes(16).toString('hex');

        // RPC message format: [txid, command, ...args]
        const message = JSON.stringify([txid, command, ...args]);

        // Set up timeout
        const timeout = setTimeout(() => {
            this.pending.delete(txid);
            callback(new Error('RPC timeout'));
        }, TIMEOUT);

        // Store pending request
        this.pending.set(txid, {
            resolve: (result) => callback(null, result),
            reject: (err) => callback(err),
            timeout: timeout
        });

        // Send message
        if (this.connected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(message);
        } else {
            this.messageQueue.push(message);
            this.connect((err) => {
                if (err) {
                    this.pending.delete(txid);
                    clearTimeout(timeout);
                    callback(err);
                }
            });
        }
    }

    /**
     * Close the connection
     */
    close() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.connected = false;
    }
}

/**
 * Create a new anonymous RPC client
 */
const createClient = (wsUrl) => {
    return new AnonRpcClient(wsUrl);
};

module.exports = {
    createClient,
    AnonRpcClient
};

