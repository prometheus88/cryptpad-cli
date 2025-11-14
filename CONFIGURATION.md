# CryptPad CLI Configuration Guide

This guide explains how to configure the CryptPad CLI to connect to different CryptPad instances.

## Required Environment Variables

The CLI requires two environment variables:

- **`CRYPTPAD_BASE_URL`** - The HTTP(S) URL of your CryptPad server
- **`CRYPTPAD_WS_URL`** - The WebSocket URL of your CryptPad server

## Configuration Examples

### Official CryptPad Instance (cryptpad.fr)

```bash
export CRYPTPAD_BASE_URL="https://cryptpad.fr"
export CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"
```

### Self-Hosted Instance (HTTP, no SSL)

```bash
export CRYPTPAD_BASE_URL="http://your-server.com:3010"
export CRYPTPAD_WS_URL="ws://your-server.com:3013"
```

### Self-Hosted Instance (HTTPS with SSL)

```bash
export CRYPTPAD_BASE_URL="https://cryptpad.example.com"
export CRYPTPAD_WS_URL="wss://cryptpad.example.com/cryptpad_websocket"
```

### Self-Hosted with Custom Ports

```bash
export CRYPTPAD_BASE_URL="https://cryptpad.example.com:8443"
export CRYPTPAD_WS_URL="wss://cryptpad.example.com:8444/cryptpad_websocket"
```

### Local Development Instance

```bash
export CRYPTPAD_BASE_URL="http://localhost:3000"
export CRYPTPAD_WS_URL="ws://localhost:3003"
```

## Configuration Methods

### Method 1: Shell Profile (Recommended for Regular Use)

Add to your `~/.bashrc`, `~/.zshrc`, or `~/.profile`:

```bash
# CryptPad CLI Configuration
export CRYPTPAD_BASE_URL="https://cryptpad.fr"
export CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"
```

Then reload your shell:
```bash
source ~/.bashrc  # or ~/.zshrc
```

### Method 2: `.env` File with Helper Script

Create a `.env` file in the cryptpad-cli directory:

```bash
# .env
CRYPTPAD_BASE_URL="https://cryptpad.fr"
CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"
```

Create a launcher script `cryptpad-cli.sh`:

```bash
#!/bin/bash
# Load environment variables from .env file
if [ -f "$(dirname "$0")/.env" ]; then
    export $(cat "$(dirname "$0")/.env" | grep -v '^#' | xargs)
fi

# Start the CLI
node "$(dirname "$0")/bin/drive-cryptpad"
```

Make it executable and run:
```bash
chmod +x cryptpad-cli.sh
./cryptpad-cli.sh
```

### Method 3: Inline Environment Variables

For one-time use or testing:

```bash
CRYPTPAD_BASE_URL="https://cryptpad.fr" \
CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \
node bin/drive-cryptpad
```

### Method 4: systemd Service (Linux)

Create `/etc/systemd/system/cryptpad-cli.service`:

```ini
[Unit]
Description=CryptPad CLI Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/cryptpad-cli
Environment="CRYPTPAD_BASE_URL=https://cryptpad.fr"
Environment="CRYPTPAD_WS_URL=wss://cryptpad.fr/cryptpad_websocket"
ExecStart=/usr/bin/node /path/to/cryptpad-cli/bin/drive-cryptpad
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

### Method 5: Docker Container

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

ENV CRYPTPAD_BASE_URL="https://cryptpad.fr"
ENV CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket"

CMD ["node", "bin/drive-cryptpad"]
```

Build and run:
```bash
docker build -t cryptpad-cli .
docker run -it \
  -e CRYPTPAD_BASE_URL="https://cryptpad.fr" \
  -e CRYPTPAD_WS_URL="wss://cryptpad.fr/cryptpad_websocket" \
  cryptpad-cli
```

## Multiple Instance Configuration

If you work with multiple CryptPad instances, create separate launcher scripts:

**`cryptpad-production.sh`**:
```bash
#!/bin/bash
export CRYPTPAD_BASE_URL="https://cryptpad.example.com"
export CRYPTPAD_WS_URL="wss://cryptpad.example.com/cryptpad_websocket"
node bin/drive-cryptpad
```

**`cryptpad-testing.sh`**:
```bash
#!/bin/bash
export CRYPTPAD_BASE_URL="http://localhost:3000"
export CRYPTPAD_WS_URL="ws://localhost:3003"
node bin/drive-cryptpad
```

## Finding Your WebSocket URL

The WebSocket URL depends on your CryptPad configuration:

### Standard Installation
If your CryptPad is at `https://cryptpad.example.com`, try:
- `wss://cryptpad.example.com/cryptpad_websocket`

### Custom Configuration
Check your CryptPad server's `config/config.js`:

```javascript
httpAddress: 'https://cryptpad.example.com',
websocketPath: '/cryptpad_websocket',  // This is your WebSocket path
```

### Testing the URLs

You can test if your configuration is correct:

**Test HTTP URL:**
```bash
curl $CRYPTPAD_BASE_URL
# Should return HTML content
```

**Test WebSocket URL (using websocat or similar):**
```bash
# Install websocat first: cargo install websocat
websocat $CRYPTPAD_WS_URL
# Should connect without immediate error
```

## Security Considerations

### Production Instances
- ✅ Always use HTTPS (`https://`) for base URL
- ✅ Always use WSS (`wss://`) for WebSocket URL
- ✅ Verify SSL certificates are valid
- ✅ Use strong passwords
- ❌ Never use HTTP in production

### Development/Testing
- ⚠️ HTTP/WS is acceptable for localhost only
- ⚠️ Never expose development instances to the internet
- ⚠️ Use different credentials than production

### Environment Variable Security
- 🔒 Don't commit `.env` files to version control
- 🔒 Use `.gitignore` to exclude configuration files
- 🔒 Restrict file permissions: `chmod 600 .env`
- 🔒 Don't share credentials in examples or documentation

## Troubleshooting

### Error: "Server URLs not configured"
**Cause**: Environment variables not set  
**Solution**: Set both `CRYPTPAD_BASE_URL` and `CRYPTPAD_WS_URL` before running

### Error: "Connection refused"
**Cause**: Wrong URL, firewall, or server not running  
**Solution**: Verify URLs, check server status, check firewall rules

### Error: "WebSocket connection failed"
**Cause**: Wrong WebSocket URL or path  
**Solution**: Check WebSocket URL matches your server configuration

### Warning: "Mixed content" (when using HTTP base with WSS)
**Cause**: Mismatched protocols  
**Solution**: Use matching protocols (HTTP with WS, HTTPS with WSS)

## Quick Reference

| Instance Type | Base URL Example | WebSocket URL Example |
|--------------|------------------|----------------------|
| Official CryptPad | `https://cryptpad.fr` | `wss://cryptpad.fr/cryptpad_websocket` |
| Self-hosted (SSL) | `https://cryptpad.example.com` | `wss://cryptpad.example.com/cryptpad_websocket` |
| Self-hosted (no SSL) | `http://cryptpad.example.com:3010` | `ws://cryptpad.example.com:3013` |
| Local development | `http://localhost:3000` | `ws://localhost:3003` |
| Docker default | `http://cryptpad:3000` | `ws://cryptpad:3003` |

## Additional Resources

- [CryptPad Installation Guide](https://docs.cryptpad.fr/en/admin_guide/installation.html)
- [CryptPad Configuration](https://docs.cryptpad.fr/en/admin_guide/customization.html)
- [WebSocket Configuration](https://docs.cryptpad.fr/en/admin_guide/installation.html#configure-websockets)

