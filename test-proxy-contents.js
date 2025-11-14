#!/usr/bin/env node

const Listmap = require('chainpad-listmap');
const CpCrypto = require('chainpad-crypto');
const ChainPad = require('chainpad');
const Netflux = require('netflux-websocket');
const WebSocket = require('ws');
const crypto = require('crypto');

const username = 'sean';
const password = '1Tennis!';
const wsUrl = 'ws://5.78.77.95:3013';

// CryptPad's actual scrypt parameters
const SCRYPT_PARAMS = {
    N: 8192,
    r: 8,
    p: 1,
    dkLen: 48
};

const base64ToHex = (b64String) => {
    const hexArray = [];
    Buffer.from(b64String.replace(/-/g, '/'), 'base64').forEach((byte) => {
        let h = byte.toString(16);
        if (h.length === 1) { h = '0' + h; }
        hexArray.push(h);
    });
    return hexArray.join('');
};

const encodeBase64 = (bytes) => {
    return Buffer.from(bytes).toString('base64')
        .replace(/\//g, '-')
        .replace(/\+/g, '-')
        .replace(/=/g, '');
};

console.log('Testing with username:', username);
console.log('Password length:', password.length);
console.log('');

// Derive keys
const normalizedUsername = username.toLowerCase();
console.log('Normalized username:', normalizedUsername);

crypto.scrypt(password, normalizedUsername, SCRYPT_PARAMS.dkLen, {
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 32 * 1024 * 1024
}, (err, derivedKey) => {
    if (err) {
        console.error('Scrypt failed:', err);
        process.exit(1);
    }
    
    console.log('Derived key (hex):', derivedKey.toString('hex'));
    console.log('');
    
    // Allocate bytes
    const editKeyBytes = derivedKey.slice(0, 18);
    const chanIdBytes = derivedKey.slice(18, 36);
    
    const editKeyStr = encodeBase64(editKeyBytes);
    const chanId = encodeBase64(chanIdBytes);
    
    console.log('Edit Key:', editKeyStr);
    console.log('Channel ID:', chanId);
    console.log('Hex Channel:', base64ToHex(chanId));
    console.log('');
    
    // Create keys
    const keys = CpCrypto.createEditCryptor2(editKeyStr);
    console.log('Validate Key:', keys.validateKey);
    console.log('');
    
    // Connect
    const getNetwork = () => {
        const f = () => new WebSocket(wsUrl);
        return Netflux.connect('', f);
    };
    
    const network = getNetwork();
    const channel = base64ToHex(chanId);
    
    const config = {
        network: network,
        channel: channel,
        data: {},
        validateKey: keys.validateKey,
        crypto: CpCrypto.createEncryptor(keys),
        logLevel: 1,
        classic: true,
        ChainPad: ChainPad
    };
    
    console.log('Creating Listmap...');
    const rt = Listmap.create(config);
    
    rt.proxy.on('ready', () => {
        console.log('\n✅ Drive connected!');
        console.log('');
        console.log('=== PROXY CONTENTS ===');
        console.log('All keys:', Object.keys(rt.proxy));
        console.log('');
        
        // Check for user identity keys
        console.log('edPublic:', rt.proxy.edPublic || '(not set)');
        console.log('curvePublic:', rt.proxy.curvePublic || '(not set)');
        console.log('displayName:', rt.proxy['cryptpad.username'] || '(not set)');
        console.log('');
        
        // Check for drive structure
        console.log('Has filesData:', !!rt.proxy.filesData);
        console.log('Has drive:', !!rt.proxy.drive);
        console.log('Has friends:', !!rt.proxy.friends);
        console.log('');
        
        // Full proxy dump
        console.log('=== FULL PROXY DUMP ===');
        console.log(JSON.stringify(rt.proxy, null, 2));
        
        rt.stop();
        process.exit(0);
    });
    
    rt.proxy.on('error', (info) => {
        console.error('\n❌ Error:', info);
        process.exit(1);
    });
    
    setTimeout(() => {
        console.log('\n⏱️ Timeout');
        process.exit(1);
    }, 30000);
});

