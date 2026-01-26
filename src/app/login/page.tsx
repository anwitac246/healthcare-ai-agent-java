"use client"
import { useState } from 'react';
import Navbar from '../components/navbar';

const UserTypeSelection = () => {
  const handleNavigation = (userType: 'patient' | 'doctor') => {
    // Replace these with your actual routing logic
    if (userType === 'patient') {
      window.location.href = '/patient_login';
    } else {
      window.location.href = '/doctor_login';
    }
  };

  return (
    <>
      <style>{`
        .card-hover {
          transition: all 0.3s ease;
        }
        .card-hover:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>
      <div className="min-h-screen bg-white">
        <Navbar/>

        {/* Selection Section */}
        <div className="flex min-h-[calc(100vh-80px)] ">
          {/* Left Side - Image */}
          <div className="hidden lg:flex lg:w-1/2 relative mt-10">
            <img 
              src="./2372722.jpg" 
              alt="Healthcare professional" 
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0"></div>
            <div className="absolute top-20 left-12 text-white max-w-md">
              <h2 className="text-4xl font-bold mb-4 text-green-900">
                Welcome to Aethercare
              </h2>
              <p className="text-lg text-green-800">
                Your comprehensive healthcare management platform. Choose your role to get started.
              </p>
            </div>
          </div>

          {/* Right Side - Selection Cards */}
          <div className="w-full lg:w-1/2 flex items-center justify-center px-6 sm:px-12 py-12">
            <div className="w-full max-w-md">
              <div className="text-center mb-8">
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  Get Started
                </h3>
                <p className="text-gray-600 text-sm">
                  Select how you'd like to continue
                </p>
              </div>

              <div className="space-y-5">
                {/* Patient Card */}
                <button
                  onClick={() => handleNavigation('patient')}
                  className="card-hover w-full p-6 border-2 border-green-200 rounded-xl hover:border-green-600 transition-all text-left bg-white"
                >
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        I'm a Patient
                      </h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Access your health records, book appointments, and manage your healthcare journey.
                      </p>
                      <div className="flex items-center text-green-700 text-sm font-semibold">
                        Continue as Patient
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Doctor Card */}
                <button
                  onClick={() => handleNavigation('doctor')}
                  className="card-hover w-full p-6 border-2 border-green-200 rounded-xl hover:border-green-600 transition-all text-left bg-white"
                >
                  <div className="flex items-start">
                    <div className="shrink-0">
                      <div className="w-14 h-14 bg-green-100 rounded-lg flex items-center justify-center">
                        <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4 flex-1">
                      <h4 className="text-xl font-bold text-gray-900 mb-2">
                        I'm a Doctor
                      </h4>
                      <p className="text-gray-600 text-sm mb-3">
                        Manage your patients, view appointments, and access professional tools.
                      </p>
                      <div className="flex items-center text-green-700 text-sm font-semibold">
                        Continue as Doctor
                        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Additional Info */}
              <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>New to Aethercare?</strong> Don't worry! You can create an account after selecting your role.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default UserTypeSelection;