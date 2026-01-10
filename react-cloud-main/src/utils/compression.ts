import pako from 'pako';
import CryptoJS from 'crypto-js';

/**
 * Compress data before encryption
 */
export const compressData = (data: ArrayBuffer): {
  compressed: ArrayBuffer;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
} => {
  try {
    const uint8Array = new Uint8Array(data);
    const compressed = pako.gzip(uint8Array);

    const originalSize = data.byteLength;
    const compressedSize = compressed.byteLength;
    const compressionRatio = originalSize > 0 ? compressedSize / originalSize : 1;

    return {
      compressed: compressed.buffer,
      originalSize,
      compressedSize,
      compressionRatio
    };
  } catch (error) {
    console.error('Compression failed:', error);
    throw new Error('Failed to compress data');
  }
};

/**
 * Decompress data after decryption
 */
export const decompressData = (compressedData: ArrayBuffer): ArrayBuffer => {
  try {
    const uint8Array = new Uint8Array(compressedData);
    const decompressed = pako.ungzip(uint8Array);
    return decompressed.buffer;
  } catch (error) {
    console.error('Decompression failed:', error);
    throw new Error('Failed to decompress data');
  }
};

/**
 * Calculate SHA-256 hash of file content for deduplication
 */
export const calculateFileHash = async (data: ArrayBuffer): Promise<string> => {
  try {
    // Convert ArrayBuffer to WordArray for CryptoJS
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(data) as any);
    const hash = CryptoJS.SHA256(wordArray);
    return hash.toString(CryptoJS.enc.Hex);
  } catch (error) {
    console.error('Hash calculation failed:', error);
    throw new Error('Failed to calculate file hash');
  }
};

/**
 * Check if compression would be beneficial
 * (Don't compress already compressed formats like JPG, PNG, ZIP, etc.)
 */
export const shouldCompress = (mimeType: string, size: number): boolean => {
  // Don't compress files smaller than 1KB
  if (size < 1024) return false;

  // List of already compressed formats
  const compressedFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/',
    'audio/',
    'application/zip',
    'application/x-zip',
    'application/x-rar',
    'application/x-7z-compressed',
    'application/gzip'
  ];

  return !compressedFormats.some(format => mimeType.toLowerCase().includes(format));
};
