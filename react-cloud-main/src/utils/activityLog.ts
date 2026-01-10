import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { ActivityAction } from '../types';

interface LogActivityParams {
  userId: string;
  userEmail: string;
  action: ActivityAction;
  resourceType?: 'file' | 'folder' | 'user' | 'system';
  resourceId?: string;
  resourceName?: string;
  details?: Record<string, any>;
  success?: boolean;
  errorMessage?: string;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const {
      userId,
      userEmail,
      action,
      resourceType,
      resourceId,
      resourceName,
      details = {},
      success = true,
      errorMessage
    } = params;

    // Get IP address and user agent
    const userAgent = navigator.userAgent;

    // Note: Getting real IP requires backend service
    // For now, we'll just log the user agent
    // Build activity data, only including defined values
    const activityData: any = {
      userId,
      userEmail,
      action,
      userAgent,
      timestamp: serverTimestamp(),
      success
    };

    // Only add optional fields if they're defined
    if (resourceType !== undefined) activityData.resourceType = resourceType;
    if (resourceId !== undefined) activityData.resourceId = resourceId;
    if (resourceName !== undefined) activityData.resourceName = resourceName;
    if (Object.keys(details).length > 0) activityData.details = details;
    if (errorMessage !== undefined) activityData.errorMessage = errorMessage;

    await addDoc(collection(db, 'activityLogs'), activityData);
  } catch (error) {
    // Silently fail - don't let logging errors affect the app
    console.error('Failed to log activity:', error);
  }
};

// Helper to get user's IP (requires external service)
export const getUserIP = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch {
    return undefined;
  }
};
