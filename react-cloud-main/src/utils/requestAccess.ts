import { collection, addDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { logActivity } from './activityLog';

interface RequestAccessParams {
  fileId: string;
  fileName: string;
  userId: string;
  userEmail: string;
  message?: string;
}

/**
 * Create an access request for a file
 */
export const createAccessRequest = async (params: RequestAccessParams): Promise<void> => {
  const { fileId, fileName, userId, userEmail, message } = params;

  // Check if user already has a pending request for this file
  const existingRequestQuery = query(
    collection(db, 'accessRequests'),
    where('fileId', '==', fileId),
    where('requestedBy', '==', userId),
    where('status', '==', 'pending')
  );

  const existingRequests = await getDocs(existingRequestQuery);

  if (!existingRequests.empty) {
    throw new Error('You already have a pending request for this file');
  }

  // Create the access request
  await addDoc(collection(db, 'accessRequests'), {
    fileId,
    fileName,
    requestedBy: userId,
    requestedByEmail: userEmail,
    requestedAt: serverTimestamp(),
    status: 'pending',
    message: message || ''
  });

  // Log the activity
  await logActivity({
    userId,
    userEmail,
    action: 'file_access_request',
    resourceType: 'file',
    resourceId: fileId,
    resourceName: fileName,
    details: { message },
    success: true
  });
};

/**
 * Check if user can access a specific file based on RBAC
 */
export const canAccessFile = (
  file: { uploadedBy: string; allowedUsers: string[]; allowedRoles: string[] },
  userId: string,
  userRole: string
): boolean => {
  // Owner always has access
  if (file.uploadedBy === userId) return true;

  // Check if user is in allowed users
  if (file.allowedUsers.includes(userId)) return true;

  // Check if user's role is in allowed roles
  if (file.allowedRoles.includes(userRole)) return true;

  // Admin always has access
  if (userRole === 'admin') return true;

  return false;
};
