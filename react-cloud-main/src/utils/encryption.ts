import CryptoJS from 'crypto-js';

// Helper function to convert WordArray to ArrayBuffer
function wordArrayToAb(wordArray: CryptoJS.lib.WordArray): ArrayBuffer {
    const { sigBytes } = wordArray;
    const ab = new ArrayBuffer(sigBytes);
    const ua = new Uint8Array(ab);
    for (let i = 0; i < sigBytes; i++) {
        ua[i] = (wordArray.words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
    }
    return ab;
}

// Helper function to convert ArrayBuffer to WordArray
function abToWordArray(ab: ArrayBuffer): CryptoJS.lib.WordArray {
    const ua = new Uint8Array(ab);
    const words: number[] = [];
    for (let i = 0; i < ua.length; i++) {
        words[i >>> 2] |= ua[i] << (24 - (i % 4) * 8);
    }
    return CryptoJS.lib.WordArray.create(words, ua.length);
}


export const encryptFile = (fileBuffer: ArrayBuffer, key: string): { data: ArrayBuffer; iv: string } | null => {
  try {
      console.log('🔒 Starting encryption...');
      console.log('File size:', fileBuffer.byteLength, 'bytes');
      console.log('Encryption key length:', key.length);

      // Generate random IV
      const iv = CryptoJS.lib.WordArray.random(16); // 128 bits for AES

      // Derive a consistent 256-bit key from the password using SHA256
      const derivedKey = CryptoJS.SHA256(key);
      console.log('Derived key (SHA256):', derivedKey.toString(CryptoJS.enc.Hex).substring(0, 16) + '...');

      // Convert ArrayBuffer to WordArray
      const wordArray = abToWordArray(fileBuffer);

      // Encrypt the data using AES-256-CBC with the derived key
      const encrypted = CryptoJS.AES.encrypt(wordArray, derivedKey, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });

      // Check if encryption produced ciphertext
      if (!encrypted.ciphertext || encrypted.ciphertext.sigBytes <= 0) {
          throw new Error("Encryption resulted in empty ciphertext.");
      }

      console.log('✅ Encryption successful');
      console.log('Encrypted size:', encrypted.ciphertext.sigBytes, 'bytes');
      console.log('IV:', CryptoJS.enc.Hex.stringify(iv));

      // Convert encrypted ciphertext WordArray back to ArrayBuffer
      const encryptedArrayBuffer = wordArrayToAb(encrypted.ciphertext);

      return {
        data: encryptedArrayBuffer,
        iv: CryptoJS.enc.Hex.stringify(iv) // Store IV as hex string
      };
  } catch (error) {
       console.error("❌ Encryption failed:", error);
       return null; // Return null on failure
  }
};

export const decryptFile = (encryptedData: { data: ArrayBuffer; iv: string }, key: string): ArrayBuffer | null => {
    try {
        console.log('🔓 Starting decryption...');
        console.log('Encrypted data size:', encryptedData.data.byteLength, 'bytes');
        console.log('IV:', encryptedData.iv);
        console.log('Decryption key length:', key.length);

        // Derive the same 256-bit key from the password using SHA256
        const derivedKey = CryptoJS.SHA256(key);
        console.log('Derived key (SHA256):', derivedKey.toString(CryptoJS.enc.Hex).substring(0, 16) + '...');

        // Parse IV from hex string
        const iv = CryptoJS.enc.Hex.parse(encryptedData.iv);

        // Convert encrypted ArrayBuffer data to WordArray
        const encryptedWordArray = abToWordArray(encryptedData.data);

        // Create CipherParams object
        const cipherParams = CryptoJS.lib.CipherParams.create({
          ciphertext: encryptedWordArray
        });

        // Decrypt using AES-256-CBC with the derived key
        let decryptedWithPadding;
        try {
            decryptedWithPadding = CryptoJS.AES.decrypt(
              cipherParams,
              derivedKey,  // Use the derived key, not the raw password
              {
                iv: iv,
                mode: CryptoJS.mode.CBC,
                padding: CryptoJS.pad.NoPadding  // Don't auto-remove padding
              }
            );
        } catch (decryptError) {
            console.error('❌ CryptoJS decryption threw error:', decryptError);
            throw new Error('Decryption failed - incorrect key or corrupted data');
        }

        // Check if decryption produced a valid result
        if (!decryptedWithPadding || typeof decryptedWithPadding.sigBytes !== 'number' || decryptedWithPadding.sigBytes <= 0) {
           console.error('❌ Decryption failed - invalid result');
           console.error('Decrypted sigBytes:', decryptedWithPadding?.sigBytes);
           throw new Error('Decryption failed - incorrect encryption key');
        }

        console.log('Decrypted data sigBytes (with padding):', decryptedWithPadding.sigBytes);

        // CRITICAL FIX: Validate PKCS7 padding manually
        try {
            // Convert to ArrayBuffer (still has padding)
            const decryptedArrayBuffer = wordArrayToAb(decryptedWithPadding);

            if (decryptedArrayBuffer.byteLength === 0) {
                console.error('❌ Decryption produced 0 bytes');
                throw new Error('Decryption failed - incorrect encryption key');
            }

            // Validate PKCS7 padding
            const paddedData = new Uint8Array(decryptedArrayBuffer);
            const paddingLength = paddedData[paddedData.length - 1];

            console.log('Padding byte value:', paddingLength);

            // PKCS7: padding length must be 1-16 for AES (16-byte blocks)
            if (paddingLength === 0 || paddingLength > 16) {
                console.error('❌ Invalid padding length:', paddingLength);
                throw new Error('Decryption failed - incorrect encryption key');
            }

            // Validate all padding bytes match the padding length
            for (let i = paddedData.length - paddingLength; i < paddedData.length; i++) {
                if (paddedData[i] !== paddingLength) {
                    console.error('❌ Invalid padding at index', i, '- expected:', paddingLength, 'got:', paddedData[i]);
                    throw new Error('Decryption failed - incorrect encryption key');
                }
            }

            console.log('✅ Padding validation passed - padding length:', paddingLength);

            // Remove the validated padding
            const unpaddedData = new Uint8Array(decryptedArrayBuffer.byteLength - paddingLength);
            unpaddedData.set(new Uint8Array(decryptedArrayBuffer, 0, decryptedArrayBuffer.byteLength - paddingLength));

            console.log('✅ Decryption successful');
            console.log('Original size (with padding):', decryptedArrayBuffer.byteLength, 'bytes');
            console.log('Final size (without padding):', unpaddedData.byteLength, 'bytes');

            return unpaddedData.buffer;
        } catch (conversionError) {
            console.error('❌ Failed to process decrypted data:', conversionError);
            if (conversionError instanceof Error && conversionError.message.includes('incorrect encryption key')) {
                throw conversionError;
            }
            throw new Error('Decryption failed - incorrect encryption key');
        }

    } catch (error) {
        // Log the specific error
        console.error('❌ Decryption error:', error instanceof Error ? error.message : error);
        console.error('Full error:', error);

        // Re-throw with user-friendly message
        if (error instanceof Error) {
            throw error;
        }
        throw new Error('Decryption failed - please check your encryption key');
    }
};

// Removed generateEncryptionKey as we are using user-provided keys now
// export const generateEncryptionKey = (): string => {
//   return CryptoJS.lib.WordArray.random(256/8).toString();
// };
