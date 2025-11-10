
// make-pad.js

const CpNetflux = require('chainpad-netflux');
const CpCrypto = require('chainpad-crypto');
const ChainPad = require('chainpad');
const Netflux = require("netflux-websocket");
const WebSocket = require("ws");

// console.log(CpCrypto.createEditCryptor2());

const makePad = (type = "code", content, wsUrl, baseUrl, title, cb, password) => {
    // Create keys with optional password protection
    const newPadKeys = CpCrypto.createEditCryptor2(void 0, void 0, password);
    
    // Build URL with password appended if provided
    let newPadUrl = baseUrl + `/${type}/#/2/${type}/edit/${newPadKeys.editKeyStr}`;
    if (password) {
        // Encode password for URL
        const encodedPassword = encodeURIComponent(password);
        newPadUrl += `/${encodedPassword}`;
    }
    
    const getNetwork = () => {
        const f = () => {
            return new WebSocket(wsUrl);
        };  
        return Netflux.connect('', f); 
    };

    const base64ToHex = (b64String) => {
        const hexArray = []; 
        atob(b64String.replace(/-/g, '/')).split("").forEach((e) => {
            let h = e.charCodeAt(0).toString(16);
            if (h.length === 1) { h = "0"+h; }
            hexArray.push(h);
        });
        return hexArray.join("");
    };  

    const keys = newPadKeys;
    const channel = base64ToHex(keys.chanId);

    const config = { 
        network: getNetwork(),
        channel: channel,
        crypto: CpCrypto.createEncryptor(keys),
        logLevel: 1,
        ChainPad: ChainPad
    };  
    let rt;
    config.onReady = info => {
        let chainpad = info.realtime;
        if (!chainpad) { return void cb('Error'); }
        
        // Update content with title if provided
        let finalContent = content;
        if (title) {
            try {
                const contentObj = JSON.parse(content);
                
                // Ensure metadata object exists
                if (!contentObj.metadata) {
                    contentObj.metadata = {};
                }
                
                // Add title to metadata
                contentObj.metadata.title = title;
                
                finalContent = JSON.stringify(contentObj);
            } catch (e) {
                // If content is not JSON, create proper structure with metadata
                finalContent = JSON.stringify({
                    content: content,
                    metadata: {
                        title: title
                    }
                });
            }
        }
        
        chainpad.contentUpdate(finalContent);
        chainpad.onSettle(() => {
            cb(void 0, newPadUrl);
            if (rt) { rt.stop(); }
        });
    };

    rt = CpNetflux.start(config);

    return rt; 

};

module.exports = { makePad }




//=============================
// usage examples
/*
const { makePad } = require('./make-pad.js')

const baseUrl = 'http://localhost:3000';
const wsUrl = 'ws://localhost:3000/cryptpad_websocket';

// Example 1: Create a public document (no password)
const newCodeContent = '{"content":"Test"}';
makePad('code', newCodeContent, wsUrl, baseUrl, 'My Code File', function (err, url) {
    if (err) { return console.error(err); }        
    console.log('Public pad created, available at:', url)
});

// Example 2: Create a password-protected document
const secretContent = '{"content":"Secret Information"}';
const password = 'MySecurePassword123';
makePad('code', secretContent, wsUrl, baseUrl, 'Secret File', function (err, url) {
    if (err) { return console.error(err); }        
    console.log('Password-protected pad created, available at:', url)
    console.log('Password:', password)
}, password);
*/