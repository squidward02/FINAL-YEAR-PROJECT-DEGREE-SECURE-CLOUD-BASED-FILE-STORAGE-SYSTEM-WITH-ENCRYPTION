import React, { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import type { Folder, FileMetadata } from '../../types';
import { 
  Folder as FolderIcon, 
  FolderPlus, 
  ChevronRight, 
  ChevronDown,
  Trash2,
  Plus
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FolderTreeProps {
  onFolderSelect: (folderId: string | null) => void;
  selectedFolderId: string | null;
  showCreateFolder?: boolean;
}

interface TreeNode {
  folder: Folder;
  children: TreeNode[];
  isExpanded: boolean;
  files: FileMetadata[];
}

const FolderTree: React.FC<FolderTreeProps> = ({ 
  onFolderSelect, 
  selectedFolderId, 
  showCreateFolder = true 
}) => {
  const { currentUser } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));
  const [showNewFolderInput, setShowNewFolderInput] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(true);

  // Listen to folders and files
  useEffect(() => {
    if (!currentUser) return;

    // Listen to folders
    const foldersQuery = query(
      collection(db, 'folders'),
      where('createdBy', '==', currentUser.uid),
      orderBy('name', 'asc')
    );

    const unsubscribeFolders = onSnapshot(foldersQuery, (snapshot) => {
      const folderList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Folder[];
      
      setFolders(folderList);
    });

    // Listen to files
    const filesQuery = query(
      collection(db, 'files'),
      where('uploadedBy', '==', currentUser.uid),
      orderBy('name', 'asc')
    );

    const unsubscribeFiles = onSnapshot(filesQuery, (snapshot) => {
      const fileList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as FileMetadata[];
      
      setFiles(fileList);
      setLoading(false);
    });

    return () => {
      unsubscribeFolders();
      unsubscribeFiles();
    };
  }, [currentUser]);

  // Build tree structure when folders or files change
  useEffect(() => {
    const buildTree = (): TreeNode[] => {
      const folderMap = new Map<string, TreeNode>();
      const rootNodes: TreeNode[] = [];

      // Create nodes for all folders
      folders.forEach(folder => {
        folderMap.set(folder.id, {
          folder,
          children: [],
          isExpanded: expandedFolders.has(folder.id),
          files: files.filter(file => file.folderId === folder.id)
        });
      });

      // Build tree structure
      folders.forEach(folder => {
        const node = folderMap.get(folder.id)!;
        if (folder.parentId && folderMap.has(folder.parentId)) {
          folderMap.get(folder.parentId)!.children.push(node);
        } else {
          rootNodes.push(node);
        }
      });

      // Sort children
      const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => a.folder.name.localeCompare(b.folder.name));
        nodes.forEach(node => sortNodes(node.children));
      };

      sortNodes(rootNodes);
      return rootNodes;
    };

    setTreeNodes(buildTree());
  }, [folders, files, expandedFolders]);

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const createFolder = async (parentId: string | null, parentPath: string) => {
    if (!newFolderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    if (!currentUser) {
      toast.error('Not authenticated');
      return;
    }

    try {
      const folderPath = parentPath === '/' ? `/${newFolderName}` : `${parentPath}/${newFolderName}`;
      
      const folderData: Omit<Folder, 'id'> = {
        name: newFolderName.trim(),
        path: folderPath,
        createdBy: currentUser.uid,
        createdAt: new Date(),
        permissions: {
          read: [currentUser.uid],
          write: [currentUser.uid],
          delete: [currentUser.uid]
        },
        ...(parentId && { parentId }) // Only include parentId if it's not null
      };

      await addDoc(collection(db, 'folders'), folderData);
      toast.success('Folder created successfully');
      setNewFolderName('');
      setShowNewFolderInput(null);
      
      // Expand parent folder to show new folder
      if (parentId) {
        setExpandedFolders(prev => new Set(prev).add(parentId));
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    }
  };

  const deleteFolder = async (folder: Folder) => {
    if (!confirm(`Are you sure you want to delete the folder "${folder.name}" and all its contents?`)) {
      return;
    }

    try {
      // TODO: Also delete all files and subfolders
      await deleteDoc(doc(db, 'folders', folder.id));
      toast.success('Folder deleted successfully');
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    }
  };

  const renderTreeNode = (node: TreeNode, level: number = 0) => {
    const isSelected = selectedFolderId === node.folder.id;
    const hasChildren = node.children.length > 0;
    const paddingLeft = level * 20 + 8;

    return (
      <div key={node.folder.id}>
        <div
          className={`flex items-center space-x-2 py-2 px-2 hover:bg-gray-50 cursor-pointer rounded-md ${
            isSelected ? 'bg-blue-50 border-blue-200' : ''
          }`}
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => onFolderSelect(node.folder.id)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) {
                toggleFolder(node.folder.id);
              }
            }}
            className={`p-1 rounded ${hasChildren ? 'hover:bg-gray-200' : 'invisible'}`}
          >
            {hasChildren ? (
              node.isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )
            ) : (
              <div className="h-3 w-3" />
            )}
          </button>
          
          <FolderIcon className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">{node.folder.name}</span>
          <span className="text-xs text-gray-500">
            {node.files.length} files
          </span>
          
          <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewFolderInput(node.folder.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Create subfolder"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder(node.folder);
              }}
              className="p-1 hover:bg-red-100 rounded"
              title="Delete folder"
            >
              <Trash2 className="h-3 w-3 text-red-500" />
            </button>
          </div>
        </div>

        {/* New folder input */}
        {showNewFolderInput === node.folder.id && (
          <div
            className="flex items-center space-x-2 py-2 px-2"
            style={{ paddingLeft: `${paddingLeft + 40}px` }}
          >
            <FolderIcon className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createFolder(node.folder.id, node.folder.path);
                } else if (e.key === 'Escape') {
                  setShowNewFolderInput(null);
                  setNewFolderName('');
                }
              }}
              placeholder="New folder name"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => createFolder(node.folder.id, node.folder.path)}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(null);
                setNewFolderName('');
              }}
              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Render children if expanded */}
        {node.isExpanded && node.children.map(child => renderTreeNode(child, level + 1))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const rootFiles = files.filter(file => !file.folderId);

  return (
    <div className="bg-white rounded-lg border shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">Folders</h3>
        {showCreateFolder && (
          <button
            onClick={() => setShowNewFolderInput('root')}
            className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <FolderPlus className="h-3 w-3" />
            <span>New Folder</span>
          </button>
        )}
      </div>

      <div className="p-2 max-h-96 overflow-y-auto">
        {/* Root folder */}
        <div
          className={`flex items-center space-x-2 py-2 px-2 hover:bg-gray-50 cursor-pointer rounded-md group ${
            selectedFolderId === null ? 'bg-blue-50 border-blue-200' : ''
          }`}
          onClick={() => onFolderSelect(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder('root');
            }}
            className="p-1 rounded hover:bg-gray-200"
          >
            {expandedFolders.has('root') ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
          <FolderIcon className="h-4 w-4 text-blue-500" />
          <span className="text-sm font-medium text-gray-700 flex-1">Root</span>
          <span className="text-xs text-gray-500">{rootFiles.length} files</span>
          
          <div className="opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNewFolderInput('root');
              }}
              className="p-1 hover:bg-gray-200 rounded"
              title="Create folder"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* New folder input for root */}
        {showNewFolderInput === 'root' && (
          <div className="flex items-center space-x-2 py-2 px-2" style={{ paddingLeft: '40px' }}>
            <FolderIcon className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  createFolder(null, '/');
                } else if (e.key === 'Escape') {
                  setShowNewFolderInput(null);
                  setNewFolderName('');
                }
              }}
              placeholder="New folder name"
              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={() => createFolder(null, '/')}
              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create
            </button>
            <button
              onClick={() => {
                setShowNewFolderInput(null);
                setNewFolderName('');
              }}
              className="px-2 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Render tree nodes if root is expanded */}
        {expandedFolders.has('root') && treeNodes.map(node => renderTreeNode(node))}

        {/* Empty state */}
        {treeNodes.length === 0 && !showNewFolderInput && (
          <div className="text-center py-8 text-gray-500">
            <FolderIcon className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm">No folders yet</p>
            {showCreateFolder && (
              <button
                onClick={() => setShowNewFolderInput('root')}
                className="mt-2 text-xs text-blue-600 hover:text-blue-500"
              >
                Create your first folder
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FolderTree;
