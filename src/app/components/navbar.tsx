"use client"
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isServicesOpen, setIsServicesOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState('patient'); 
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const type = localStorage.getItem('userType') || 'patient'; 
    setIsLoggedIn(!!token);
    setUserType(type);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userType');
    setIsLoggedIn(false);
    router.push('/');
  };

  const dashboardLink = userType === 'doctor' ? '/doctor/appointment' : '/patient/appointment';
  const appointmentLink = userType === 'doctor' ? '/doctor/appointment' : '/patient/appointment';

  return (
    <nav className="fixed top-0 left-0 right-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        <Link href="/"><div className="text-xl sm:text-2xl font-bold text-green-900">Aethercare</div></Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6 lg:space-x-8 items-center">
          <Link href="/" className="text-green-800 hover:text-green-600 transition-colors font-medium">Home</Link>
          
          {/* Services Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsServicesOpen(!isServicesOpen)}
              className="text-green-800 hover:text-green-600 transition-colors font-medium flex items-center gap-1"
            >
              Services
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {isServicesOpen && (
              <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-green-100 py-2">
                <Link href="/diagnosis-bot">
                  <div className="px-4 py-2 text-green-800 hover:bg-green-50 transition-colors cursor-pointer">
                    Free Diagnosis
                  </div>
                </Link>
                <Link href={appointmentLink}>
                  <div className="px-4 py-2 text-green-800 hover:bg-green-50 transition-colors cursor-pointer">
                    Book Appointment
                  </div>
                </Link>
              </div>
            )}
          </div>
          
          <Link href="/contact" className="text-green-800 hover:text-green-600 transition-colors font-medium">Contact</Link>
        </div>
        
        {/* Desktop Buttons */}
        <div className="hidden md:flex space-x-3 lg:space-x-4">
          {isLoggedIn ? (
            <>
              <Link href={dashboardLink}>
                <button className="bg-green-700 text-white px-4 lg:px-6 py-2 rounded-full hover:bg-green-800 transition-colors font-medium text-sm lg:text-base">
                  Dashboard
                </button>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-green-800 border-2 border-green-800 px-4 lg:px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium text-sm lg:text-base"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <button className="text-green-800 border-2 border-green-800 px-4 lg:px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium text-sm lg:text-base">
                  Login
                </button>
              </Link>
              <button className="bg-green-700 text-white px-4 lg:px-6 py-2 rounded-full hover:bg-green-800 transition-colors font-medium text-sm lg:text-base">
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-green-900 p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden mt-0 bg-white backdrop-blur-sm py-4 px-4 shadow-lg border-t border-gray-200">
          <div className="flex flex-col space-y-4">
            <Link href="/" className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium">Home</Link>
            
            {/* Mobile Services Dropdown */}
            <div>
              <button
                onClick={() => setIsServicesOpen(!isServicesOpen)}
                className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium flex items-center justify-between w-full"
              >
                Services
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isServicesOpen && (
                <div className="ml-4 mt-2 space-y-2">
                  <Link href="/diagnosis-bot">
                    <div className="text-green-700 hover:text-green-600 transition-colors py-2">
                      Free Diagnosis
                    </div>
                  </Link>
                  <Link href={appointmentLink}>
                    <div className="text-green-700 hover:text-green-600 transition-colors py-2">
                      Book Appointment
                    </div>
                  </Link>
                </div>
              )}
            </div>
            
            <Link href="/contact" className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium">Contact</Link>
            
            <div className="flex flex-col space-y-3 pt-4 border-t border-green-200">
              {isLoggedIn ? (
                <>
                  <Link href={dashboardLink}>
                    <button className="bg-green-700 text-white px-6 py-2 rounded-full hover:bg-green-800 transition-colors font-medium w-full">
                      Dashboard
                    </button>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="text-green-800 border-2 border-green-800 px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <button className="text-green-800 border-2 border-green-800 px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium w-full">
                      Login
                    </button>
                  </Link>
                  <button className="bg-green-700 text-white px-6 py-2 rounded-full hover:bg-green-800 transition-colors font-medium">
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;