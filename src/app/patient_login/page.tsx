"use client"
import { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../firebase-config';
import { useRouter } from 'next/navigation';

const AuthPage = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showAdditionalInfo, setShowAdditionalInfo] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [socialAuthUser, setSocialAuthUser] = useState<any>(null);
  const [socialAuthToken, setSocialAuthToken] = useState<string>('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('authToken');
      const userData = localStorage.getItem('userData');
      
      if (token && userData) {
        try {
          const user = JSON.parse(userData);
          // Redirect to appointment page if already logged in
          if (user.role === 'PATIENT') {
            router.push('/patient/appointment');
          }
        } catch (e) {
          // Invalid user data, clear storage
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
        }
      }
    };

    checkAuth();
  }, [router]);

  const sendRegistrationToBackend = async (firebaseUid: string, token: string, userData: any) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: firebaseUid,
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: 'PATIENT',
          phoneNumber: userData.phoneNumber,
          dateOfBirth: userData.dateOfBirth,
          gender: userData.gender,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      throw error;
    }
  };

  const sendLoginToBackend = async (firebaseUid: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/patient/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          firebaseUid: firebaseUid
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json();
      
      localStorage.setItem('authToken', token);
      localStorage.setItem('userData', JSON.stringify(data.data));
      
      return data;
    } catch (error) {
      throw error;
    }
  };

  const verifyPasswordResetEligibility = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/password-reset/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          role: 'PATIENT'
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Verification failed');
      }
      
      return true;
    } catch (error) {
      throw error;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleForgotPassword = async () => {
    setError('');
    setSuccess('');

    if (!resetEmail) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);

    try {
      // First verify with backend that user exists and is a patient
      await verifyPasswordResetEligibility(resetEmail);
      
      // If verification passes, send Firebase password reset email
      await sendPasswordResetEmail(auth, resetEmail);
      
      setSuccess('Password reset email sent! Please check your inbox.');
      setResetEmail('');
      
      // Close forgot password modal after 3 seconds
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
      }, 3000);
    } catch (error: any) {
      // Handle backend verification errors
      if (error.message) {
        setError(error.message);
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError('Failed to send password reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      
      await sendLoginToBackend(user.uid, token);
      
      window.location.href = '/patient/appointment';
      
    } catch (error: any) {
      // Handle Firebase auth errors
      if (error.code === 'auth/invalid-credential' || 
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/wrong-password' ||
          error.code === 'auth/invalid-email') {
        setError('Either the email or password is incorrect.');
      } else if (error.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else if (error.message && !error.code) {
        // Backend error
        setError(error.message);
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');
    setSuccess('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (!formData.phoneNumber || !formData.dateOfBirth || !formData.gender) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      const token = await user.getIdToken();

      await sendRegistrationToBackend(user.uid, token, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      });
      
      window.location.href = '/patient/appointment';

    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (error.message && !error.code) {
        setError(error.message);
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSocialAuthInitial = async (provider: GoogleAuthProvider | FacebookAuthProvider, providerName: string) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const token = await user.getIdToken();

      if (isLogin) {
        // Try to login
        try {
          await sendLoginToBackend(user.uid, token);
          window.location.href = '/patient/appointment';
        } catch (loginError) {
          // User doesn't exist, need to register
          setSocialAuthUser(user);
          setSocialAuthToken(token);
          setFormData(prev => ({
            ...prev,
            firstName: user.displayName?.split(' ')[0] || '',
            lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
            email: user.email || '',
          }));
          setShowAdditionalInfo(true);
        }
      } else {
        // Sign up flow
        setSocialAuthUser(user);
        setSocialAuthToken(token);
        setFormData(prev => ({
          ...prev,
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
        }));
        setShowAdditionalInfo(true);
      }
      
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in cancelled. Please try again.');
      } else if (error.code === 'auth/account-exists-with-different-credential') {
        setError('An account already exists with this email using a different sign-in method.');
      } else {
        setError(`Failed to authenticate with ${providerName}. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => handleSocialAuthInitial(new GoogleAuthProvider(), 'Google');
  const handleFacebookAuth = () => handleSocialAuthInitial(new FacebookAuthProvider(), 'Facebook');

  const handleCompleteSocialSignup = async () => {
    setError('');
    setSuccess('');

    if (!formData.phoneNumber || !formData.dateOfBirth || !formData.gender) {
      setError('Please fill in all required fields to complete your registration.');
      return;
    }

    setLoading(true);

    try {
      await sendRegistrationToBackend(socialAuthUser.uid, socialAuthToken, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      });
      
      window.location.href = '/patient/appointment';
      
    } catch (error: any) {
      if (error.message) {
        setError(error.message);
      } else {
        setError('Failed to complete registration. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
    setShowAdditionalInfo(false);
    setSocialAuthUser(null);
    setSocialAuthToken('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <div className="relative bg-white border-b border-green-100 mb-20">
        <Navbar />
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-green-900 mb-4">Reset Password</h3>
            <p className="text-gray-600 text-sm mb-4">
              Enter your patient account email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            <input
              type="email"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleForgotPassword()}
              className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm mb-4"
              placeholder="you@example.com"
              disabled={loading}
            />

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccess('');
                  setResetEmail('');
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 border-2 border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors font-semibold disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleForgotPassword}
                disabled={loading}
                className="flex-1 bg-green-700 text-white py-2.5 rounded-lg hover:bg-green-800 transition-colors font-semibold disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Section */}
      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Left Side - Image */}
        <div className="hidden lg:flex lg:w-1/2 relative">
          <img 
            src="./2372722.jpg" 
            alt="Healthcare professional" 
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 "></div>
          <div className="absolute top-20 left-12 text-white max-w-md">
            <h2 className="text-4xl font-bold mb-4 text-green-900">
              {showAdditionalInfo ? 'Almost There!' : isLogin ? 'Welcome Back' : 'Join Aethercare'}
            </h2>
            <p className="text-lg text-green-800">
              {showAdditionalInfo 
                ? 'Just a few more details to complete your registration.' 
                : isLogin 
                  ? 'Access your Aethercare account to manage your healthcare journey.' 
                  : 'Start your journey to better healthcare management today.'}
            </p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <p className="text-gray-600 text-sm">
                {showAdditionalInfo 
                  ? 'Complete your profile to get started' 
                  : isLogin 
                    ? 'Enter your credentials to access your account' 
                    : 'Fill in your details to get started'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}

            {/* Additional Info Form for Social Auth */}
            {showAdditionalInfo ? (
              <div className="space-y-3.5">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-sm text-green-800">
                    <strong>Welcome, {formData.firstName}!</strong> Please provide the following information to complete your registration.
                  </p>
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="+1 (555) 123-4567"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    disabled={loading}
                  >
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <button
                  onClick={handleCompleteSocialSignup}
                  disabled={loading}
                  className="w-full bg-green-700 text-white py-2.5 rounded-lg hover:bg-green-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Completing Registration...' : 'Complete Registration'}
                </button>
              </div>
            ) : isLogin ? (
              /* Login Form */
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 text-green-700 border-green-300 rounded focus:ring-green-500"
                      disabled={loading}
                    />
                    <label htmlFor="remember" className="ml-2 text-sm text-gray-600">
                      Remember me
                    </label>
                  </div>
                  <button
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-green-700 hover:text-green-600 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  onClick={handleLogin}
                  disabled={loading}
                  className="w-full bg-green-700 text-white py-2.5 rounded-lg hover:bg-green-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            ) : (
              /* Sign Up Form */
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-green-800 mb-1.5">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                      placeholder="John"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-green-800 mb-1.5">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                      placeholder="Doe"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="signupEmail" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="signupEmail"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="you@example.com"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="phoneNumber" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="+1 (555) 123-4567"
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dateOfBirth" className="block text-sm font-semibold text-green-800 mb-1.5">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                      disabled={loading}
                    />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-semibold text-green-800 mb-1.5">
                      Gender
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                      disabled={loading}
                    >
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="signupPassword" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Password *
                  </label>
                  <input
                    type="password"
                    id="signupPassword"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="Min. 6 characters"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="Re-enter password"
                    disabled={loading}
                  />
                </div>

                <button
                  onClick={handleSignUp}
                  disabled={loading}
                  className="w-full bg-green-700 text-white py-2.5 rounded-lg hover:bg-green-800 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Creating Account...' : 'Sign Up'}
                </button>
              </div>
            )}

            {/* Social Auth Buttons - Hide when showing additional info */}
            {!showAdditionalInfo && (
              <>
                {/* Divider */}
                <div className="relative my-5">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-green-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white text-gray-500">
                      {isLogin ? 'Or continue with' : 'Or sign up with'}
                    </span>
                  </div>
                </div>

                {/* Social Auth Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2.5 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Google</span>
                  </button>
                  <button
                    onClick={handleFacebookAuth}
                    disabled={loading}
                    className="flex items-center justify-center px-4 py-2.5 border-2 border-green-200 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Facebook</span>
                  </button>
                </div>

                {/* Toggle Link */}
                <p className="text-center text-gray-600 mt-5 text-sm">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <button 
                    onClick={toggleAuthMode}
                    className="text-green-700 hover:text-green-600 font-semibold"
                  >
                    {isLogin ? 'Sign up' : 'Login'}
                  </button>
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;