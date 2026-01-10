import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import { useAuth } from '../../contexts/AuthContext';
import { Shield, Copy, Check } from 'lucide-react';
import toast from 'react-hot-toast';

const TwoFactorSetup: React.FC = () => {
  const { currentUser, setup2FA, verify2FA } = useAuth();
  const navigate = useNavigate();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(true); // State for QR code generation


  useEffect(() => {
    // If user already has 2FA enabled, redirect them away from setup
    if (currentUser?.twoFactorEnabled) {
      toast.error('Two-factor authentication is already enabled.');
      navigate('/dashboard');
      return;
    }

    const generateQRCode = async () => {
      setGenerating(true); // Start loading state
      try {
        const setupData = await setup2FA();
        setSecret(setupData.secret);

        const qrUrl = await QRCode.toDataURL(setupData.qrCodeUrl);
        setQrCodeUrl(qrUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
        toast.error('Failed to generate QR code. Please try again.');
        // Optionally redirect back or show retry button
        navigate('/dashboard'); // Redirect back if generation fails
      } finally {
        setGenerating(false); // End loading state
      }
    };

    // Only generate if not already enabled and currentUser exists
    if (currentUser && !currentUser.twoFactorEnabled) {
        generateQRCode();
    } else if (!currentUser) {
        // Handle case where currentUser might be null briefly
        setGenerating(false);
    }

  // Depend only on currentUser existence and 2FA status
  }, [currentUser?.uid, currentUser?.twoFactorEnabled, setup2FA, navigate]);


  const handleCopySecret = async () => {
    try {
      // Use document.execCommand as a fallback for potential iframe restrictions
      const textArea = document.createElement('textarea');
      textArea.value = secret;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      setCopied(true);
      toast.success('Secret copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
       console.error('Failed to copy secret:', err);
      toast.error('Failed to copy secret');
    }
  };


  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCode.trim() || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit verification code');
      return;
    }

    setLoading(true);
    try {
      await verify2FA(verificationCode);
      toast.success('Two-factor authentication enabled successfully!');
      navigate('/dashboard'); // Redirect to dashboard after successful setup
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed. Check the code and try again.';
      toast.error(errorMessage);
       setVerificationCode(''); // Clear input on error
    } finally {
      setLoading(false);
    }
  };

  // REMOVED handleSkip function - 2FA is now mandatory

   if (generating) {
      return (
         <div className="min-h-screen flex items-center justify-center bg-gray-50">
             <div className="flex items-center space-x-3">
                 <Shield className="w-8 h-8 text-blue-600 animate-spin" />
                 <span className="text-lg font-medium text-gray-700">Generating Secure Setup...</span>
             </div>
         </div>
      );
   }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <Shield className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Set up Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Secure your account with an additional layer of protection. <span className="font-semibold">This step is required.</span>
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* Step 1: Download an Authenticator App */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Step 1: Download an Authenticator App (FREE)
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Recommended FREE Apps:</strong>
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Google Authenticator</strong> - Simple and reliable</li>
                <li>• <strong>Microsoft Authenticator</strong> - Supports backup</li>
                <li>• <strong>Authy</strong> - Multi-device sync</li>
                <li>• <strong>1Password / Bitwarden / etc.</strong> - If you use a password manager with TOTP support</li>
              </ul>
              <p className="text-xs text-blue-600 mt-2">
                Most authenticator apps are completely FREE to download and use!
              </p>
            </div>
          </div>

          {/* Step 2: Scan QR Code */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Step 2: Scan QR Code
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Open your authenticator app and scan this QR code:
            </p>
            {qrCodeUrl ? (
              <div className="flex justify-center bg-white p-2 border rounded-lg">
                <img src={qrCodeUrl} alt="QR Code" />
              </div>
            ) : (
                <div className="flex justify-center items-center h-40 bg-gray-100 rounded-lg">
                    <p className="text-sm text-gray-500">Generating QR Code...</p>
                 </div>
            )}
          </div>

          {/* Step 3: Manual Entry Option */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Step 3: Or enter manually
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              If you can't scan the QR code, enter this secret key manually into your app:
            </p>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-100 p-2 rounded text-sm font-mono break-all">
                {secret || 'Generating...'}
              </code>
              <button
                onClick={handleCopySecret}
                disabled={!secret}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Copy secret"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Step 4: Verify */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Step 4: Verify Setup
            </h3>
            <form onSubmit={handleVerification} className="space-y-4">
              <div>
                <label htmlFor="verificationCode" className="block text-sm font-medium text-gray-700">
                  Enter the 6-digit code from your authenticator app:
                </label>
                <input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric" // Helps mobile users get numeric keyboard
                  pattern="\d{6}" // Basic pattern validation
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono tracking-widest" // Added tracking-widest
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoComplete="one-time-code" // Helps password managers
                />
              </div>

              {/* REMOVED Skip button */}
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6 || !secret} // Also disable if secret hasn't loaded
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? 'Verifying...' : 'Enable 2FA'}
              </button>
            </form>
          </div>
        </div>

        {/* Removed Back to Dashboard button during mandatory setup */}
        {/* <div className="text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard (If setup fails)
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default TwoFactorSetup;
