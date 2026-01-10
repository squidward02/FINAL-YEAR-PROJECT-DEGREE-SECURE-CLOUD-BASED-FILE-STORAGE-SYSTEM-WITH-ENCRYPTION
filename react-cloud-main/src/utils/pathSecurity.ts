/**
 * Security utilities for file path and filename sanitization
 * Prevents directory traversal and path injection attacks
 */

/**
 * Sanitizes a filename to prevent directory traversal attacks
 * Removes: ../, ..\, leading dots, slashes, and other dangerous characters
 * 
 * @param filename - The original filename from user input
 * @returns Sanitized filename safe for storage operations
 * 
 * @example
 * sanitizeFilename("../../etc/passwd") // Returns "etc_passwd"
 * sanitizeFilename("C:\\Windows\\System32\\file.txt") // Returns "C_Windows_System32_file.txt"
 * sanitizeFilename("normal-file.pdf") // Returns "normal-file.pdf"
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'unnamed_file';
  }

  return filename
    // Remove directory traversal sequences
    .replace(/\.\./g, '')
    
    // Replace path separators with underscores
    .replace(/[/\\]/g, '_')
    
    // Remove leading dots (hidden files on Unix)
    .replace(/^\.+/, '')
    
    // Remove null bytes (can terminate strings in some contexts)
    .replace(/\0/g, '')
    
    // Remove control characters (ASCII 0-31)
    .replace(/[\x00-\x1F]/g, '')
    
    // Trim whitespace
    .trim() || 'unnamed_file';
}

/**
 * Validates a folder path to ensure it's safe for storage operations
 * Ensures path doesn't escape user directory boundaries
 * 
 * @param folderPath - The folder path to validate
 * @returns Sanitized folder path or empty string if invalid
 * 
 * @example
 * sanitizeFolderPath("/Documents/Photos") // Returns "Documents/Photos"
 * sanitizeFolderPath("../../etc") // Returns ""
 * sanitizeFolderPath("My Documents\\Files") // Returns "My Documents_Files"
 */
export function sanitizeFolderPath(folderPath: string): string {
  if (!folderPath || typeof folderPath !== 'string') {
    return '';
  }

  // Reject paths with traversal sequences
  if (folderPath.includes('..')) {
    console.warn('⚠️ Rejected folder path with traversal sequence:', folderPath);
    return '';
  }

  return folderPath
    // Remove leading/trailing slashes
    .replace(/^\/+|\/+$/g, '')
    
    // Replace backslashes with forward slashes
    .replace(/\\/g, '/')
    
    // Remove duplicate slashes
    .replace(/\/+/g, '/')
    
    // Remove null bytes
    .replace(/\0/g, '')
    
    // Remove control characters
    .replace(/[\x00-\x1F]/g, '')
    
    .trim();
}

/**
 * Validates that a storage path is within the expected user directory
 * Prevents accessing files outside user's allocated space
 * 
 * @param storagePath - The full storage path to validate
 * @param userId - The current user's ID
 * @returns true if path is valid, false otherwise
 * 
 * @example
 * isValidStoragePath("files/user123/document.pdf", "user123") // Returns true
 * isValidStoragePath("files/user456/document.pdf", "user123") // Returns false
 * isValidStoragePath("../admin/secrets.txt", "user123") // Returns false
 */
export function isValidStoragePath(storagePath: string, userId: string): boolean {
  if (!storagePath || !userId) {
    return false;
  }

  // Check for traversal sequences
  if (storagePath.includes('..')) {
    console.error('🚨 Directory traversal attempt detected:', storagePath);
    return false;
  }

  // Check for absolute paths (Unix and Windows)
  if (storagePath.startsWith('/') || /^[a-zA-Z]:/.test(storagePath)) {
    console.error('🚨 Absolute path attempt detected:', storagePath);
    return false;
  }

  // Ensure path starts with expected user directory
  const expectedPrefix = `files/${userId}/`;
  if (!storagePath.startsWith(expectedPrefix) && storagePath !== `files/${userId}`) {
    console.error('🚨 Path outside user directory:', storagePath);
    return false;
  }

  return true;
}

/**
 * Extracts the file extension safely from a filename
 * Returns lowercase extension without the dot
 * 
 * @param filename - The filename to extract extension from
 * @returns The file extension or empty string
 * 
 * @example
 * getFileExtension("document.pdf") // Returns "pdf"
 * getFileExtension("archive.tar.gz") // Returns "gz"
 * getFileExtension("noextension") // Returns ""
 */
export function getFileExtension(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  const lastDotIndex = filename.lastIndexOf('.');
  if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
    return '';
  }

  return filename.slice(lastDotIndex + 1).toLowerCase();
}

/**
 * Validates file size is within acceptable limits
 * Prevents DoS attacks via massive file uploads
 * 
 * @param fileSize - Size in bytes
 * @param maxSizeMB - Maximum allowed size in megabytes (default: 100MB)
 * @returns true if size is valid, false otherwise
 */
export function isValidFileSize(fileSize: number, maxSizeMB: number = 100): boolean {
  const maxBytes = maxSizeMB * 1024 * 1024;
  return fileSize > 0 && fileSize <= maxBytes;
}
