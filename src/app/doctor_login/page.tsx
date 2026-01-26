"use client"
import { useState } from 'react';
import Navbar from '../components/navbar';

const DoctorLoginPage = () => {
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
    specialization: '',
    clinicLocation: '',
    medicalLicenseNumber: '',
    yearsOfExperience: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      // Your Firebase login logic here
      console.log('Login attempt with:', email);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Doctor login successful');
      
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

    if (!formData.specialization || !formData.clinicLocation || !formData.medicalLicenseNumber) {
      setError('Please fill in all doctor-specific fields.');
      return;
    }

    setLoading(true);

    try {
      // Your Firebase signup logic here
      console.log('Sign up attempt with:', formData);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Doctor sign up successful');

    } catch (error: unknown) {
      console.error('Sign up error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create account. Please try again.';
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