import React, { useState, useEffect } from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';
import type { FileMetadata } from '../../types';
import { decryptFile } from '../../utils/encryption';
import { decompressData } from '../../utils/compression';
import toast from 'react-hot-toast';

interface FilePreviewProps {
  file: FileMetadata;
  onClose: () => void;
  decryptionKey: string;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose, decryptionKey }) => {
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    loadPreview();
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file]);

  const loadPreview = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!file.downloadUrl || !file.iv) {
        throw new Error('File metadata incomplete');
      }

      // Check if file type is previewable
      if (!isPreviewable(file.type)) {
        setError('This file type cannot be previewed in the browser');
        setLoading(false);
        return;
      }

      // Fetch encrypted file
      const response = await fetch(file.downloadUrl);
      if (!response.ok) throw new Error('Failed to fetch file');

      const encryptedData = await response.arrayBuffer();

      // Decrypt
      let decryptedData = decryptFile({
        data: encryptedData,
        iv: file.iv
      }, decryptionKey);

      if (!decryptedData) {
        throw new Error('Decryption failed');
      }

      // Decompress if needed
      if (file.isCompressed) {
        decryptedData = decompressData(decryptedData);
      }

      // Create blob URL
      const blob = new Blob([decryptedData], { type: file.type });
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setLoading(false);
    } catch (err: any) {
      console.error('Preview error:', err);
      setError(err.message || 'Failed to load preview');
      setLoading(false);
    }
  };

  const isPreviewable = (mimeType: string): boolean => {
    const previewableTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'text/html',
      'text/css',
      'text/javascript',
      'application/json'
    ];

    return previewableTypes.some(type => mimeType.toLowerCase().includes(type));
  };

  const handleDownload = () => {
    if (previewUrl) {
      const a = document.createElement('a');
      a.href = previewUrl;
      a.download = file.originalName || file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success('Download started');
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  const isImage = file.type.startsWith('image/');
  const isPDF = file.type.includes('pdf');
  const isText = file.type.startsWith('text/') || file.type.includes('json');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <h3 className="text-white font-medium truncate max-w-md">
            {file.originalName || file.name}
          </h3>
          <span className="text-gray-400 text-sm">
            {file.type}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {isImage && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 text-white hover:bg-gray-800 rounded"
                title="Zoom Out"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
              <span className="text-white text-sm px-2">{zoom}%</span>
              <button
                onClick={handleZoomIn}
                className="p-2 text-white hover:bg-gray-800 rounded"
                title="Zoom In"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                onClick={handleRotate}
                className="p-2 text-white hover:bg-gray-800 rounded"
                title="Rotate"
              >
                <RotateCw className="h-5 w-5" />
              </button>
            </>
          )}

          <button
            onClick={handleDownload}
            className="p-2 text-white hover:bg-gray-800 rounded"
            title="Download"
            disabled={!previewUrl}
          >
            <Download className="h-5 w-5" />
          </button>

          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-gray-800 rounded"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4">
        {loading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white">Loading preview...</p>
          </div>
        ) : error ? (
          <div className="text-center text-white">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Download File Instead
            </button>
          </div>
        ) : isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={file.originalName || file.name}
            className="max-w-full max-h-full object-contain"
            style={{
              transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
              transition: 'transform 0.2s ease'
            }}
          />
        ) : isPDF && previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full bg-white"
            title="PDF Preview"
          />
        ) : isText && previewUrl ? (
          <iframe
            src={previewUrl}
            className="w-full h-full bg-white"
            title="Text Preview"
          />
        ) : (
          <div className="text-center text-white">
            <p className="mb-4">Preview not available for this file type</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
            >
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilePreview;
