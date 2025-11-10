
# Experimental Command-Line interface for CryptPad

The goal is to create a node JS program exposing a shell UI to the user with the following commands:

- help (very difficult command telling you the commands available)
- ls (showing the pads and folders from the current folder)
- cd (switch to a different folder, including a shared folder)
- info (display info about a pad or folder)
- cat (display the content of a pad)
- mv (move a pad to another folder, rename a pad or folder)
- rename <old> <new>  Rename folder
- download <name> [path] Download pad to local file
- create <type> <title> [password] Create new pad (optionally password-protected)
- clear               Clear the screen
- exit                Exit the shell

## Password Protection

The CLI now supports password-protected documents! When creating a new pad, you can optionally provide a password as the third argument:

```bash
create pad "My Secret Document" mySecurePassword123
```

### How Password Protection Works

- **Client-side encryption**: The password is used to derive encryption keys on the client side
- **Zero-knowledge**: The CryptPad server never sees your password or decrypted content
- **Password required**: Users must enter the password in an input field to access the document
- **True access control**: The URL alone is not sufficient - the password must be known and entered separately

### Examples

```bash
# Create a public document (no password)
create pad "Public Notes"

# Create a password-protected document
create pad "Private Notes" MySecretPass123

# Create a password-protected code document
create code "Secret Code" StrongP@ssw0rd
```

### Security Considerations

🔒 **Important**: Password-protected documents require BOTH the URL and the password to access. The password must be entered manually into an input field when opening the document.

✅ **Best for**: 
- Protecting sensitive documents from unauthorized access
- Ensuring only users with the password can view content
- Zero-knowledge encryption requirements
- Protecting documents from server administrators

✅ **Security benefits**:
- URL alone cannot access the document - password is required
- Password must be shared separately from the URL
- Multiple layers of protection (URL + password)

⚠️ **Important to know**:
- Store passwords securely (password manager, encrypted storage)
- Share URLs and passwords through different channels for maximum security
- Once someone has both URL and password, they can access the document

### Programmatic Usage

You can also use the password feature programmatically via the `makePad` function:

```javascript
const { makePad } = require('./src/cryptpad/makepad');

const type = 'pad';
const content = '{}'; // Initial content
const wsUrl = 'ws://your-server.com/cryptpad_websocket';
const baseUrl = 'https://your-server.com';
const title = 'My Document';
const password = 'SecurePassword123'; // Optional

makePad(type, content, wsUrl, baseUrl, title, (err, url) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log('Document created:', url);
        console.log('Password:', password);
        // Note: Users will need to enter the password when opening the URL
        // The URL and password should be shared securely (preferably separately)
    }
}, password);
```
 
<img width="1008" height="473" alt="image" src="https://github.com/user-attachments/assets/bad41c26-ece3-429c-b311-202ec05ea23a" />
