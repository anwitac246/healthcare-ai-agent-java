"use client"
import { useState, useEffect } from 'react';
import Navbar from '../components/navbar';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../../firebase-config';
import { useRouter } from 'next/navigation';

const DoctorLoginPage = () => {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
    specialization: '',
    clinicLocation: '',
    medicalLicenseNumber: '',
    yearsOfExperience: '',
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
          // Redirect to dashboard if already logged in
          if (user.role === 'DOCTOR') {
            router.push('/doctor/dashboard');
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
          role: 'DOCTOR',
          phoneNumber: userData.phoneNumber,
          medicalLicenseNumber: userData.medicalLicenseNumber,
          specialization: userData.specialization,
          clinicLocation: userData.clinicLocation,
          yearsOfExperience: parseInt(userData.yearsOfExperience),
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
      const response = await fetch(`${API_BASE_URL}/api/auth/doctor/login`, {
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
          role: 'DOCTOR'
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
      // First verify with backend that user exists and is a doctor
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
      
      window.location.href = '/doctor/dashboard';
      
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

    if (!formData.specialization || !formData.clinicLocation || !formData.medicalLicenseNumber) {
      setError('Please fill in all doctor-specific fields.');
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
        medicalLicenseNumber: formData.medicalLicenseNumber,
        specialization: formData.specialization,
        clinicLocation: formData.clinicLocation,
        yearsOfExperience: formData.yearsOfExperience,
      });
      
      window.location.href = '/doctor/dashboard';

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

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setSuccess('');
  };

  return (
    <>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f0fdf4;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #86efac;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #4ade80;
        }
      `}</style>
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
              Enter your doctor account email address and we'll send you a link to reset your password.
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
              placeholder="doctor@example.com"
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
          <div className="absolute inset-0"></div>
          <div className="absolute top-20 left-12 text-white max-w-md">
            <h2 className="text-4xl font-bold mb-4 text-green-900">
              {isLogin ? 'Welcome Back, Doctor' : 'Join Aethercare'}
            </h2>
            <p className="text-lg text-green-800">
              {isLogin 
                ? 'Access your Aethercare account to manage your healthcare practice.' 
                : 'Start your journey as a healthcare provider with Aethercare.'}
            </p>
          </div>
        </div>

        {/* Right Side - Auth Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 py-12">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <p className="text-gray-600 text-sm">
                {isLogin 
                  ? 'Enter your doctor credentials to access your account' 
                  : 'Fill in your professional details to get started'}
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

            {isLogin ? (
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
                    placeholder="doctor@example.com"
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
              <div className="space-y-3.5 max-h-[calc(100vh-300px)] overflow-y-auto pr-2 custom-scrollbar">
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
                    placeholder="doctor@example.com"
                    disabled={loading}
                  />
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

                <div className="pt-2 border-t border-green-200">
                  <p className="text-sm font-semibold text-green-900 mb-3">Professional Information</p>
                </div>

                <div>
                  <label htmlFor="medicalLicenseNumber" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Medical License Number *
                  </label>
                  <input
                    type="text"
                    id="medicalLicenseNumber"
                    name="medicalLicenseNumber"
                    value={formData.medicalLicenseNumber}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="MED123456"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="specialization" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Specialization *
                  </label>
                  <select
                    id="specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    disabled={loading}
                  >
                    <option value="">Select specialization</option>
                    <option value="cardiology">Cardiology</option>
                    <option value="dermatology">Dermatology</option>
                    <option value="pediatrics">Pediatrics</option>
                    <option value="orthopedics">Orthopedics</option>
                    <option value="neurology">Neurology</option>
                    <option value="general">General Practice</option>
                    <option value="psychiatry">Psychiatry</option>
                    <option value="oncology">Oncology</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="clinicLocation" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Clinic Location *
                  </label>
                  <input
                    type="text"
                    id="clinicLocation"
                    name="clinicLocation"
                    value={formData.clinicLocation}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="e.g., City General Hospital, New York"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="yearsOfExperience" className="block text-sm font-semibold text-green-800 mb-1.5">
                    Years of Experience *
                  </label>
                  <input
                    type="number"
                    id="yearsOfExperience"
                    name="yearsOfExperience"
                    value={formData.yearsOfExperience}
                    onChange={handleInputChange}
                    className="w-full text-green-950 px-3.5 py-2.5 border-2 border-green-200 rounded-lg focus:outline-none focus:border-green-600 transition-colors text-sm"
                    placeholder="e.g., 5"
                    min="0"
                    disabled={loading}
                  />
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
                  {loading ? 'Creating Account...' : 'Sign Up as Doctor'}
                </button>
              </div>
            )}

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
    </>
  );
};

export default DoctorLoginPage;