import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { FileMetadata, AccessRequest } from '../../types';
import { 
  File, 
  Lock,
  Calendar,
  User as UserIcon,
  HardDrive,
  Eye,
  MessageSquare,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const FileBrowser: React.FC = () => {
  const { currentUser } = useAuth();
  const [allFiles, setAllFiles] = useState<FileMetadata[]>([]);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState<FileMetadata | null>(null);
  const [requestMessage, setRequestMessage] = useState('');

  // Fetch all files (for browsing)
  useEffect(() => {
    const filesQuery = query(
      collection(db, 'files'),
      orderBy('uploadedAt', 'desc')
    );

    const unsubscribe = onSnapshot(filesQuery, (snapshot) => {
      const fileList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileMetadata[];
      
      setAllFiles(fileList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch user's access requests
  useEffect(() => {
    if (!currentUser) return;

    const requestsQuery = query(
      collection(db, 'accessRequests'),
      where('requestedBy', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AccessRequest[];
      
      setAccessRequests(requestList);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Check if user has access to file
  const hasFileAccess = (file: FileMetadata) => {
    if (!currentUser) return false;
    
    // Owner always has access
    if (file.uploadedBy === currentUser.uid) return true;
    
    // Admin always has access
    if (currentUser.role === 'admin') return true;
    
    // Check if user is in allowedUsers
    if (file.allowedUsers?.includes(currentUser.uid)) return true;
    
    // Check if user's role is in allowedRoles
    if (file.allowedRoles?.includes(currentUser.role)) return true;
    
    return false;
  };

  // Check if user already requested access
  const hasRequestedAccess = (fileId: string) => {
    return accessRequests.some(req => 
      req.fileId === fileId && req.status === 'pending'
    );
  };

  // Request access to file
  const requestAccess = async () => {
    if (!showRequestModal || !currentUser) return;

    try {
      await addDoc(collection(db, 'accessRequests'), {
        fileId: showRequestModal.id,
        fileName: showRequestModal.originalName || showRequestModal.name,
        requestedBy: currentUser.uid,
        requestedByEmail: currentUser.email,
        requestedAt: serverTimestamp(),
        status: 'pending',
        message: requestMessage.trim() || 'I would like access to this file.'
      });

      toast.success('Access request sent successfully');
      setShowRequestModal(null);
      setRequestMessage('');
    } catch (error) {
      console.error('Error requesting access:', error);
      toast.error('Failed to send access request');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileIcon = (type: string) => {
    const iconClass = "h-8 w-8";
    
    if (type.startsWith('image/')) {
      return <Eye className={`${iconClass} text-green-500`} />;
    } else if (type.includes('pdf')) {
      return <File className={`${iconClass} text-red-500`} />;
    } else if (type.includes('document') || type.includes('word')) {
      return <File className={`${iconClass} text-blue-500`} />;
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return <File className={`${iconClass} text-green-600`} />;
    } else {
      return <File className={`${iconClass} text-gray-500`} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Browse All Files ({allFiles.length})
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Files you can access are highlighted. Request access for others.
          </p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {allFiles.map((file) => {
            const hasAccess = hasFileAccess(file);
            const hasRequested = hasRequestedAccess(file.id);
            
            return (
              <div key={file.id} className={`px-6 py-4 ${hasAccess ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {getFileIcon(file.type)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {file.originalName || file.name}
                        </p>
                        <Lock className="h-3 w-3 text-blue-500" />
                        {hasAccess && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Accessible</span>}
                        {!hasAccess && hasRequested && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">Requested</span>}
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                        <div className="flex items-center space-x-1">
                          <HardDrive className="h-3 w-3" />
                          <span>{formatFileSize(file.size)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(file.uploadedAt)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <UserIcon className="h-3 w-3" />
                          <span>{file.uploadedBy === currentUser?.uid ? 'You' : 'Other user'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    {hasAccess ? (
                      <span className="text-xs text-green-600 font-medium">
                        ✓ Can Download
                      </span>
                    ) : hasRequested ? (
                      <span className="flex items-center text-xs text-yellow-600 font-medium">
                        <Clock className="h-3 w-3 mr-1" />
                        Request Pending
                      </span>
                    ) : (
                      <button
                        onClick={() => setShowRequestModal(file)}
                        className="flex items-center px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Request Access
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Access Request Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Request File Access
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-600 mb-4">
                  Request access to <span className="font-medium">{showRequestModal.originalName || showRequestModal.name}</span>
                </p>
                <textarea
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  placeholder="Optional: Explain why you need access to this file..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="items-center px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={requestAccess}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Send Request
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestModal(null);
                    setRequestMessage('');
                  }}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileBrowser;