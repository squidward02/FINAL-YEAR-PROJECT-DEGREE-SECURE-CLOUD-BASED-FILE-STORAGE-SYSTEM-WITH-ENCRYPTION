import CryptoJS from 'crypto-js';

/**
 * Generate backup codes for 2FA
 */
export const generateBackupCodes = (count: number = 10): string[] => {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate random 8-character codes (format: XXXX-XXXX)
    const part1 = CryptoJS.lib.WordArray.random(2).toString(CryptoJS.enc.Hex).toUpperCase().substring(0, 4);
    const part2 = CryptoJS.lib.WordArray.random(2).toString(CryptoJS.enc.Hex).toUpperCase().substring(0, 4);
    codes.push(`${part1}-${part2}`);
  }

  return codes;
};

/**
 * Hash a backup code for secure storage
 */
export const hashBackupCode = (code: string): string => {
  return CryptoJS.SHA256(code.replace('-', '')).toString();
};

/**
 * Verify a backup code against stored hashes
 */
export const verifyBackupCode = (
  code: string,
  storedHashes: string[],
  usedHashes: string[] = []
): boolean => {
  const codeHash = hashBackupCode(code);

  // Check if code exists and hasn't been used
  return storedHashes.includes(codeHash) && !usedHashes.includes(codeHash);
};

/**
 * Encrypt backup codes for storage
 */
export const encryptBackupCodes = (codes: string[], masterKey: string): string => {
  const codesString = JSON.stringify(codes);
  return CryptoJS.AES.encrypt(codesString, masterKey).toString();
};

/**
 * Decrypt backup codes from storage
 */
export const decryptBackupCodes = (encryptedCodes: string, masterKey: string): string[] => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedCodes, masterKey);
    const codesString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(codesString);
  } catch {
    return [];
  }
};

/**
 * Format backup codes for display (grouped)
 */
export const formatBackupCodesForDisplay = (codes: string[]): string => {
  return codes.map((code, index) => `${index + 1}. ${code}`).join('\n');
};

/**
 * Download backup codes as text file
 */
export const downloadBackupCodes = (codes: string[], email: string): void => {
  const content = `
SecureCloud - Two-Factor Authentication Backup Codes
Account: ${email}
Generated: ${new Date().toLocaleString()}

IMPORTANT: Keep these codes safe and secure!
- Each code can only be used once
- Use these codes if you lose access to your authenticator app
- Store them in a secure location (password manager, safe, etc.)

Backup Codes:
${formatBackupCodesForDisplay(codes)}

---
After using a code, it will be marked as used and cannot be reused.
If you run out of codes, you can generate new ones from your account settings.
`.trim();

  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `securecloud-backup-codes-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
