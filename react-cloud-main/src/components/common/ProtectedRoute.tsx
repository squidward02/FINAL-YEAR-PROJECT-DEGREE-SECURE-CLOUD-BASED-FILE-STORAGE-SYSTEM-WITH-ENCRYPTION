import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Shield } from 'lucide-react'; // Import Shield icon

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'editor' | 'viewer';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole
}) => {
  const { currentUser, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex items-center space-x-3">
          <Shield className="w-8 h-8 text-blue-600 animate-pulse" />
          <span className="text-lg font-medium text-gray-700">Loading Session...</span>
        </div>
      </div>
    );
  }

  // If not logged in, redirect to signin
  if (!currentUser) {
    // Store the intended location to redirect back after login
    return <Navigate to="/signin" state={{ from: location }} replace />;
  }

  // --- Mandatory 2FA Check ---
  // If 2FA is NOT enabled, and the user is NOT on the setup page, redirect them
  if (!currentUser.twoFactorEnabled && location.pathname !== '/setup-2fa') {
      console.log("Redirecting to /setup-2fa because 2FA is not enabled.");
      return <Navigate to="/setup-2fa" replace />;
  }
  // If 2FA IS enabled, but the user somehow lands on the setup page, redirect to dashboard
  if (currentUser.twoFactorEnabled && location.pathname === '/setup-2fa') {
      console.log("Redirecting to /dashboard because 2FA is already enabled.");
      return <Navigate to="/dashboard" replace />;
  }
  // --- End Mandatory 2FA Check ---


  // --- Role Check ---
  // Check if user has required role
  if (requiredRole) {
     const userRole = currentUser.role || 'viewer'; // Default to 'viewer' if role is undefined
     const roleHierarchy = {
         'viewer': 1,
         'editor': 2,
         'admin': 3
     };

     // Allow access if user's role level is greater than or equal to required role level
     // Admins can access everything
     if (roleHierarchy[userRole] < roleHierarchy[requiredRole]) {
        // User does not have sufficient privileges
         return (
             <div className="min-h-screen flex items-center justify-center">
                 <div className="text-center p-6 bg-white shadow-md rounded-lg">
                     <Shield className="mx-auto h-12 w-12 text-red-500" />
                     <h2 className="mt-4 text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
                     <p className="text-gray-600">
                         You do not have the required '{requiredRole}' permissions to access this page.
                     </p>
                      <p className="mt-2 text-sm text-gray-500">
                         Your current role: '{userRole}'.
                      </p>
                      <button
                         onClick={() => window.history.back()} // Go back to previous page
                         className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                         Go Back
                      </button>
                 </div>
             </div>
         );
     }
  }
  // --- End Role Check ---

  // If logged in, 2FA is handled, and role check passes (or no role required), render the children
  return <>{children}</>;
};

export default ProtectedRoute;
