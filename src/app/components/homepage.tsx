"use client"
import Navbar from './navbar';

const Homepage = () => {
  return (
    <div className="min-h-screen bg-white">
     
      <div className="relative min-h-screen">
        
        <div className="absolute inset-0">
          <img 
            src="./4657842.jpg" 
            alt="Healthcare background" 
            className="w-full h-full object-cover"
          />
         
          <div className="absolute inset-0 bg-white/40"></div>
        </div>

     
        <Navbar />

       
        <div className="relative z-10 min-h-screen flex items-center">
          <div className="max-w-7xl mx-auto px-4 sm:px-8 w-full py-20">
            <div className="max-w-2xl">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-green-900 mb-4 sm:mb-6 leading-tight">
                Aethercare
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-green-800 mb-6 sm:mb-8 leading-relaxed">
                Transforming healthcare with innovative solutions that put patients first. 
                Experience seamless care delivery, advanced diagnostics, and personalized 
                treatment plans designed for your wellbeing.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <button className="bg-green-700 text-white px-6 sm:px-8 py-3 rounded-full hover:bg-green-800 transition-colors font-semibold text-base lg:text-lg">
                  Learn More
                </button>
                <button className="border-2 border-green-800 text-green-800 px-6 sm:px-8 py-3 rounded-full hover:bg-green-50 transition-colors font-semibold text-base lg:text-lg">
                  Contact Us
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 sm:py-16 lg:py-20 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-green-800 text-center mb-10 sm:mb-16">
            Why Choose Aethercare?
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 lg:gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-green-800 mb-3 sm:mb-4">Quality Care</h3>
              <p className="text-gray-600">Delivering exceptional healthcare services with experienced professionals dedicated to your wellness.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-green-800 mb-3 sm:mb-4">24/7 Support</h3>
              <p className="text-gray-600">Round-the-clock assistance ensuring you receive care whenever you need it most.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl sm:text-2xl font-semibold text-green-800 mb-3 sm:mb-4">Advanced Technology</h3>
              <p className="text-gray-600">Leveraging cutting-edge medical technology for accurate diagnosis and effective treatment.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-green-800 text-white py-8 sm:py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-xl sm:text-2xl font-bold mb-4">Aethercare</h3>
              <p className="text-green-100">Your trusted partner in healthcare excellence.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-green-100">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Services</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Doctors</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Appointments</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Services</h4>
              <ul className="space-y-2 text-green-100">
                <li><a href="#" className="hover:text-white transition-colors">Emergency Care</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Diagnostics</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Telemedicine</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Wellness Programs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-green-100 text-sm sm:text-base">
                <li>Email: info@aethercare.com</li>
                <li>Phone: +1 (555) 123-4567</li>
                <li>Address: 123 Health St, Medical District</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-green-700 pt-6 sm:pt-8 text-center text-green-100 text-sm sm:text-base">
            <p>&copy; 2026 Aethercare. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;