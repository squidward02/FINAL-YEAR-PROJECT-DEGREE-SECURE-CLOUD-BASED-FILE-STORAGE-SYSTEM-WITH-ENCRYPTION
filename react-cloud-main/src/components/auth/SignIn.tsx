import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, Eye, EyeOff, Shield } from 'lucide-react';

const SignIn: React.FC = () => {
  console.log('SignIn component mounted'); // Mount debug

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpToken, setTotpToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Use localStorage to persist 2FA requirement across component re-mounts
  const [requires2FA, setRequires2FA] = useState(() => {
    const stored = localStorage.getItem('signin_requires_2fa') === 'true';
    console.log('Initializing requires2FA from localStorage:', stored);
    return stored;
  });
  const [show2FAInput, setShow2FAInput] = useState(() => {
    const stored = localStorage.getItem('signin_requires_2fa') === 'true';
    console.log('Initializing show2FAInput from localStorage:', stored);
    return stored;
  });
  
  const { signIn } = useAuth();
  const navigate = useNavigate();

  // Debug: Track state changes
  useEffect(() => {
    console.log('requires2FA state changed:', requires2FA);
    console.log('show2FAInput state changed:', show2FAInput);
    console.log('localStorage signin_requires_2fa:', localStorage.getItem('signin_requires_2fa'));
  }, [requires2FA, show2FAInput]);

  // Clear localStorage on unmount (navigation away)
  useEffect(() => {
    return () => {
      // Only clear if we're navigating away successfully
      const currentPath = window.location.pathname;
      if (currentPath !== '/signin' && currentPath !== '/') {
        localStorage.removeItem('signin_requires_2fa');
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await signIn(email, password, requires2FA ? totpToken : undefined);
      // Clear 2FA requirement on successful sign in
      localStorage.removeItem('signin_requires_2fa');
      setRequires2FA(false);
      setShow2FAInput(false);
      navigate('/dashboard');
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.log('Error message:', error.message); // Debug log
        if (error.message === '2FA code required') {
          console.log('Setting requires2FA to true'); // Debug log
          // Set localStorage first to persist across re-mounts
          localStorage.setItem('signin_requires_2fa', 'true');
          // Set both states
          setRequires2FA(true);
          setShow2FAInput(true);
        } else if (error.message.includes('Invalid 2FA code')) {
          // Clear the 2FA token on invalid code
          setTotpToken('');
        }
      }
      console.error('Sign in error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 mx-2 sm:mx-auto">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-blue-600">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Access your secure cloud storage
          </p>
        </div>

        {/* 2FA Enabled button - centered and styled properly */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setRequires2FA(true);
              setShow2FAInput(true);
            }}
            className="inline-flex items-center px-4 py-2 bg-green-100 hover:bg-green-200 border border-green-200 rounded-lg transition-colors"
          >
            <Shield className="h-4 w-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">2FA Enabled (Demo)</span>
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          {show2FAInput && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Shield className="h-5 w-5 text-blue-600 mr-2" />
                <p className="text-sm text-blue-800">
                  Two-factor authentication is enabled. Please enter your 6-digit code.
                </p>
              </div>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center focus:outline-none hover:bg-gray-50 rounded-r-lg transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                    )}
                  </button>
                </div>
              </div>
              
              {show2FAInput && (
                <div>
                  <label htmlFor="totpToken" className="block text-sm font-medium text-gray-700 mb-2">
                    Two-Factor Authentication Code
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Shield className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="totpToken"
                      name="totpToken"
                      type="text"
                      required={show2FAInput}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg placeholder-gray-400 text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-wider transition-colors"
                      placeholder="000000"
                      value={totpToken}
                      onChange={(e) => setTotpToken(e.target.value.replace(/\D/g, ''))}
                      maxLength={6}
                      autoComplete="one-time-code"
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-600 text-center">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={loading || (show2FAInput && totpToken.length !== 6)}
                className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Signing In...' : show2FAInput ? 'Verify & Sign In' : 'Sign In'}
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">
                Don't have an account?{' '}
                <Link to="/signup" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Sign up here
                </Link>
              </span>
            </div>
          </form>
        </div>
        
        {/* Demo credentials */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">Demo Credentials</h3>
          <p className="text-xs text-yellow-700">
            For testing: Use any email/password combination to create an account.<br/>
            {show2FAInput && (
              <span className="block mt-1 font-medium">
                📱 Enter the 6-digit code from your authenticator app to complete sign-in.
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignIn;
