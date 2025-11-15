# CryptPad Mailbox Support

## Overview

The CLI now supports reading encrypted mailbox messages, particularly for retrieving pending friend requests from the notifications mailbox.

## Implementation

### Mailbox Encryption

CryptPad uses a dual-layer asymmetric encryption system for mailboxes:
1. **Outer layer**: Encrypted with an ephemeral keypair (discarded after encryption)
2. **Inner layer**: Encrypted with the sender's permanent curve keypair

For user mailboxes (like notifications), the encryption uses the user's main Curve25519 keys (`curvePrivate` and `curvePublic`) from their proxy object.

### Module: `src/cryptpad/mailbox.js`

This module provides:
- `readMailbox(wsUrl, mailboxName, callback)`: Read all messages from a mailbox
- `getPendingRequests(wsUrl, callback)`: Filter mailbox messages for friend requests
- `getMailboxConfig(mailboxName)`: Get mailbox configuration from proxy

### Key Discovery

The mailbox keys are derived as follows:
1. Check if the mailbox has explicit keys at `proxy.mailboxes[mailboxName].keys`
2. If not, use the user's main curve keys: `proxy.curvePrivate` and `proxy.curvePublic`
3. Team mailboxes derive keys from the team's roster edit key

### CLI Command: `pending`

Lists all pending friend requests from the notifications mailbox.

**Usage:**
```bash
$ login <username> <password>
$ pending
```

**Example Output:**
```
📨 Pending Friend Requests:
  Reading notifications mailbox...

    1. stuart
       Curve Public: pOJX/Q/0Mi/2dpaxjKB9...
       Received: 11/15/2025, 2:20:15 AM
       Use "accept stuart" or "reject stuart"
```

## Message Types

The notifications mailbox contains various message types:
- `FRIEND_REQUEST`: Incoming friend request
- `FRIEND_REQUEST_ACCEPTED`: Friend request was accepted
- `ACCEPT_FRIEND_REQUEST`: Response to your request
- `SHARE_PAD`: Someone shared a pad with you
- And more...

## Technical Details

### Message Structure

Each mailbox message has:
- `type`: Message type (e.g., "FRIEND_REQUEST")
- `content`: Decrypted message content
  - `user`: Sender's data (curvePublic, edPublic, displayName, etc.)
- `hash`: Message hash for tracking viewed status
- `time`: Timestamp when message was received
- `author`: Sender's curve public key

### Decryption Process

1. Connect to the mailbox channel via WebSocket
2. Use `CpCrypto.Mailbox.createEncryptor()` with user's curve keys
3. For each incoming message:
   - Decrypt outer layer (ephemeral)
   - Decrypt inner layer (permanent keys)
   - Parse JSON content
4. Filter and process based on message type

## Future Enhancements

Potential future features:
- Accept/reject friend requests directly from CLI
- Send messages to other users' mailboxes
- Mark messages as viewed
- Support for other mailbox types (broadcast, support, team mailboxes)

## Related Files

- `/src/cryptpad/mailbox.js` - Core mailbox module
- `/src/cryptpad/contact-manager.js` - Uses mailbox for pending requests
- `/src/commands/index.js` - CLI `pending` command
- `/node_modules/chainpad-crypto/crypto.js` - Mailbox encryption primitives

