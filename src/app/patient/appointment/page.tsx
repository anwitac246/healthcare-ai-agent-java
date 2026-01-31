'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, Search, ChevronLeft, ChevronRight, Home, FileText, LogOut, Edit2, Save, Download, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from "../../components/navbar";

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinicLocation: string;
}

interface Appointment {
  id: string;
  doctorName: string;
  doctorSpecialization: string;
  mode: 'ONLINE' | 'IN_PERSON';
  appointmentDateTime: string;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  videoConferenceLink?: string;
  videoLinkAvailable: boolean;
  notes?: string;
  holdExpiresAt?: string;
  durationMinutes: number;
  cancellationReason?: string;
  rejectionReason?: string;
}

interface Report {
  id: string;
  patientName: string;
  diagnosis: string;
  symptoms: string[];
  medications: string[];
  careInstructions: string[];
  confidence: number;
  generatedAt: string;
  downloadUrl: string;
}

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PatientAppointments() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [activeSection, setActiveSection] = useState<'dashboard' | 'appointments' | 'reports'>('dashboard');
  
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentMode, setAppointmentMode] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [notes, setNotes] = useState('');
  
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'upcoming' | 'past'>('upcoming');
  
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<UserProfile | null>(null);
  const [editedProfile, setEditedProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authToken) {
      loadDoctors();
      if (activeSection === 'appointments') {
        loadAppointments();
      } else if (activeSection === 'reports') {
        loadReports();
      } else if (activeSection === 'dashboard') {
        loadProfile();
      }
    }
  }, [authToken, activeView, activeSection]);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDoctor, selectedDate]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token || !userDataStr) {
        router.push('/patient_login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/patient_login');
        return;
      }

      setAuthToken(token);
      setUserData(JSON.parse(userDataStr));
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/patient_login');
    } finally {
      setIsAuthChecking(false);
    }
  };

  const loadProfile = async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.data);
        setEditedProfile(data.data);
      }
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!authToken || !editedProfile) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(editedProfile)
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.data);
        setIsEditingProfile(false);
        alert('Profile updated successfully');
      } else {
        throw new Error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to save profile:', error);
      alert('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/patient`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReports(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async (reportId: string) => {
    if (!authToken) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/reports/${reportId}/download`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-report-${reportId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Failed to download report:', error);
    }
  };

  const loadDoctors = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/user/doctors`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        setDoctors(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load doctors:', error);
    }
  };

  const loadAppointments = async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      const endpoint = activeView === 'upcoming' 
        ? '/api/appointments/patient/upcoming'
        : '/api/appointments/patient/past';
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (activeView === 'upcoming') {
          setUpcomingAppointments(data.data || []);
        } else {
          setPastAppointments(data.data || []);
        }
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (date: string): TimeSlot[] => {
    const [year, month, day] = date.split('-').map(Number);
    const selectedDay = new Date(year, month - 1, day);
    const dayOfWeek = selectedDay.getDay();
    
    const slots: TimeSlot[] = [];
    let startHour = 9;
    let endHour = dayOfWeek === 0 ? 12 : 17;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const slotTime = new Date(year, month - 1, day, hour, 0, 0, 0);
      const endTime = new Date(year, month - 1, day, hour, 45, 0, 0);
      
      slots.push({
        startTime: slotTime.toISOString(),
        endTime: endTime.toISOString(),
        isAvailable: true
      });
    }
    
    return slots;
  };

  const loadAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      const allSlots = generateTimeSlots(selectedDate);
      
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/slots/${selectedDoctor.id}?date=${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const bookedSlots = data.data || [];
        
        const now = new Date();
        const updatedSlots = allSlots.map(slot => {
          const slotTime = new Date(slot.startTime);
          
          if (slotTime < now) {
            return { ...slot, isAvailable: false };
          }
          
          const isBooked = bookedSlots.some((bookedSlot: TimeSlot) => {
            const bookedStart = new Date(bookedSlot.startTime);
            return Math.abs(slotTime.getTime() - bookedStart.getTime()) < 60000;
          });
          
          return { ...slot, isAvailable: !isBooked };
        });
        
        setAvailableSlots(updatedSlots);
      } else {
        const now = new Date();
        const updatedSlots = allSlots.map(slot => ({
          ...slot,
          isAvailable: new Date(slot.startTime) >= now
        }));
        setAvailableSlots(updatedSlots);
      }
    } catch (error) {
      console.error('Failed to load slots:', error);
      const now = new Date();
      const allSlots = generateTimeSlots(selectedDate);
      const updatedSlots = allSlots.map(slot => ({
        ...slot,
        isAvailable: new Date(slot.startTime) >= now
      }));
      setAvailableSlots(updatedSlots);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedSlot || !selectedDoctor || !authToken) {
      alert('Please select a time slot and doctor');
      return;
    }

    setLoading(true);
    setError(null);

    const bookingData = {
      doctorId: selectedDoctor.id,
      appointmentDateTime: selectedSlot.startTime,
      mode: appointmentMode,
      notes: notes,
      durationMinutes: 45
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(bookingData)
      });

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        throw new Error(`Server returned invalid JSON. Status: ${response.status}`);
      }

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.details || `Booking failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      alert('Appointment booked successfully! Awaiting doctor approval.');
      setShowBookingModal(false);
      resetBookingForm();
      if (activeSection === 'appointments') {
        loadAppointments();
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred while booking';
      setError(errorMessage);
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !cancellationReason.trim() || !authToken) {
      alert('Please provide a cancellation reason');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ reason: cancellationReason })
        }
      );

      const responseText = await response.text();
      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse cancel response:', parseError);
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || `Failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      alert('Appointment cancelled successfully');
      setShowCancelModal(false);
      setCancellationReason('');
      setSelectedAppointment(null);
      if (activeSection === 'appointments') {
        loadAppointments();
      }
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    router.push('/patient_login');
  };

  const resetBookingForm = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setNotes('');
    setAvailableSlots([]);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeUntilExpiry = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '<1 min';
    return `${minutes} min`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const handleDateClick = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(dateStr);
    setSelectedSlot(null);
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedDate === dateStr;
  };

  const isDateDisabled = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const date = new Date(year, month, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return true;
    
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 15);
    if (date > maxDate) return true;
    
    return false;
  };

  const filteredAppointments = (activeView === 'upcoming' ? upcomingAppointments : pastAppointments)
    .filter(apt =>
      apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.doctorSpecialization?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const monthYear = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  if (isAuthChecking) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-700 mx-auto"></div>
          <p className="text-green-800 mt-6 font-medium">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="flex pt-16">
        <div className="w-72 min-h-screen bg-white border-r border-gray-100 shadow-sm fixed left-0 top-16">
          <nav className="flex-1 p-4 mt-10">
            <div className="space-y-2">
              <button
                onClick={() => setActiveSection('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeSection === 'dashboard'
                    ? 'bg-green-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>
              <button
                onClick={() => setActiveSection('appointments')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeSection === 'appointments'
                    ? 'bg-green-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Appointments</span>
              </button>
              <button
                onClick={() => setActiveSection('reports')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  activeSection === 'reports'
                    ? 'bg-green-700 text-white shadow-md'
                    : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Reports</span>
              </button>
            </div>
          </nav>

          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
            <div className="flex items-center gap-3 mb-4 p-3 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-white border-2 border-green-200 rounded-full flex items-center justify-center shadow-sm">
                <User className="w-6 h-6 text-green-700" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {userData?.firstName} {userData?.lastName}
                </p>
                <p className="text-xs text-gray-600">Patient</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        <div className="flex-1 ml-72 overflow-auto">
          <div className="max-w-[1400px] mx-auto px-8 py-8">
            {activeSection === 'dashboard' && (
              <div>
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">My Profile</h1>
                    <p className="text-gray-600 text-lg">Manage your personal information</p>
                  </div>
                  {!isEditingProfile ? (
                    <button
                      onClick={() => setIsEditingProfile(true)}
                      className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all shadow-md font-medium"
                    >
                      <Edit2 className="w-5 h-5" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setIsEditingProfile(false);
                          setEditedProfile(profileData);
                        }}
                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-medium"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveProfile}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-all shadow-md font-medium disabled:opacity-50"
                      >
                        <Save className="w-5 h-5" />
                        Save Changes
                      </button>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-700 mx-auto"></div>
                  </div>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">First Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editedProfile?.firstName || ''}
                            onChange={(e) => setEditedProfile(prev => prev ? {...prev, firstName: e.target.value} : null)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium py-3">{profileData?.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Last Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editedProfile?.lastName || ''}
                            onChange={(e) => setEditedProfile(prev => prev ? {...prev, lastName: e.target.value} : null)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium py-3">{profileData?.lastName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <p className="text-gray-900 font-medium py-3">{profileData?.email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                        {isEditingProfile ? (
                          <input
                            type="tel"
                            value={editedProfile?.phoneNumber || ''}
                            onChange={(e) => setEditedProfile(prev => prev ? {...prev, phoneNumber: e.target.value} : null)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium py-3">{profileData?.phoneNumber}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth</label>
                        {isEditingProfile ? (
                          <input
                            type="date"
                            value={editedProfile?.dateOfBirth || ''}
                            onChange={(e) => setEditedProfile(prev => prev ? {...prev, dateOfBirth: e.target.value} : null)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                        ) : (
                          <p className="text-gray-900 font-medium py-3">{profileData?.dateOfBirth}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                        {isEditingProfile ? (
                          <select
                            value={editedProfile?.gender || ''}
                            onChange={(e) => setEditedProfile(prev => prev ? {...prev, gender: e.target.value} : null)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                            <option value="other">Other</option>
                          </select>
                        ) : (
                          <p className="text-gray-900 font-medium py-3">{profileData?.gender}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeSection === 'appointments' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">My Appointments</h1>
                  <p className="text-gray-600 text-lg">Manage and track your healthcare appointments</p>
                </div>

                <div className="mb-8 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setActiveView('upcoming')}
                      className={`px-6 py-2.5 font-semibold rounded-lg transition-all duration-200 ${
                        activeView === 'upcoming'
                          ? 'bg-green-700 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500 hover:text-green-700'
                      }`}
                    >
                      Upcoming
                    </button>
                    <button
                      onClick={() => setActiveView('past')}
                      className={`px-6 py-2.5 font-semibold rounded-lg transition-all duration-200 ${
                        activeView === 'past'
                          ? 'bg-green-700 text-white shadow-md'
                          : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500 hover:text-green-700'
                      }`}
                    >
                      Past
                    </button>
                  </div>
                  <button
                    onClick={() => setShowBookingModal(true)}
                    className="px-6 py-2.5 bg-green-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold shadow-md"
                  >
                    + Book Appointment
                  </button>
                </div>

                <div className="mb-6">
                  <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search appointments..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-20">
                      <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-700 mx-auto"></div>
                      <p className="text-gray-600 mt-6 font-medium">Loading appointments...</p>
                    </div>
                  ) : filteredAppointments.length === 0 ? (
                    <div className="bg-white border border-gray-200 rounded-xl p-20 text-center shadow-sm">
                      <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600 text-lg">No {activeView} appointments found</p>
                    </div>
                  ) : (
                    filteredAppointments.map((appointment) => (
                      <div key={appointment.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-14 h-14 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                <User className="w-7 h-7 text-green-700" />
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{appointment.doctorName}</h3>
                                <p className="text-sm text-gray-600 mt-1">{appointment.doctorSpecialization}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                                <Clock className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{formatDateTime(appointment.appointmentDateTime)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                                {appointment.mode === 'ONLINE' ? <Video className="w-4 h-4 text-green-600" /> : <MapPin className="w-4 h-4 text-green-600" />}
                                <span className="font-medium">{appointment.mode === 'ONLINE' ? 'Online Consultation' : 'In-Person Visit'}</span>
                              </div>
                            </div>

                            {appointment.status === 'PENDING' && appointment.holdExpiresAt && (
                              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs font-semibold text-amber-900">Awaiting Doctor Approval</p>
                                  <p className="text-xs text-amber-700 mt-1">
                                    Slot held until {formatTime(appointment.holdExpiresAt)} (expires in {getTimeUntilExpiry(appointment.holdExpiresAt)})
                                  </p>
                                </div>
                              </div>
                            )}

                            {appointment.notes && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                                <p className="text-xs font-semibold text-blue-900 mb-1">Notes</p>
                                <p className="text-sm text-blue-800">{appointment.notes}</p>
                              </div>
                            )}

                            {appointment.rejectionReason && (
                              <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                                <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                                <p className="text-sm text-red-600">{appointment.rejectionReason}</p>
                              </div>
                            )}

                            {appointment.videoLinkAvailable && appointment.videoConferenceLink && (
                              <a
                                href={appointment.videoConferenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-700 text-white rounded-lg hover:shadow-lg transition-all duration-200 text-sm font-medium"
                              >
                                <Video className="w-4 h-4" />
                                Join Video Call
                              </a>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-3">
                            <span className={`px-4 py-1.5 text-xs font-semibold rounded-full ${
                              appointment.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                              appointment.status === 'SCHEDULED' ? 'bg-green-100 text-green-700' :
                              appointment.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                              appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                              appointment.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {appointment.status}
                            </span>

                            {(appointment.status === 'SCHEDULED' || appointment.status === 'PENDING') && activeView === 'upcoming' && (
                              <button
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setShowCancelModal(true);
                                }}
                                className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200 font-medium"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeSection === 'reports' && (
              <div>
                <div className="mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">Medical Reports</h1>
                  <p className="text-gray-600 text-lg">View and download your medical reports</p>
                </div>

                {loading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-700 mx-auto"></div>
                    <p className="text-gray-600 mt-6 font-medium">Loading reports...</p>
                  </div>
                ) : reports.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-20 text-center shadow-sm">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No reports available</p>
                    <p className="text-gray-500 text-sm mt-2">Your medical reports will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-14 h-14 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                <FileText className="w-7 h-7 text-green-700" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900">{report.diagnosis}</h3>
                                <p className="text-sm text-gray-600 mt-1">Generated on {formatDateTime(report.generatedAt)}</p>
                                <div className="mt-2">
                                  <span className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                    Confidence: {report.confidence}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Symptoms</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {report.symptoms.map((symptom, idx) => (
                                    <li key={idx}>{symptom}</li>
                                  ))}
                                </ul>
                              </div>
                              <div className="p-3 bg-gray-50 rounded-lg">
                                <p className="text-xs font-semibold text-gray-700 mb-2">Medications</p>
                                <ul className="text-sm text-gray-600 space-y-1">
                                  {report.medications.map((med, idx) => (
                                    <li key={idx}>{med}</li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <p className="text-xs font-semibold text-blue-900 mb-2">Care Instructions</p>
                              <ul className="text-sm text-blue-800 space-y-1">
                                {report.careInstructions.map((instruction, idx) => (
                                  <li key={idx}>{instruction}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          <div className="flex flex-col gap-2 ml-6">
                            <button
                              onClick={() => downloadReport(report.id)}
                              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-700 text-white rounded-lg hover:shadow-lg transition-all font-medium"
                            >
                              <Download className="w-4 h-4" />
                              Download PDF
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showBookingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center bg-green-50">
              <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  resetBookingForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                      <button 
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-2 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-base font-semibold text-gray-900">{monthYear}</h2>
                      <button 
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-2 hover:bg-gray-100 border border-gray-300 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                        <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                          {day}
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {Array.from({ length: startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1 }).map((_, i) => (
                        <div key={`empty-${i}`} />
                      ))}
                      {Array.from({ length: daysInMonth }).map((_, i) => {
                        const day = i + 1;
                        const isSelected = isDateSelected(day);
                        const isDisabled = isDateDisabled(day);
                        const isToday = new Date().getDate() === day && 
                                        new Date().getMonth() === currentMonth.getMonth() &&
                                        new Date().getFullYear() === currentMonth.getFullYear();
                        
                        return (
                          <button
                            key={day}
                            onClick={() => selectedDoctor && !isDisabled && handleDateClick(day)}
                            disabled={!selectedDoctor || isDisabled}
                            className={`
                              aspect-square flex items-center justify-center text-sm font-medium transition-all duration-200 rounded-lg
                              ${isSelected ? 'bg-green-700 text-white shadow-md scale-105' : ''}
                              ${!isSelected && isToday ? 'bg-green-50 text-green-700 border-2 border-green-300' : ''}
                              ${!isSelected && !isToday && !isDisabled ? 'hover:bg-gray-50 text-gray-900 border border-transparent hover:border-green-300' : ''}
                              ${isDisabled ? 'opacity-30 cursor-not-allowed text-gray-400' : ''}
                              ${!selectedDoctor && !isDisabled ? 'opacity-40 cursor-not-allowed' : ''}
                            `}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="font-semibold text-gray-900 mb-4">Consultation Mode</h3>
                    
                    <button
                      onClick={() => setAppointmentMode('ONLINE')}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                        appointmentMode === 'ONLINE' 
                          ? 'border-green-500 bg-green-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition-all ${
                          appointmentMode === 'ONLINE' ? 'border-green-600 bg-white shadow-sm' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <Video className={`w-6 h-6 ${appointmentMode === 'ONLINE' ? 'text-green-700' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Online Consultation</p>
                          <p className="text-xs text-gray-600">Video call with doctor</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setAppointmentMode('IN_PERSON')}
                      className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                        appointmentMode === 'IN_PERSON' 
                          ? 'border-green-500 bg-green-50 shadow-md' 
                          : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 border-2 rounded-xl flex items-center justify-center transition-all ${
                          appointmentMode === 'IN_PERSON' ? 'border-green-600 bg-white shadow-sm' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <MapPin className={`w-6 h-6 ${appointmentMode === 'IN_PERSON' ? 'text-green-700' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">In-Person Visit</p>
                          <p className="text-xs text-gray-600">Visit doctor's clinic</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Doctor</h2>
                    
                    {!selectedDoctor ? (
                      <select
                        onChange={(e) => {
                          const doctor = doctors.find(d => d.id === e.target.value);
                          setSelectedDoctor(doctor || null);
                          setSelectedDate('');
                          setSelectedSlot(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all shadow-sm"
                      >
                        <option value="">Choose a doctor...</option>
                        {doctors.map((doctor) => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name} - {doctor.specialization}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 bg-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center">
                            <User className="w-8 h-8 text-green-700" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{selectedDoctor.name}</h3>
                            <p className="text-sm text-gray-600">{selectedDoctor.specialization}</p>
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {selectedDoctor.clinicLocation}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedDoctor(null);
                            setSelectedDate('');
                            setSelectedSlot(null);
                          }}
                          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-all"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedDoctor && selectedDate && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {new Date(selectedDate).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </h3>
                      <p className="text-xs text-gray-500 mb-6">Select appointment time (45 min each)</p>

                      {availableSlots.length === 0 ? (
                        <p className="text-center text-gray-600 py-8">No available slots for this date</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-3">
                          {availableSlots.map((slot, index) => (
                            <button
                              key={index}
                              onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                              disabled={!slot.isAvailable}
                              className={`
                                px-4 py-3 text-sm font-medium border-2 transition-all duration-200 rounded-lg
                                ${selectedSlot === slot 
                                  ? 'border-green-600 bg-green-700 text-white shadow-md' 
                                  : slot.isAvailable
                                  ? 'border-gray-300 text-gray-900 hover:border-green-500 hover:bg-green-50'
                                  : 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                }
                              `}
                            >
                              {formatTime(slot.startTime)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {selectedSlot && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any specific concerns or symptoms..."
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none shadow-sm"
                      />
                      <p className="text-xs text-gray-500 mt-2">{notes.length}/500 characters</p>
                    </div>
                  )}

                  {selectedSlot && (
                    <button
                      onClick={handleBookAppointment}
                      disabled={loading}
                      className="w-full py-4 bg-green-700 text-white rounded-xl hover:shadow-xl transition-all duration-200 font-semibold text-lg disabled:opacity-50 shadow-md"
                    >
                      {loading ? 'Booking...' : 'Book Appointment'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="border-b border-gray-200 p-6 bg-red-50">
              <h2 className="text-xl font-bold text-gray-900">Cancel Appointment</h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Cancel appointment with <strong>{selectedAppointment.doctorName}</strong>?
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="Please provide a reason..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancelAppointment}
                  disabled={!cancellationReason.trim() || loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                >
                  {loading ? 'Cancelling...' : 'Cancel Appointment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}