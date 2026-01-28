"use client"
import Link from 'next/link';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    
    const token = localStorage.getItem('authToken');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
  
    localStorage.removeItem('authToken');
    setIsLoggedIn(false);
   
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 px-4 sm:px-8 py-4 sm:py-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link href="/"><div className="text-xl sm:text-2xl font-bold text-green-900">Aethercare</div></Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex space-x-6 lg:space-x-8">
          <a href="#" className="text-green-800 hover:text-green-600 transition-colors font-medium">Home</a>
          <a href="#" className="text-green-800 hover:text-green-600 transition-colors font-medium">About</a>
          <a href="#" className="text-green-800 hover:text-green-600 transition-colors font-medium">Services</a>
          <a href="#" className="text-green-800 hover:text-green-600 transition-colors font-medium">Contact</a>
        </div>
        
        {/* Desktop Buttons */}
        <div className="hidden md:flex space-x-3 lg:space-x-4">
          {isLoggedIn ? (
            <button 
              onClick={handleLogout}
              className="text-green-800 border-2 border-green-800 px-4 lg:px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium text-sm lg:text-base"
            >
              Logout
            </button>
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
        <div className="md:hidden mt-4 bg-white/95 backdrop-blur-sm rounded-lg py-4 px-4 shadow-lg border border-green-100">
          <div className="flex flex-col space-y-4">
            <a href="#" className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium">Home</a>
            <a href="#" className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium">About</a>
            <a href="#" className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium">Services</a>
            <a href="#" className="text-green-800 hover:text-green-600 transition-colors py-2 font-medium">Contact</a>
            <div className="flex flex-col space-y-3 pt-4 border-t border-green-200">
              {isLoggedIn ? (
                <button 
                  onClick={handleLogout}
                  className="text-green-800 border-2 border-green-800 px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium"
                >
                  Logout
                </button>
              ) : (
                <>
                  <Link href="/login">
                    <button className="text-green-800 border-2 border-green-800 px-6 py-2 rounded-full hover:bg-green-50 transition-colors font-medium">
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