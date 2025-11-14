#!/usr/bin/env node

const crypto = require('crypto');

const username = 'sean';
const password = '1Tennis!';

const SCRYPT_PARAMS = {
    N: 8192,
    r: 8,
    p: 1,
    dkLen: 48 // Only first 48 bytes, but CryptPad actually requests 192
};

const normalizedUsername = username.toLowerCase();

console.log('=== Byte Allocation Debug ===');
console.log('Username:', username, '(normalized:', normalizedUsername + ')');
console.log('Password:', password);
console.log('');

crypto.scrypt(password, normalizedUsername, 192, { // CryptPad uses 192 bytes!
    N: SCRYPT_PARAMS.N,
    r: SCRYPT_PARAMS.r,
    p: SCRYPT_PARAMS.p,
    maxmem: 32 * 1024 * 1024
}, (err, derivedKey) => {
    if (err) {
        console.error('Error:', err);
        process.exit(1);
    }
    
    console.log('Total derived bytes:', derivedKey.length);
    console.log('Full derived key (hex):', derivedKey.toString('hex'));
    console.log('');
    
    let offset = 0;
    
    // 18 bytes for encryption
    const encryptionSeed = derivedKey.slice(offset, offset + 18);
    console.log('Bytes 0-17 (encryption seed):', encryptionSeed.toString('hex'));
    offset += 18;
    
    // 16 bytes for channel
    const channelSeed = derivedKey.slice(offset, offset + 16);
    console.log('Bytes 18-33 (channel seed):', channelSeed.toString('hex'));
    const channelHex = Array.from(channelSeed).map(b => b.toString(16).padStart(2, '0')).join('');
    console.log('Channel hex:', channelHex);
    offset += 16;
    
    // 32 bytes for curve
    const curveSeed = derivedKey.slice(offset, offset + 32);
    console.log('Bytes 34-65 (curve seed):', curveSeed.toString('hex'));
    offset += 32;
    
    // 32 bytes for ed
    const edSeed = derivedKey.slice(offset, offset + 32);
    console.log('Bytes 66-97 (ed seed):', edSeed.toString('hex'));
    offset += 32;
    
    // 64 bytes for block
    const blockSeed = derivedKey.slice(offset, offset + 64);
    console.log('Bytes 98-161 (block seed):', blockSeed.toString('hex').slice(0, 40) + '...');
    offset += 64;
    
    console.log('');
    console.log('Total used:', offset, 'bytes');
    console.log('Remaining:', derivedKey.length - offset, 'bytes');
    
    process.exit(0);
});

