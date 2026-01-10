import { doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { UserRole } from '../types';

// Default quotas in bytes
export const DEFAULT_QUOTAS: Record<UserRole, number> = {
  viewer: 1 * 1024 * 1024 * 1024,    // 1 GB
  editor: 5 * 1024 * 1024 * 1024,    // 5 GB
  admin: 50 * 1024 * 1024 * 1024     // 50 GB
};

/**
 * Get user's storage usage
 */
export const getUserStorageUsage = async (userId: string): Promise<number> => {
  try {
    const filesQuery = query(
      collection(db, 'files'),
      where('uploadedBy', '==', userId)
    );

    const snapshot = await getDocs(filesQuery);
    let totalSize = 0;

    snapshot.forEach(doc => {
      const data = doc.data();
      // Use compressed size if available, otherwise use original size
      const size = data.isCompressed && data.size
        ? data.size
        : data.originalSize || data.size || 0;
      totalSize += size;
    });

    return totalSize;
  } catch (error) {
    console.error('Failed to calculate storage usage:', error);
    return 0;
  }
};

/**
 * Get user's storage quota
 */
export const getUserQuota = async (userId: string): Promise<number> => {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userData = userDoc.data();

    if (!userData) return DEFAULT_QUOTAS.viewer;

    // Return custom quota if set, otherwise return default based on role
    return userData.storageQuota || DEFAULT_QUOTAS[userData.role as UserRole] || DEFAULT_QUOTAS.viewer;
  } catch (error) {
    console.error('Failed to get user quota:', error);
    return DEFAULT_QUOTAS.viewer;
  }
};

/**
 * Check if user has enough quota for upload
 */
export const checkQuota = async (userId: string, fileSize: number): Promise<{
  allowed: boolean;
  currentUsage: number;
  quota: number;
  availableSpace: number;
}> => {
  try {
    const currentUsage = await getUserStorageUsage(userId);
    const quota = await getUserQuota(userId);
    const availableSpace = quota - currentUsage;
    const allowed = fileSize <= availableSpace;

    return {
      allowed,
      currentUsage,
      quota,
      availableSpace
    };
  } catch (error) {
    console.error('Failed to check quota:', error);
    return {
      allowed: false,
      currentUsage: 0,
      quota: 0,
      availableSpace: 0
    };
  }
};

/**
 * Update user's storage usage
 */
export const updateUserStorageUsage = async (userId: string): Promise<void> => {
  try {
    const usage = await getUserStorageUsage(userId);
    await updateDoc(doc(db, 'users', userId), {
      storageUsed: usage
    });
  } catch (error) {
    console.error('Failed to update storage usage:', error);
  }
};

/**
 * Set custom quota for user (admin only)
 */
export const setUserQuota = async (userId: string, quotaInBytes: number): Promise<void> => {
  try {
    await updateDoc(doc(db, 'users', userId), {
      storageQuota: quotaInBytes
    });
  } catch (error) {
    console.error('Failed to set user quota:', error);
    throw error;
  }
};

/**
 * Format bytes to human-readable format
 */
export const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Calculate storage usage percentage
 */
export const getStoragePercentage = (used: number, quota: number): number => {
  if (quota === 0) return 0;
  return Math.min((used / quota) * 100, 100);
};
