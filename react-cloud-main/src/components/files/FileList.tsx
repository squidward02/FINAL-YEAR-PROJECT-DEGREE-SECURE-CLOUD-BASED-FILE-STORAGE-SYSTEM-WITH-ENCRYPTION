import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { decryptFile } from '../../utils/encryption';
import type { FileMetadata } from '../../types';
import { 
  File, 
  Download, 
  Trash2, 
  Eye, 
  Lock,
  Calendar,
  User,
  HardDrive,
  Key,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const FileList: React.FC = () => {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingFiles, setDownloadingFiles] = useState<Set<string>>(new Set());
  const [showKeyPrompt, setShowKeyPrompt] = useState<FileMetadata | null>(null);
  const [decryptionKey, setDecryptionKey] = useState('');

  useEffect(() => {
    if (!currentUser) return;

    // Fetch both owned files and files shared with the user
    const ownFilesQuery = query(
      collection(db, 'files'),
      where('uploadedBy', '==', currentUser.uid),
      orderBy('uploadedAt', 'desc')
    );

    const sharedFilesQuery = query(
      collection(db, 'files'),
      where('allowedUsers', 'array-contains', currentUser.uid),
      orderBy('uploadedAt', 'desc')
    );

    const allFilesMap = new Map<string, FileMetadata>();

    const processSnapshot = (snapshot: any) => {
      snapshot.docs.forEach((doc: any) => {
        const fileData = {
          id: doc.id,
          ...doc.data()
        } as FileMetadata;
        allFilesMap.set(doc.id, fileData);
      });
      
      setFiles(Array.from(allFilesMap.values()));
      setLoading(false);
    };

    const unsubscribeOwn = onSnapshot(ownFilesQuery, processSnapshot);
    const unsubscribeShared = onSnapshot(sharedFilesQuery, processSnapshot);

    return () => {
      unsubscribeOwn();
      unsubscribeShared();
    };
  }, [currentUser]);

  const downloadFile = async (file: FileMetadata) => {
    if (!file.downloadUrl || !file.iv) {
      toast.error('File cannot be downloaded - missing encryption data');
      return;
    }

    // Show key prompt modal
    setShowKeyPrompt(file);
  };

  const handleDownloadWithKey = async () => {
    if (!showKeyPrompt || !decryptionKey.trim()) {
      toast.error('Please enter the decryption key');
      return;
    }

    const file = showKeyPrompt;
    setDownloadingFiles(prev => new Set(prev).add(file.id));
    setShowKeyPrompt(null);

    try {
      console.log('📥 Starting file download:', file.name);
      console.log('File metadata:', { id: file.id, iv: file.iv });
      
      // Fetch the encrypted file
      const response = await fetch(file.downloadUrl!);
      if (!response.ok) throw new Error('Failed to download file');
      
      const encryptedData = await response.arrayBuffer();
      console.log('Downloaded encrypted data:', encryptedData.byteLength, 'bytes');
      
      // Decrypt the file with user-provided key
      console.log('Attempting decryption with provided key...');
      const decryptedData = decryptFile({
        data: encryptedData,
        iv: file.iv!
      }, decryptionKey);

      if (!decryptedData) {
        console.error('❌ Decryption returned null');
        throw new Error('Decryption failed - incorrect key or corrupted file');
      }

      console.log('✅ Decryption successful, creating download...');

      // Create blob and download
      const blob = new Blob([decryptedData], { type: file.type });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = file.originalName || file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('File downloaded and decrypted successfully');
      setDecryptionKey(''); // Clear key after successful download
    } catch (error: any) {
      console.error('❌ Download/Decryption error:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      
      // Show user-friendly error message
      if (error.message.includes('incorrect key') || error.message.includes('Decryption failed')) {
        toast.error('❌ Wrong decryption key! Please check your password and try again.');
      } else {
        toast.error(error.message || 'Failed to download file');
      }
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.id);
        return newSet;
      });
    }
  };

  const deleteFile = async (file: FileMetadata) => {
    if (!confirm(`Are you sure you want to delete "${file.name}"?`)) {
      return;
    }

    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'files', file.id));
      
      // Delete from Storage
      if (file.storagePath) {
        const storageRef = ref(storage, file.storagePath);
        await deleteObject(storageRef);
      }

      toast.success('File deleted successfully');
    } catch (error: any) {
      console.error('Delete error:', error);
      toast.error('Failed to delete file');
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

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No files</h3>
        <p className="mt-1 text-sm text-gray-500">
          Get started by uploading a file.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg border">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">
          Your Files ({files.length})
        </h3>
      </div>
      
      <div className="divide-y divide-gray-200">
        {files.map((file) => (
          <div key={file.id} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1 min-w-0">
                {getFileIcon(file.type)}
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.originalName || file.name}
                    </p>
                    <Lock className="h-3 w-3 text-blue-500" />
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <HardDrive className="h-3 w-3" />
                      <span>{formatFileSize(file.size)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(file.uploadedAt)}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <User className="h-3 w-3" />
                      <span>You</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => downloadFile(file)}
                  disabled={downloadingFiles.has(file.id)}
                  className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Download file"
                >
                  <Download className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => deleteFile(file)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  title="Delete file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            
            {downloadingFiles.has(file.id) && (
              <div className="mt-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                    <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-1/3"></div>
                  </div>
                  <span className="text-xs text-gray-500">Downloading...</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Decryption Key Prompt Modal */}
      {showKeyPrompt && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 overflow-y-auto h-full w-full z-50 flex items-center justify-center px-4">
          <div className="relative mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <button
              onClick={() => {
                setShowKeyPrompt(null);
                setDecryptionKey('');
              }}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="mt-3 text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                <Key className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg leading-6 font-medium text-gray-900 mt-4">
                Enter Decryption Key
              </h3>
              <div className="mt-2 px-7 py-3">
                <p className="text-sm text-gray-600 mb-4">
                  Please enter the encryption key to download and decrypt{' '}
                  <span className="font-medium">{showKeyPrompt.originalName || showKeyPrompt.name}</span>
                </p>
                <input
                  type="password"
                  value={decryptionKey}
                  onChange={(e) => setDecryptionKey(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDownloadWithKey()}
                  placeholder="Enter encryption key..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div className="items-center px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={handleDownloadWithKey}
                  disabled={!decryptionKey.trim()}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowKeyPrompt(null);
                    setDecryptionKey('');
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

export default FileList;
