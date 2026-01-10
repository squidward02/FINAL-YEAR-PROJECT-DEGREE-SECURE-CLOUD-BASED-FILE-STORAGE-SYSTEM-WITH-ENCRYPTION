import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { logActivity } from '../../utils/activityLog';
import type { AccessRequest } from '../../types';
import { CheckCircle, XCircle, Clock, MessageSquare, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

const AccessRequests: React.FC = () => {
  const { currentUser } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;

    // For admins: show all pending requests
    // For users: show their requests
    const q = currentUser.role === 'admin'
      ? query(collection(db, 'accessRequests'), where('status', '==', 'pending'))
      : query(collection(db, 'accessRequests'), where('requestedBy', '==', currentUser.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requestsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          requestedAt: data.requestedAt?.toDate?.() || new Date(),
          reviewedAt: data.reviewedAt?.toDate?.()
        } as AccessRequest;
      });
      setRequests(requestsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleApprove = async (request: AccessRequest) => {
    try {
      // Update request status
      await updateDoc(doc(db, 'accessRequests', request.id), {
        status: 'approved',
        reviewedBy: currentUser!.uid,
        reviewedAt: serverTimestamp()
      });

      // Add user to file's allowedUsers
      await updateDoc(doc(db, 'files', request.fileId), {
        allowedUsers: arrayUnion(request.requestedBy)
      });

      // Log activity
      await logActivity({
        userId: currentUser!.uid,
        userEmail: currentUser!.email!,
        action: 'file_access_granted',
        resourceType: 'file',
        resourceId: request.fileId,
        resourceName: request.fileName,
        details: { grantedTo: request.requestedByEmail },
        success: true
      });

      toast.success(`Access granted to ${request.requestedByEmail}`);
    } catch (error) {
      console.error('Failed to approve request:', error);
      toast.error('Failed to approve request');
    }
  };

  const handleDeny = async (request: AccessRequest) => {
    const reviewNote = prompt('Optional: Add a reason for denying access');

    try {
      await updateDoc(doc(db, 'accessRequests', request.id), {
        status: 'denied',
        reviewedBy: currentUser!.uid,
        reviewedAt: serverTimestamp(),
        reviewNote: reviewNote || undefined
      });

      await logActivity({
        userId: currentUser!.uid,
        userEmail: currentUser!.email!,
        action: 'file_access_denied',
        resourceType: 'file',
        resourceId: request.fileId,
        resourceName: request.fileName,
        details: { deniedTo: request.requestedByEmail },
        success: true
      });

      toast.success('Access request denied');
    } catch (error) {
      console.error('Failed to deny request:', error);
      toast.error('Failed to deny request');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </span>
        );
      case 'denied':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="h-3 w-3 mr-1" />
            Denied
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-8">
        <div className="flex justify-center items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FileText className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">
            File Access Requests
          </h3>
        </div>
        <span className="text-sm text-gray-500">
          {requests.length} {requests.length === 1 ? 'request' : 'requests'}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No access requests</h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentUser?.role === 'admin'
              ? 'No pending requests to review'
              : "You haven't requested access to any files"}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {requests.map((request) => (
            <div key={request.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                {/* Request Info */}
                <div className="flex-1 min-w-0">
                  {/* File Name */}
                  <div className="flex items-center space-x-2 mb-2">
                    <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {request.fileName}
                    </p>
                  </div>

                  {/* Requester Info */}
                  <p className="text-sm text-gray-600 mb-2">
                    Requested by: <span className="font-medium">{request.requestedByEmail}</span>
                  </p>

                  {/* Message */}
                  {request.message && (
                    <div className="mt-2 flex items-start space-x-2 text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                      <span className="italic">{request.message}</span>
                    </div>
                  )}

                  {/* Review Note (if denied) */}
                  {request.reviewNote && (
                    <div className="mt-2 flex items-start space-x-2 text-sm text-red-700 bg-red-50 p-3 rounded">
                      <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">Reason: </span>
                        <span>{request.reviewNote}</span>
                      </div>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                    <span>
                      Requested: {request.requestedAt instanceof Date
                        ? request.requestedAt.toLocaleString()
                        : 'Just now'}
                    </span>
                    {request.reviewedAt && (
                      <span>
                        Reviewed: {request.reviewedAt instanceof Date
                          ? request.reviewedAt.toLocaleString()
                          : 'Just now'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions / Status */}
                <div className="flex items-center space-x-2 ml-4">
                  {currentUser?.role === 'admin' && request.status === 'pending' ? (
                    <>
                      <button
                        onClick={() => handleApprove(request)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full transition-colors"
                        title="Approve Request"
                      >
                        <CheckCircle className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeny(request)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                        title="Deny Request"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </>
                  ) : (
                    getStatusBadge(request.status)
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Admin Info */}
      {currentUser?.role !== 'admin' && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-600">
            <span className="font-medium">Note:</span> Access requests are reviewed by administrators.
            You'll be notified once your request is processed.
          </p>
        </div>
      )}
    </div>
  );
};

export default AccessRequests;
