import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../files/FileUpload';
import FileManager from '../files/FileManager';
import FileBrowser from '../files/FileBrowser';
import UserManagement from '../admin/UserManagement';
import AccessRequestManagement from '../admin/AccessRequestManagement';
import Analytics from '../admin/Analytics';
import ProfileSettings from '../profile/ProfileSettings';
import {
  Shield,
  Upload,
  Files,
  Users,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Eye,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';

type TabType = 'files' | 'upload' | 'browse' | 'users' | 'requests' | 'analytics' | 'profile';

const Dashboard: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Error signing out');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canUpload = currentUser?.role === 'admin' || currentUser?.role === 'editor';
  const canManageUsers = currentUser?.role === 'admin';

  const tabs = [
    { id: 'files', label: 'My Files', icon: Files, show: true },
    { id: 'browse', label: 'Browse Files', icon: Eye, show: true },
    { id: 'upload', label: 'Upload', icon: Upload, show: canUpload },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, show: canManageUsers },
    { id: 'requests', label: 'Access Requests', icon: MessageSquare, show: canManageUsers },
    { id: 'users', label: 'Users', icon: Users, show: canManageUsers },
    { id: 'profile', label: 'Profile', icon: User, show: true },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <Shield className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-900">SecureCloud</h1>
            </div>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 p-2 hover:bg-gray-50"
              >
                <div className="flex items-center space-x-2">
                  <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-medium text-sm">
                      {currentUser?.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-gray-900">
                      {currentUser?.email}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(currentUser?.role || '')}`}>
                        {currentUser?.role}
                      </span>
                      {currentUser?.twoFactorEnabled && (
                        <Shield className="h-3 w-3 text-green-600" />
                      )}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setShowUserMenu(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Profile Settings
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.filter(tab => tab.show).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-8">
          {activeTab === 'files' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">My Files</h2>
              <FileManager />
            </div>
          )}

          {activeTab === 'browse' && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Browse All Files</h2>
              <FileBrowser />
            </div>
          )}

          {activeTab === 'upload' && canUpload && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Files</h2>
              <FileUpload />
            </div>
          )}

          {activeTab === 'analytics' && canManageUsers && (
            <Analytics />
          )}

          {activeTab === 'requests' && canManageUsers && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Access Requests</h2>
              <AccessRequestManagement />
            </div>
          )}

          {activeTab === 'users' && canManageUsers && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">User Management</h2>
              <UserManagement />
            </div>
          )}

          {activeTab === 'profile' && (
            <ProfileSettings />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
