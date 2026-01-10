import React, { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { storage, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
// Note: Removed the hardcoded VITE_ENCRYPTION_KEY import
import { encryptFile } from '../../utils/encryption';
import { sanitizeFilename, sanitizeFolderPath, isValidStoragePath } from '../../utils/pathSecurity';
import { Upload, X, File, CheckCircle, AlertCircle, Folder, Key, Eye, EyeOff } from 'lucide-react';
import type { Folder as FolderType } from '../../types';
import toast from 'react-hot-toast';

interface FileUploadState {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  // Add state for encryption key per file
  encryptionKey: string;
}

interface FileUploadProps {
  selectedFolderId?: string | null;
  onUploadComplete?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ selectedFolderId, onUploadComplete }) => {
  const { currentUser } = useAuth();
  const [files, setFiles] = useState<FileUploadState[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [folders, setFolders] = useState<FolderType[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(selectedFolderId || null);
  const [showKey, setShowKey] = useState<boolean>(false); // State to toggle key visibility
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's folders
  React.useEffect(() => {
    if (!currentUser) return;

    const foldersQuery = query(
      collection(db, 'folders'),
      where('createdBy', '==', currentUser.uid)
    );

    const unsubscribe = onSnapshot(foldersQuery, (snapshot) => {
      const folderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FolderType[];

      setFolders(folderList);
    });

    return unsubscribe;
  }, [currentUser]);

  // Update current folder when prop changes
  React.useEffect(() => {
    setCurrentFolderId(selectedFolderId || null);
  }, [selectedFolderId]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (selectedFiles: File[]) => {
    const newFiles = selectedFiles.map(file => ({
      file,
      progress: 0,
      status: 'pending' as const,
      encryptionKey: '', // Initialize encryption key as empty
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Function to update encryption key for a specific file
  const handleKeyChange = (index: number, key: string) => {
    setFiles(prev => prev.map((f, i) => i === index ? { ...f, encryptionKey: key } : f));
  };


  const uploadFile = async (fileState: FileUploadState, index: number) => {
    if (!currentUser) {
      toast.error('Not authenticated');
      return;
    }
    // Check if encryption key is provided
    if (!fileState.encryptionKey.trim()) {
      toast.error(`Please enter an encryption key for ${fileState.file.name}`);
      return;
    }


    const updateFileState = (updates: Partial<FileUploadState>) => {
      setFiles(prev => prev.map((f, i) => i === index ? { ...f, ...updates } : f));
    };

    try {
      updateFileState({ status: 'uploading', progress: 10 });

      // Use the user-provided encryption key
      const encryptionKey = fileState.encryptionKey;
      // Key strength validation (basic example, enhance as needed)
      if (encryptionKey.length < 8) {
         updateFileState({
            status: 'error',
            error: 'Encryption key must be at least 8 characters long.'
         });
         toast.error(`Encryption key for ${fileState.file.name} is too short (min 8 characters).`);
         return;
      }


      updateFileState({ progress: 30 });

      // Read file as ArrayBuffer and encrypt
      const fileBuffer = await fileState.file.arrayBuffer();
      // Pass the user's key to the encryption function
      const encryptedData = encryptFile(fileBuffer, encryptionKey);

      updateFileState({ progress: 50 });

      // Create encrypted file blob
      if (!encryptedData) {
        throw new Error('Encryption failed');
      }
      const encryptedBlob = new Blob([encryptedData.data]);

      // Upload to Firebase Storage with folder path
      // Sanitize filename to prevent directory traversal attacks
      const sanitizedFileName = sanitizeFilename(fileState.file.name);
      const fileName = `${Date.now()}_${sanitizedFileName}`;
      const selectedFolder = folders.find(f => f.id === currentFolderId);
      const folderPath = selectedFolder ? sanitizeFolderPath(selectedFolder.path.replace(/^\//, '')) : '';
      const storagePath = folderPath
        ? `files/${currentUser.uid}/${folderPath}/${fileName}`
        : `files/${currentUser.uid}/${fileName}`;

      // Validate the constructed storage path
      if (!isValidStoragePath(storagePath, currentUser.uid)) {
        throw new Error('Invalid storage path detected - security check failed');
      }

      const storageRef = ref(storage, storagePath);

      const uploadResult = await uploadBytes(storageRef, encryptedBlob);
      const downloadUrl = await getDownloadURL(uploadResult.ref);

      updateFileState({ progress: 80 });

      // Save metadata to Firestore, including the IV but NOT the key
      const fileMetadata = {
        name: fileState.file.name,
        originalName: fileState.file.name,
        size: fileState.file.size,
        type: fileState.file.type,
        // DO NOT STORE THE PLAINTEXT KEY HERE! Store only the IV.
        iv: encryptedData?.iv || '',
        uploadedBy: currentUser.uid,
        uploadedAt: serverTimestamp(),
        downloadUrl,
        storagePath,
        folderPath: selectedFolder?.path || '/',
        ...(currentFolderId && { folderId: currentFolderId }), // Only include folderId if it's not null
        // Add initial permissions - secure by default (admin only)
        // Admin must explicitly grant access to other users/roles
        allowedRoles: ['admin'], // Only admins can see by default
        allowedUsers: [currentUser.uid] // Owner (uploader) is always in allowed users
      };

      await addDoc(collection(db, 'files'), fileMetadata);

      updateFileState({ progress: 100, status: 'success' });
      toast.success(`${fileState.file.name} uploaded successfully`);

      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete();
      }

    } catch (error: unknown) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      updateFileState({
        status: 'error',
        error: errorMessage
      });
      toast.error(`Failed to upload ${fileState.file.name}`);
    }
  };

  const uploadAll = async () => {
    // Check if all pending files have keys
     const filesWithoutKeys = files.filter(f => f.status === 'pending' && !f.encryptionKey.trim());
     if (filesWithoutKeys.length > 0) {
       toast.error(`Please provide encryption keys for all files before uploading.`);
       return;
     }

    // Upload files sequentially
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadFile(files[i], i);
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Folder Selection */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="flex items-center space-x-3">
          <Folder className="h-5 w-5 text-blue-500" />
          <label htmlFor="folder-select" className="text-sm font-medium text-gray-700">
            Upload to folder:
          </label>
          <select
            id="folder-select"
            value={currentFolderId || ''}
            onChange={(e) => setCurrentFolderId(e.target.value || null)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Root folder</option>
            {folders.map(folder => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="space-y-4">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500">
              Files require an encryption key for upload
            </p>
            <p className="text-xs text-red-600 mt-1 font-medium">
              Important: You MUST remember the key to decrypt the file later.
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">
              Files to Upload ({files.length})
            </h3>
            {files.some(f => f.status === 'pending') && (
              <button
                onClick={uploadAll}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload All Pending
              </button>
            )}
          </div>

          <div className="divide-y divide-gray-200">
            {files.map((fileState, index) => (
              <div key={index} className="px-6 py-4 space-y-3">
                {/* File Info and Status */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <File className="h-8 w-8 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {fileState.file.name}
                          </p>
                          {fileState.status === 'success' && (
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                          )}
                          {fileState.status === 'error' && (
                            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-500">
                            {formatFileSize(fileState.file.size)}
                          </p>
                          {fileState.status === 'uploading' && (
                            <span className="text-sm text-blue-600">
                              {fileState.progress}%
                            </span>
                          )}
                        </div>
                        {fileState.status === 'error' && fileState.error && (
                          <p className="text-sm text-red-600 mt-1">
                            Error: {fileState.error}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {fileState.status === 'uploading' && (
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${fileState.progress}%` }}
                          />
                        </div>
                      )}

                      {fileState.status === 'pending' && (
                        <button
                          onClick={() => uploadFile(fileState, index)}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          disabled={!fileState.encryptionKey.trim()} // Disable if key is empty
                        >
                          Upload
                        </button>
                      )}

                      <button
                        onClick={() => removeFile(index)}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={fileState.status === 'uploading'}
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                </div>

                {/* Encryption Key Input (only if pending) */}
                 {fileState.status === 'pending' && (
                    <div className="relative">
                        <label htmlFor={`encryption-key-${index}`} className="sr-only">
                         Encryption Key for {fileState.file.name}
                        </label>
                         <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                         <input
                            id={`encryption-key-${index}`}
                            type={showKey ? 'text' : 'password'}
                            value={fileState.encryptionKey}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            placeholder="Enter Encryption Key (min 8 chars)"
                            className="pl-10 pr-10 py-2 w-full border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            required
                        />
                         <button
                            type="button"
                            className="absolute inset-y-0 right-0 pr-3 flex items-center"
                            onClick={() => setShowKey(!showKey)}
                            aria-label={showKey ? 'Hide key' : 'Show key'}
                          >
                           {showKey ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                           ) : (
                             <Eye className="h-4 w-4 text-gray-400" />
                           )}
                          </button>
                    </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
