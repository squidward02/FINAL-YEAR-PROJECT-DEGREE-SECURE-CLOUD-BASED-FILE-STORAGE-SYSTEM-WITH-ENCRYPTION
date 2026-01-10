// Browser-compatible TOTP implementation using Web Crypto API
// This avoids Node.js dependencies and works natively in browsers

// Base32 encoding/decoding
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Uint8Array): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i];
    bits += 8;

    while (bits >= 5) {
      result += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    result += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  return result;
}

function base32Decode(encoded: string): Uint8Array {
  const cleanInput = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const buffer = new Uint8Array(Math.floor(cleanInput.length * 5 / 8));
  let bits = 0;
  let value = 0;
  let index = 0;

  for (let i = 0; i < cleanInput.length; i++) {
    const char = cleanInput[i];
    const charValue = BASE32_CHARS.indexOf(char);
    
    if (charValue === -1) continue;
    
    value = (value << 5) | charValue;
    bits += 5;

    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255;
      bits -= 8;
    }
  }

  return buffer.slice(0, index);
}

// HMAC-SHA1 implementation using Web Crypto API
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(signature);
}

// Convert number to 8-byte big-endian array
function numberToByteArray(num: number): Uint8Array {
  const array = new Uint8Array(8);
  for (let i = 7; i >= 0; i--) {
    array[i] = num & 0xff;
    num = num >> 8;
  }
  return array;
}

// Generate TOTP token
export async function generateTOTP(secret: string, window: number = 0): Promise<string> {
  const secretBytes = base32Decode(secret);
  const timeCounter = Math.floor(Date.now() / 1000 / 30) + window;
  const timeBytes = numberToByteArray(timeCounter);
  
  const hmac = await hmacSha1(secretBytes, timeBytes);
  
  // Dynamic truncation
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = ((hmac[offset] & 0x7f) << 24) |
               ((hmac[offset + 1] & 0xff) << 16) |
               ((hmac[offset + 2] & 0xff) << 8) |
               (hmac[offset + 3] & 0xff);
  
  return (code % 1000000).toString().padStart(6, '0');
}

// Verify TOTP token
export async function verifyTOTP(token: string, secret: string, window: number = 1): Promise<boolean> {
  // Check current time window and surrounding windows
  for (let i = -window; i <= window; i++) {
    const expectedToken = await generateTOTP(secret, i);
    if (expectedToken === token) {
      return true;
    }
  }
  return false;
}

// Generate a random base32 secret
export function generateSecret(): string {
  const bytes = new Uint8Array(20); // 160 bits
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

// Generate QR code URL for authenticator apps
export function generateQRCodeURL(email: string, service: string, secret: string): string {
  const encodedService = encodeURIComponent(service);
  const encodedEmail = encodeURIComponent(email);
  const encodedSecret = encodeURIComponent(secret);
  
  return `otpauth://totp/${encodedService}:${encodedEmail}?secret=${encodedSecret}&issuer=${encodedService}`;
}
