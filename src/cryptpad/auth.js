// auth.js - Handle CryptPad authentication with block-based login

const Listmap = require('chainpad-listmap');
const CpCrypto = require('chainpad-crypto');
const ChainPad = require('chainpad');
const Netflux = require('netflux-websocket');
const WebSocket = require('ws');
const session = require('./session');
const crypto = require('crypto');
const https = require('https');
const http = require('http');

// Import tweetnacl for block operations
let Nacl;
try {
    Nacl = require('tweetnacl/nacl-fast');
} catch (e) {
    console.error('Warning: tweetnacl not found. Block-based auth will not work.');
    console.error('Install with: npm install tweetnacl');
}

// Import scrypt-async (CRITICAL: must match browser implementation!)
const scryptAsync = require('scrypt-async');

// Scrypt parameters from CryptPad (logN=8 means N=2^8=256)
const SCRYPT_PARAMS = {
    logN: 8,     // logN (N = 2^8 = 256)
    r: 1024,     // block size parameter
    p: 1,        // parallelization parameter (not used by scrypt-async)
    dkLen: 192,  // derived key length in bytes
    interruptStep: 200  // for scrypt-async
};

// Helper to convert base64 to hex
const base64ToHex = (b64String) => {
    const hexArray = [];
    Buffer.from(b64String.replace(/-/g, '/'), 'base64').forEach((byte) => {
        let h = byte.toString(16);
        if (h.length === 1) { h = '0' + h; }
        hexArray.push(h);
    });
    return hexArray.join('');
};

// Helper to decode base64 (URL-safe)
const decodeBase64 = (str) => {
    return Buffer.from(str.replace(/-/g, '/').replace(/_/g, '+'), 'base64');
};

// Helper to encode base64 (standard, with + and =)
const encodeBase64 = (bytes) => {
    return Buffer.from(bytes).toString('base64');
};

// URL-safe base64 encoding for block operations (CryptPad-style: only replace /)
// CRITICAL: CryptPad does NOT replace + or remove =, only replaces / with -
const urlSafeB64 = (uint8Array) => {
    return Buffer.from(uint8Array).toString('base64')
        .replace(/\//g, '-');
};

// Block operations (from CryptPad's login-block.js)
const Block = {
    // Generate block keys from 64-byte seed
    genkeys: function(seed) {
        if (!Nacl) {
            throw new Error('tweetnacl not available');
        }
        if (!(seed instanceof Uint8Array)) {
            throw new Error('INVALID_SEED_FORMAT');
        }
        if (!seed || typeof(seed.length) !== 'number' || seed.length < 64) {
            throw new Error('INVALID_SEED_LENGTH');
        }
        
        const signSeed = seed.subarray(0, Nacl.sign.seedLength); // 32 bytes
        const symmetric = seed.subarray(Nacl.sign.seedLength, 
            Nacl.sign.seedLength + Nacl.secretbox.keyLength); // 32 bytes
        
        return {
            sign: Nacl.sign.keyPair.fromSeed(signSeed),
            symmetric: symmetric
        };
    },
    
    // Get block URL from keys
    getBlockUrl: function(keys, baseUrl) {
        // Use URL-safe base64 for HTTP request (/ -> -)
        const publicKey = urlSafeB64(keys.sign.publicKey);
        return baseUrl + '/block/' + publicKey.slice(0, 2) + '/' + publicKey;
    },
    
    // Get block hash (URL + symmetric key)
    getBlockHash: function(keys, baseUrl) {
        const url = Block.getBlockUrl(keys, baseUrl);
        const symmetric = urlSafeB64(keys.symmetric);
        return url + '#' + symmetric;
    },
    
    // Decrypt block content
    decrypt: function(u8_content, keys) {
        if (!Nacl) {
            throw new Error('tweetnacl not available');
        }
        
        // Block format: [version (1 byte)] + [nonce (24 bytes)] + [ciphertext]
        const nonce = u8_content.subarray(1, 1 + Nacl.secretbox.nonceLength);
        const box = u8_content.subarray(1 + Nacl.secretbox.nonceLength);
        
        const plaintext = Nacl.secretbox.open(box, nonce, keys.symmetric);
        if (!plaintext) {
            return null;
        }
        
        try {
            const decrypted = Buffer.from(plaintext).toString('utf8');
            return JSON.parse(decrypted);
        } catch (e) {
            console.error('Block decryption error:', e);
            return null;
        }
    }
};

// Fetch block from server via HTTP
const fetchBlock = (blockUrl, callback) => {
    const urlObj = new URL(blockUrl);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    console.log('Fetching block from:', blockUrl);
    
    client.get(blockUrl, (res) => {
        if (res.statusCode === 404) {
            return callback(new Error('Block not found (404) - account may not use block-based auth'));
        }
        if (res.statusCode !== 200) {
            return callback(new Error('Block fetch failed: HTTP ' + res.statusCode));
        }
        
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
            const blockData = Buffer.concat(chunks);
            callback(null, new Uint8Array(blockData));
        });
    }).on('error', (err) => {
        callback(new Error('Block fetch error: ' + err.message));
    });
};

