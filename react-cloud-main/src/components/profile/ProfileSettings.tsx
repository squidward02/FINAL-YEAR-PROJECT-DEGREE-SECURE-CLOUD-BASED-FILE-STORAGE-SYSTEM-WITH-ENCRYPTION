import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { updateEmail, updatePassword, updateProfile, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { User, Mail, Phone, Lock, Shield, Calendar, Save, Edit2, X } from 'lucide-react';
import toast from 'react-hot-toast';

const ProfileSettings: React.FC = () => {
  const { currentUser, reloadUserData } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'editor': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setDisplayName(currentUser?.displayName || '');
    setEmail(currentUser?.email || '');
    setPhoneNumber(currentUser?.phoneNumber || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleSave = async () => {
    if (!currentUser || !auth.currentUser) {
      toast.error('Not authenticated');
      return;
    }

    // Validation
    if (!displayName.trim()) {
      toast.error('Display name is required');
      return;
    }

    if (!email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword && newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    // If changing email or password, need current password
    const needsReauth = email !== currentUser.email || newPassword;
    if (needsReauth && !currentPassword) {
      toast.error('Current password is required to change email or password');
      return;
    }

    try {
      setLoading(true);

      // Reauthenticate if needed
      if (needsReauth && currentPassword) {
        const credential = EmailAuthProvider.credential(
          currentUser.email,
          currentPassword
        );
        await reauthenticateWithCredential(auth.currentUser, credential);
      }

      // Update display name in Firebase Auth
      if (displayName !== currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }

      // Update email in Firebase Auth
      if (email !== currentUser.email) {
        await updateEmail(auth.currentUser, email);
      }

      // Update password in Firebase Auth
      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
      }

      // Update Firestore user document
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        displayName,
        email,
        phoneNumber: phoneNumber || null,
        updatedAt: new Date()
      });

      toast.success('Profile updated successfully!');
      setIsEditing(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // Reload user data from Firestore without page refresh
      await reloadUserData();
    } catch (error: any) {
      console.error('Profile update error:', error);
      
      if (error.code === 'auth/wrong-password') {
        toast.error('Current password is incorrect');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('Email is already in use by another account');
      } else if (error.code === 'auth/invalid-email') {
        toast.error('Invalid email address');
      } else if (error.code === 'auth/requires-recent-login') {
        toast.error('Please sign out and sign in again before changing your email or password');
      } else {
        toast.error(error.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your account information and security settings
          </p>
        </div>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Edit2 className="h-4 w-4" />
            Edit Profile
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>

      {/* Profile Information Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="space-y-4">
          {/* Display Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Display Name
              </div>
            </label>
            {isEditing ? (
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your name"
              />
            ) : (
              <div className="text-sm text-gray-900 py-2">
                {currentUser?.displayName || 'Not set'}
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </div>
            </label>
            {isEditing ? (
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your email"
              />
            ) : (
              <div className="text-sm text-gray-900 py-2">{currentUser?.email}</div>
            )}
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </div>
            </label>
            {isEditing ? (
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="+60123456789"
              />
            ) : (
              <div className="text-sm text-gray-900 py-2">
                {currentUser?.phoneNumber || 'Not set'}
              </div>
            )}
          </div>

          {/* Role (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <div className="py-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(currentUser?.role || '')}`}>
                {currentUser?.role}
              </span>
            </div>
          </div>

          {/* Account Created (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Account Created
              </div>
            </label>
            <div className="text-sm text-gray-900 py-2">
              {currentUser?.createdAt ? new Date(currentUser.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Password Change Section */}
      {isEditing && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </div>
          </h3>
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> You must enter your current password to change your email or password.
              </p>
            </div>

            {/* Current Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
                {(email !== currentUser?.email || newPassword) && <span className="text-red-500">*</span>}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter current password"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password (optional)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Leave blank to keep current password"
              />
              <p className="text-xs text-gray-500 mt-1">
                Minimum 6 characters
              </p>
            </div>

            {/* Confirm New Password */}
            {newPassword && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Re-enter new password"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Security Section */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Security</h3>
        <div className="space-y-4">
          {/* Two-Factor Authentication */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Two-Factor Authentication
              </div>
            </label>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center">
                <Shield className={`h-5 w-5 mr-2 ${currentUser?.twoFactorEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm text-gray-900">
                  {currentUser?.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {!currentUser?.twoFactorEnabled && (
                <a
                  href="/setup-2fa"
                  className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                >
                  Enable 2FA
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;
