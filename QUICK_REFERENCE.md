# CryptPad CLI - Quick Reference

## Authentication

```bash
# Login
cryptpad> login myusername mypassword

# Logout
cryptpad[user]> logout

# Check who you are
cryptpad[user]> whoami

# Check connection status
cryptpad[user]> status
```

## Contacts & Messaging

```bash
# List all contacts
cryptpad[user]> contacts

# View message history with a contact
cryptpad[user]> messages Alice
cryptpad[user]> messages "Bob Smith"

# Send a message
cryptpad[user]> send Alice Hello!
cryptpad[user]> send Bob This is a longer message with spaces
```

## Document Management

```bash
# List files in current directory
cryptpad[user]> ls

# Change directory
cryptpad[user]> cd FolderName

# Show current directory
cryptpad[user]> pwd

# View file info
cryptpad[user]> info DocumentName

# View file content
cryptpad[user]> cat MyDocument

# Create new document
cryptpad[user]> create pad "My Document"

# Create password-protected document
cryptpad[user]> create pad "Secret Doc" MyPassword123

# Move document to folder
cryptpad[user]> mv MyDocument TargetFolder

# Rename folder
cryptpad[user]> rename OldName NewName

# Download document
cryptpad[user]> download MyDocument /path/to/local/file.txt
```

## Tips

- Contact names are **case-insensitive**
- Multi-word messages **don't need quotes** in send command
- Use **Tab** for command completion
- Session persists for **24 hours**
- Press **Ctrl+C** or type **exit** to quit

## Environment Variables

```bash
# Custom CryptPad server
export CP_BASE_URL="https://cryptpad.example.com"
export CP_WS_URL="wss://cryptpad.example.com/cryptpad_websocket"
node bin/drive-cryptpad
```

## Common Workflows

### Send a quick message
```bash
node bin/drive-cryptpad
cryptpad> login user pass
cryptpad[user]> send Alice Meeting at 3pm
cryptpad[user]> exit
```

### Check messages from all contacts
```bash
cryptpad> login user pass
cryptpad[user]> contacts
# Note the contact names
cryptpad[user]> messages Alice
cryptpad[user]> messages Bob
cryptpad[user]> messages Carol
cryptpad[user]> exit
```

### Create and share a document
```bash
cryptpad[user]> create pad "Team Notes"
# Note the URL from output
cryptpad[user]> send Alice Check out the new team notes: [URL]
```