// Derive keys from username and password using scrypt
// CRITICAL: Must use scrypt-async library, not Node.js crypto.scrypt!
// They produce different outputs even with identical parameters.
const deriveFromPassphrase = (username, password, callback) => {
    const normalizedUsername = username.toLowerCase();
    
    scryptAsync(
        password,
        normalizedUsername,  // salt (no loginSalt configured)
        SCRYPT_PARAMS.logN,  // logN (N = 2^8 = 256)
        SCRYPT_PARAMS.r,     // block size parameter (r)
        SCRYPT_PARAMS.dkLen, // derived key length
        SCRYPT_PARAMS.interruptStep, // interruptStep
        (derivedBytes) => {
            callback(null, new Uint8Array(derivedBytes));
        },
        'binary'  // encoding
    );
};

// Helper to convert Uint8Array to hex
const uint8ArrayToHex = (uint8Array) => {
    return Array.from(uint8Array).map(b => b.toString(16).padStart(2, '0')).join('');
};

// Helper to convert hex to base64
const hexToBase64 = (hexString) => {
    const bytes = Buffer.from(hexString, 'hex');
    return bytes.toString('base64').replace(/\//g, '-').replace(/\+/g, '-').replace(/=/g, '');
};

// Allocate derived bytes to different purposes (matching CryptPad's allocateBytes)
const allocateBytes = (bytes) => {
    const result = {};
    let offset = 0;
    
    // First 18 bytes for encryption key (edit key)
    const encryptionSeed = bytes.slice(offset, offset + 18);
    offset += 18;
    result.editKeyStr = encodeBase64(encryptionSeed);
    
    // Next 16 bytes for channel seed
    const channelSeed = bytes.slice(offset, offset + 16);
    offset += 16;
    
    // Convert channel seed to hex (32 hex chars from 16 bytes)
    const channelHex = uint8ArrayToHex(channelSeed);
    if (channelHex.length !== 32) {
        throw new Error('Invalid channel ID length');
    }
    
    // Convert hex to base64 for the channel ID
    result.chanId = hexToBase64(channelHex);
    result.channelHex = channelHex;
    
    // Create keys object using the encryption seed
    result.keys = CpCrypto.createEditCryptor(null, encryptionSeed);
    
    // Make the edit key URL-safe
    result.keys.editKeyStr = result.keys.editKeyStr.replace(/\//g, '-');
    result.editKeyStr = result.keys.editKeyStr;
    
    // Skip curve25519 seed (32 bytes) and ed25519 seed (32 bytes)
    offset += 32; // curve seed
    offset += 32; // ed seed
    
    // Next 64 bytes for block keys
    const blockSeed = bytes.slice(offset, offset + 64);
    offset += 64;
    
    // Generate block keys if Nacl is available
    if (Nacl && blockSeed.length === 64) {
        try {
            result.blockKeys = Block.genkeys(new Uint8Array(blockSeed));
        } catch (e) {
            console.error('Block key generation failed:', e.message);
        }
    }
    
    return result;
};

// Login to CryptPad with block-based authentication
const login = (username, password, wsUrl, baseUrl, callback) => {
    let allocatedBytes;
    let network;
    let rt;
    
    console.log('Deriving keys from credentials...');
    
    // Step 1: Derive keys from username and password
    deriveFromPassphrase(username, password, (err, bytes) => {
        if (err) {
            return callback(new Error('Key derivation failed: ' + err.message));
        }
        
        allocatedBytes = allocateBytes(bytes);
        
        // Step 2: Try block-based authentication first
        if (allocatedBytes.blockKeys) {
            const blockUrl = Block.getBlockUrl(allocatedBytes.blockKeys, baseUrl);
            console.log('Attempting block-based authentication...');
            
            fetchBlock(blockUrl, (err, blockData) => {
                if (err) {
                    console.log('Block-based auth failed:', err.message);
                    console.log('Falling back to legacy authentication...');
                    return connectLegacy();
                }
                
                console.log('Block retrieved, decrypting...');
                const blockContent = Block.decrypt(blockData, allocatedBytes.blockKeys);
                
                if (!blockContent) {
                    console.log('Block decryption failed, falling back to legacy auth...');
                    return connectLegacy();
                }
                
                console.log('Block decrypted successfully!');
                
                // Extract userHash from block
                const userHash = blockContent.User_hash || blockContent.userHash;
                if (!userHash) {
                    console.log('No userHash in block, falling back to legacy auth...');
                    return connectLegacy();
                }
                
                console.log('Found userHash in block:', userHash.slice(0, 30) + '...');
                
                // Parse the userHash to extract version, mode, type, and key
                // Version 1: /1/edit/{channel_base64}/{key}/
                // Version 2: /2/drive/edit/{key}/
                const matchV1 = userHash.match(/\/1\/(edit|view)\/([^\/]+)\/([^\/]+)\//);
                const matchV2 = userHash.match(/\/2\/(\w+)\/(edit|view)\/([^\/]+)\//);
                
                let realKeys, channelHex;
                
                if (matchV2) {
                    console.log('Version 2 drive hash detected');
                    const [, type, mode, editKey] = matchV2;
                    console.log('  Type:', type, 'Mode:', mode);
                    console.log('  Edit Key:', editKey.slice(0, 16) + '...');
                    
                    // Convert URL-safe base64 back to standard base64 for createEditCryptor2
                    const standardEditKey = editKey.replace(/-/g, '/').replace(/_/g, '+');
                    
                    // For version 2, createEditCryptor2 generates the channel from the key
                    realKeys = CpCrypto.createEditCryptor2(standardEditKey);
                    
                    // Extract channel from keys.chanId (base64 -> hex)
                    channelHex = base64ToHex(realKeys.chanId);
                    console.log('  Derived Channel:', channelHex.slice(0, 16) + '...');
                    
                } else if (matchV1) {
                    console.log('Version 1 drive hash detected');
                    const [, mode, channelB64, editKey] = matchV1;
                    
                    // For version 1, channel is explicit in the hash
                    channelHex = base64ToHex(channelB64);
                    realKeys = CpCrypto.createEditCryptor2(editKey);
                    
                } else {
                    return callback(new Error('Unable to parse userHash format: ' + userHash));
                }
                
                console.log('Real drive channel (hex):', channelHex.slice(0, 16) + '...');
                
                // Connect to the REAL drive
                connectToRealDrive(channelHex, realKeys, userHash, blockContent);
            });
        } else {
            // No block keys available, use legacy auth
            console.log('Block keys not available, using legacy authentication...');
            connectLegacy();
        }
        
        // Connect to real drive with block-derived credentials
        function connectToRealDrive(channel, keys, userHash, blockContent) {
            console.log('Connecting to real user drive...');
            
            const getNetwork = () => {
                const f = () => new WebSocket(wsUrl);
                return Netflux.connect('', f);
            };
            
            network = getNetwork();
            
            const config = {
                network: network,
                channel: channel,
                data: {},
                validateKey: keys.validateKey,
                crypto: CpCrypto.createEncryptor(keys),
                logLevel: 0,
                classic: true,
                ChainPad: ChainPad
            };
            
            rt = Listmap.create(config);
            
            rt.proxy.on('ready', () => {
                console.log('Real drive connected!');
                
                const proxy = rt.proxy;
                
                // Extract user information
                const userData = {
                    username: username,
                    displayName: proxy['cryptpad.username'] || username,
                    userHash: userHash,
                    blockHash: Block.getBlockHash(allocatedBytes.blockKeys, baseUrl),
                    keys: keys,
                    proxy: proxy,
                    rt: rt,
                    network: network,
                    edPublic: proxy.edPublic || blockContent.edPublic,
                    curvePublic: proxy.curvePublic || blockContent.curvePublic
                };
                
                // Set session data
                session.setAuthData(userData);
                session.save();
                
                callback(null, userData);
            });
            
            rt.proxy.on('error', (info) => {
                if (rt) rt.stop();
                callback(new Error('Real drive error: ' + (info.message || info.type)));
            });
            
            rt.proxy.on('disconnect', (info) => {
                if (rt && !session.isAuthenticated()) {
                    rt.stop();
                    callback(new Error('Connection failed: ' + (info || 'disconnected')));
                }
            });
        }
        
        // Legacy authentication (direct channel connection)
        function connectLegacy() {
            console.log('Using legacy authentication method...');
            console.log('Channel ID:', allocatedBytes.chanId.slice(0, 16) + '...');
            
            const getNetwork = () => {
                const f = () => new WebSocket(wsUrl);
                return Netflux.connect('', f);
            };
            
            network = getNetwork();
            const channel = allocatedBytes.channelHex;
            
            const config = {
                network: network,
                channel: channel,
                data: {},
                validateKey: allocatedBytes.keys.validateKey,
                crypto: CpCrypto.createEncryptor(allocatedBytes.keys),
                logLevel: 0,
                classic: true,
                ChainPad: ChainPad
            };
            
            rt = Listmap.create(config);
            
            rt.proxy.on('ready', () => {
                console.log('Drive loaded');
                
                const proxy = rt.proxy;
                
                // Check if this looks like a valid user drive
                if (!proxy.edPublic && !proxy.curvePublic) {
                    rt.stop();
                    return callback(new Error('Invalid credentials or empty drive'));
                }
                
                const userData = {
                    username: username,
                    displayName: proxy['cryptpad.username'] || username,
                    userHash: '/1/edit/' + allocatedBytes.chanId + '/' + allocatedBytes.editKeyStr + '/',
                    blockHash: null,
                    keys: allocatedBytes.keys,
                    proxy: proxy,
                    rt: rt,
                    network: network,
                    edPublic: proxy.edPublic,
                    curvePublic: proxy.curvePublic
                };
                
                session.setAuthData(userData);
                session.save();
                
                callback(null, userData);
            });
            
            rt.proxy.on('error', (info) => {
                if (rt) rt.stop();
                callback(new Error('Drive error: ' + (info.message || info.type)));
            });
            
            rt.proxy.on('disconnect', (info) => {
                if (rt && !session.isAuthenticated()) {
                    rt.stop();
                    callback(new Error('Connection failed: ' + (info || 'disconnected')));
                }
            });
        }
    });
};

// Logout
const logout = (callback) => {
    session.clear();
    session.clearSavedSession();
    if (callback) {
        callback();
    }
};

module.exports = {
    login,
    logout,
    deriveFromPassphrase,
    allocateBytes
};

