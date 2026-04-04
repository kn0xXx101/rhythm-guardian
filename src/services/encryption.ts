// End-to-End Encryption Service using Web Crypto API
export class EncryptionService {
  private static instance: EncryptionService;
  private keyPair: CryptoKeyPair | null = null;
  private contactPublicKeys: Map<number, CryptoKey> = new Map();

  private constructor() {}

  public static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  // Generate RSA key pair for the current user
  public async generateKeyPair(): Promise<CryptoKeyPair> {
    try {
      this.keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256',
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      return this.keyPair;
    } catch (error) {
      console.error('Failed to generate key pair:', error);
      throw new Error('Encryption key generation failed');
    }
  }

  // Export public key to share with contacts
  public async exportPublicKey(): Promise<string> {
    if (!this.keyPair?.publicKey) {
      throw new Error('No key pair available. Generate keys first.');
    }

    try {
      const exported = await window.crypto.subtle.exportKey('spki', this.keyPair.publicKey);
      const exportedAsString = Array.from(new Uint8Array(exported))
        .map((byte) => String.fromCharCode(byte))
        .join('');
      return btoa(exportedAsString);
    } catch (error) {
      console.error('Failed to export public key:', error);
      throw new Error('Public key export failed');
    }
  }

  // Import a contact's public key
  public async importContactPublicKey(contactId: number, publicKeyString: string): Promise<void> {
    try {
      const binaryString = atob(publicKeyString);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        bytes,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['encrypt']
      );

      this.contactPublicKeys.set(contactId, publicKey);
    } catch (error) {
      console.error('Failed to import contact public key:', error);
      throw new Error('Contact public key import failed');
    }
  }

  // Encrypt a message for a specific contact
  public async encryptMessage(contactId: number, message: string): Promise<string> {
    const contactPublicKey = this.contactPublicKeys.get(contactId);
    if (!contactPublicKey) {
      throw new Error(`No public key available for contact ${contactId}`);
    }

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      const encrypted = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP',
        },
        contactPublicKey,
        data
      );

      const encryptedArray = Array.from(new Uint8Array(encrypted));
      return btoa(encryptedArray.map((byte) => String.fromCharCode(byte)).join(''));
    } catch (error) {
      console.error('Failed to encrypt message:', error);
      throw new Error('Message encryption failed');
    }
  }

  // Decrypt a received message
  public async decryptMessage(encryptedMessage: string): Promise<string> {
    if (!this.keyPair?.privateKey) {
      throw new Error('No private key available for decryption');
    }

    try {
      const binaryString = atob(encryptedMessage);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP',
        },
        this.keyPair.privateKey,
        bytes
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Failed to decrypt message:', error);
      throw new Error('Message decryption failed');
    }
  }

  // Check if encryption is available
  public isEncryptionAvailable(): boolean {
    return !!(window.crypto && window.crypto.subtle);
  }

  // Initialize encryption for a user
  public async initializeEncryption(): Promise<string> {
    if (!this.isEncryptionAvailable()) {
      throw new Error('Encryption not supported in this browser');
    }

    await this.generateKeyPair();
    return await this.exportPublicKey();
  }

  // Store keys in localStorage (in production, use secure storage)
  public async storeKeys(): Promise<void> {
    if (!this.keyPair) return;

    try {
      const publicKey = await this.exportPublicKey();
      const privateKey = await window.crypto.subtle.exportKey('pkcs8', this.keyPair.privateKey);
      const privateKeyString = Array.from(new Uint8Array(privateKey))
        .map((byte) => String.fromCharCode(byte))
        .join('');

      localStorage.setItem('chat_public_key', publicKey);
      localStorage.setItem('chat_private_key', btoa(privateKeyString));
    } catch (error) {
      console.error('Failed to store keys:', error);
    }
  }

  // Load keys from localStorage
  public async loadKeys(): Promise<boolean> {
    try {
      const publicKeyString = localStorage.getItem('chat_public_key');
      const privateKeyString = localStorage.getItem('chat_private_key');

      if (!publicKeyString || !privateKeyString) {
        return false;
      }

      // Import private key
      const binaryString = atob(privateKeyString);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const privateKey = await window.crypto.subtle.importKey(
        'pkcs8',
        bytes,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        false,
        ['decrypt']
      );

      // Import public key
      const publicBinaryString = atob(publicKeyString);
      const publicBytes = new Uint8Array(publicBinaryString.length);
      for (let i = 0; i < publicBinaryString.length; i++) {
        publicBytes[i] = publicBinaryString.charCodeAt(i);
      }

      const publicKey = await window.crypto.subtle.importKey(
        'spki',
        publicBytes,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256',
        },
        true,
        ['encrypt']
      );

      this.keyPair = { publicKey, privateKey };
      return true;
    } catch (error) {
      console.error('Failed to load keys:', error);
      return false;
    }
  }
}

export const encryptionService = EncryptionService.getInstance();
