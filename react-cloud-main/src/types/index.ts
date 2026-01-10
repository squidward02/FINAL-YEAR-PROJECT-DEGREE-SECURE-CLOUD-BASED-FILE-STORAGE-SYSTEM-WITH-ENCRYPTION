// types.ts
export type UserRole = 'admin' | 'editor' | 'viewer';

export type ActivityAction =
  | 'login'
  | 'logout'
  | 'failed_login'
  | 'file_upload'
  | 'file_download'
  | 'file_delete'
  | 'file_share'
  | 'file_access_request'
  | 'file_access_granted'
  | 'file_access_denied'
  | 'user_created'
  | 'user_deleted'
  | 'role_changed'
  | '2fa_enabled'
  | '2fa_disabled'
  | 'password_reset'
  | 'folder_created'
  | 'folder_deleted';

export interface User {
  id?: string;                // Firestore doc id (optional)
  uid: string;                // Auth uid (required)
  email: string;
  displayName?: string;
  phoneNumber?: string;       // User's phone number
  role: UserRole;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;   // stored only if user opted in (sensitive)
  backupCodes?: string[];     // Encrypted backup codes for 2FA
  usedBackupCodes?: string[]; // Hashes of used backup codes
  createdAt: Date;
  lastLogin?: Date;
  storageUsed?: number;       // Bytes used
  storageQuota?: number;      // Bytes allowed (default based on role)
}

export interface AccessRequest {
  id: string;
  fileId: string;             // ID of the file being requested
  fileName: string;           // Name of the file for display
  requestedBy: string;        // User ID who made the request
  requestedByEmail: string;   // Email of requester for display
  requestedAt: Date;          // When the request was made
  status: 'pending' | 'approved' | 'denied';
  message?: string;           // Optional message from requester
  respondedBy?: string;       // Admin who responded
  respondedAt?: Date;         // When admin responded
  responseMessage?: string;   // Optional response from admin
}

export interface Folder {
  id: string;
  name: string;
  path: string;               // Full path like "/folder1/subfolder2"
  parentId?: string | null;   // Parent folder ID, null for root folders
  createdBy: string;          // user id who created the folder
  createdAt: Date;
  // Permissions are optional — use RBAC fields on files for finer control,
  // but folders can also have a permissions set if you want inheritance.
  permissions?: {
    read?: string[];   // userIds or role names
    write?: string[];
    delete?: string[];
  };
}

export interface FileVersion {
  id: string;
  versionNumber: number;
  storagePath: string;
  size: number;
  iv: string;
  uploadedAt: Date;
  uploadedBy: string;
  comment?: string;
}

export interface ShareLink {
  id: string;
  fileId: string;
  linkToken: string;          // Unique token for the link
  createdBy: string;
  createdAt: Date;
  expiresAt?: Date;           // Optional expiration
  password?: string;          // Hashed password (optional)
  maxDownloads?: number;      // Optional download limit
  downloadCount: number;
  isActive: boolean;
}

export interface FileMetadata {
  id: string;
  name: string;               // stored/renamed file name
  originalName?: string;      // original filename from uploader
  type: string;               // mime type
  size: number;               // bytes
  lastModified?: number;      // epoch ms from client (optional)
  uploadedBy: string;         // user ID of the uploader
  uploadedAt: Date;           // Date or Firestore Timestamp (pick one)

  // Encrypted storage info
  encryptedPath?: string;     // path to encrypted file (if used)
  storagePath?: string;       // path in Firebase Storage
  downloadUrl?: string;       // temporary download URL (optional)
  iv?: string;                // initialization vector (hex/base64) - required for decryption

  // File versioning
  currentVersion?: number;    // Current version number
  versions?: FileVersion[];   // Array of previous versions

  // Compression info
  isCompressed?: boolean;     // Whether file is compressed
  originalSize?: number;      // Original size before compression
  compressionRatio?: number;  // Compression ratio

  // Deduplication
  contentHash?: string;       // SHA-256 hash for deduplication
  isDuplicate?: boolean;      // Is this a duplicate reference
  originalFileId?: string;    // If duplicate, reference to original

  folderPath?: string;        // Path to the folder containing this file
  folderId?: string;          // ID of the folder containing this file

  // RBAC Fields: prefer these for access control
  allowedRoles?: UserRole[];  // roles allowed to access (e.g., ['admin', 'editor'])
  allowedUsers?: string[];    // specific user IDs allowed to access

  // Deprecated/legacy style permissions (kept optional for backward compat)
  permissions?: {
    read?: string[];   // userIds or role names
    write?: string[];
    delete?: string[];
  };

  // Statistics
  downloadCount?: number;
  lastDownloadedAt?: Date;
  lastDownloadedBy?: string;
}

export interface AccessRequest {
  id: string;
  fileId: string;
  fileName: string;
  requestedBy: string;
  requestedByEmail: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'denied';
  reviewedBy?: string;
  reviewedAt?: Date;
  message?: string;           // Optional message from requester
  reviewNote?: string;        // Optional note from reviewer
}

export interface ActivityLog {
  id: string;
  userId: string;
  userEmail: string;
  action: ActivityAction;
  resourceType?: 'file' | 'folder' | 'user' | 'system';
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;  // Additional contextual data
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface SystemStats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;       // Total bytes stored
  activeUsers24h: number;
  uploadsToday: number;
  downloadsToday: number;
  avgFileSize: number;
  topFileTypes: { type: string; count: number }[];
}

export interface TwoFactorSetup {
  secret: string;             // base32 or appropriate secret value
  qrCodeUrl: string;          // data URL or link to QR image
  backupCodes: string[];      // one-time backup codes
}

export interface LoginAttempt {
  email: string;
  timestamp: Date;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface StorageQuotaConfig {
  viewer: number;    // 1 GB default
  editor: number;    // 5 GB default
  admin: number;     // 50 GB default
}
