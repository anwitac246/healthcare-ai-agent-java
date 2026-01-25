"use client"
import { useState } from 'react';
import Navbar from '../components/navbar';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider, FacebookAuthProvider, updateProfile } from 'firebase/auth';
import { auth } from '../../../firebase-config';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
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
  const [loading, setLoading] = useState(false);

  const sendTokenToBackend = async (token: string, userData?: any) => {
    try {
      const endpoint = isLogin ? 'verify' : 'register';
      const response = await fetch(`YOUR_BACKEND_URL/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, userData }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending token to backend:', error);
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

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const token = await user.getIdToken();
      await sendTokenToBackend(token);
      console.log('Login successful:', user);
      
    } catch (error: unknown) {
      console.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to login. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setError('');

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

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: `${formData.firstName} ${formData.lastName}`
      });

      const token = await user.getIdToken();

      await sendTokenToBackend(token, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
      });

      console.log('Sign up successful:', user);

    } catch (error: unknown) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const token = await user.getIdToken();

      if (!isLogin) {
        await sendTokenToBackend(token, {
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
        });
      } else {
        await sendTokenToBackend(token);
      }

      console.log('Google auth successful:', user);
      
    } catch (error: unknown) {
      console.error('Google auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with Google.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFacebookAuth = async () => {
    setError('');
    setLoading(true);

    try {
      const provider = new FacebookAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      const token = await user.getIdToken();

      if (!isLogin) {
        await sendTokenToBackend(token, {
          firstName: user.displayName?.split(' ')[0] || '',
          lastName: user.displayName?.split(' ').slice(1).join(' ') || '',
          email: user.email || '',
        });
      } else {
        await sendTokenToBackend(token);
      }

      console.log('Facebook auth successful:', user);
      
    } catch (error: unknown) {
      console.error('Facebook auth error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to authenticate with Facebook.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <div className="relative bg-white border-b border-green-100 mb-20">
        <Navbar />
      </div>

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
              {isLogin ? 'Welcome Back' : 'Join Aethercare'}
            </h2>
            <p className="text-lg text-green-800">
              {isLogin 
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
                {isLogin ? 'Enter your credentials to access your account' : 'Fill in your details to get started'}
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            {isLogin ? (
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
                  <a href="#" className="text-sm text-green-700 hover:text-green-600 font-medium">
                    Forgot password?
                  </a>
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;