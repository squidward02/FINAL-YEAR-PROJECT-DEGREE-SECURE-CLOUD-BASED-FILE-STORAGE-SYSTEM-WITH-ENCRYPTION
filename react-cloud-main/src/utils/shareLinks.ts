import CryptoJS from 'crypto-js';
import { collection, addDoc, doc, updateDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ShareLink } from '../types';

/**
 * Generate a unique token for share link
 */
export const generateShareToken = (): string => {
  const randomBytes = CryptoJS.lib.WordArray.random(32);
  return randomBytes.toString(CryptoJS.enc.Base64url);
};

/**
 * Hash password for share link
 */
export const hashLinkPassword = (password: string): string => {
  return CryptoJS.SHA256(password).toString();
};

/**
 * Create a shareable link for a file
 */
export const createShareLink = async (
  fileId: string,
  createdBy: string,
  options?: {
    expiresInDays?: number;
    password?: string;
    maxDownloads?: number;
  }
): Promise<string> => {
  try {
    const linkToken = generateShareToken();

    let expiresAt: Date | undefined = undefined;
    if (options?.expiresInDays) {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + options.expiresInDays);
      expiresAt = expiry;
    }

    const shareLinkData: Omit<ShareLink, 'id'> = {
      fileId,
      linkToken,
      createdBy,
      createdAt: new Date(),
      expiresAt,
      password: options?.password ? hashLinkPassword(options.password) : undefined,
      maxDownloads: options?.maxDownloads,
      downloadCount: 0,
      isActive: true
    };

    await addDoc(collection(db, 'shareLinks'), {
      ...shareLinkData,
      createdAt: serverTimestamp(),
      expiresAt: expiresAt || null
    });

    // Return the full share URL
    const baseUrl = window.location.origin;
    return `${baseUrl}/share/${linkToken}`;
  } catch (error) {
    console.error('Failed to create share link:', error);
    throw new Error('Failed to create share link');
  }
};

/**
 * Verify share link access
 */
export const verifyShareLink = async (
  linkToken: string,
  password?: string
): Promise<{
  valid: boolean;
  fileId?: string;
  reason?: string;
}> => {
  try {
    // Query for the share link by token
    const shareLinksRef = collection(db, 'shareLinks');
    const q = query(shareLinksRef, where('linkToken', '==', linkToken));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return { valid: false, reason: 'Link not found' };
    }

    const linkDoc = snapshot.docs[0];
    const linkData = linkDoc.data() as ShareLink;

    // Check if link is active
    if (!linkData.isActive) {
      return { valid: false, reason: 'Link has been deactivated' };
    }

    // Check expiration
    if (linkData.expiresAt) {
      const expiryDate = linkData.expiresAt instanceof Date
        ? linkData.expiresAt
        : (linkData.expiresAt as any).toDate?.() || new Date(linkData.expiresAt);

      if (new Date() > expiryDate) {
        return { valid: false, reason: 'Link has expired' };
      }
    }

    // Check download limit
    if (linkData.maxDownloads && linkData.downloadCount >= linkData.maxDownloads) {
      return { valid: false, reason: 'Download limit reached' };
    }

    // Check password
    if (linkData.password) {
      if (!password) {
        return { valid: false, reason: 'Password required' };
      }

      const hashedPassword = hashLinkPassword(password);
      if (hashedPassword !== linkData.password) {
        return { valid: false, reason: 'Incorrect password' };
      }
    }

    return { valid: true, fileId: linkData.fileId };
  } catch (error) {
    console.error('Failed to verify share link:', error);
    return { valid: false, reason: 'Verification failed' };
  }
};

/**
 * Increment download count for share link
 */
export const incrementShareLinkDownload = async (linkToken: string): Promise<void> => {
  try {
    const shareLinksRef = collection(db, 'shareLinks');
    const q = query(shareLinksRef, where('linkToken', '==', linkToken));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const linkDoc = snapshot.docs[0];
      const currentCount = linkDoc.data().downloadCount || 0;

      await updateDoc(doc(db, 'shareLinks', linkDoc.id), {
        downloadCount: currentCount + 1
      });
    }
  } catch (error) {
    console.error('Failed to increment download count:', error);
  }
};

/**
 * Deactivate a share link
 */
export const deactivateShareLink = async (linkId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, 'shareLinks', linkId), {
      isActive: false
    });
  } catch (error) {
    console.error('Failed to deactivate share link:', error);
    throw error;
  }
};

/**
 * Copy link to clipboard
 */
export const copyLinkToClipboard = async (link: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    // Fallback method
    const textArea = document.createElement('textarea');
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  }
};
