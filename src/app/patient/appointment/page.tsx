'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, Search, ChevronLeft, ChevronRight, Home, FileText, Settings, LogOut, MessageSquare } from 'lucide-react';
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PatientAppointments() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authToken) {
      loadDoctors();
      loadAppointments();
    }
  }, [authToken, activeView]);

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
      
      const url = `${API_BASE_URL}${endpoint}`;
      console.log('Loading appointments from:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      console.log('Load appointments response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Appointments loaded:', data);
        
        if (activeView === 'upcoming') {
          setUpcomingAppointments(data.data || []);
        } else {
          setPastAppointments(data.data || []);
        }
      } else {
        const errorText = await response.text();
        console.error('Failed to load appointments:', response.status, errorText);
        setError(`Failed to load appointments: ${response.status}`);
      }
    } catch (error) {
      console.error('Failed to load appointments:', error);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const generateTimeSlots = (date: string): TimeSlot[] => {
    // Parse the date string (YYYY-MM-DD) and create date in local timezone
    const [year, month, day] = date.split('-').map(Number);
    const selectedDay = new Date(year, month - 1, day);
    const dayOfWeek = selectedDay.getDay(); // 0 = Sunday, 6 = Saturday
    
    const slots: TimeSlot[] = [];
    let startHour = 9;
    let endHour = dayOfWeek === 0 ? 12 : 17; // Sunday 9-12, others 9-5
    
    for (let hour = startHour; hour < endHour; hour++) {
      // Create slots in LOCAL timezone
      const slotTime = new Date(year, month - 1, day, hour, 0, 0, 0);
      
      const endTime = new Date(year, month - 1, day, hour, 45, 0, 0);
      
      slots.push({
        startTime: slotTime.toISOString(),
        endTime: endTime.toISOString(),
        isAvailable: true // Will be updated based on bookings
      });
    }
    
    return slots;
  };

  const loadAvailableSlots = async () => {
    if (!selectedDoctor || !selectedDate) return;

    try {
      // First, generate all possible slots for the day
      const allSlots = generateTimeSlots(selectedDate);
      
      // Then fetch booked/held slots from the backend
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/slots/${selectedDoctor.id}?date=${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${authToken}` } }
      );

      if (response.ok) {
        const data = await response.json();
        const bookedSlots = data.data || [];
        
        // Mark slots as unavailable if they're booked or in the past
        const now = new Date();
        const updatedSlots = allSlots.map(slot => {
          const slotTime = new Date(slot.startTime);
          
          // Check if slot is in the past
          if (slotTime < now) {
            return { ...slot, isAvailable: false };
          }
          
          // Check if slot is booked or on hold
          const isBooked = bookedSlots.some((bookedSlot: TimeSlot) => {
            const bookedStart = new Date(bookedSlot.startTime);
            return Math.abs(slotTime.getTime() - bookedStart.getTime()) < 60000; // Within 1 minute
          });
          
          return { ...slot, isAvailable: !isBooked };
        });
        
        setAvailableSlots(updatedSlots);
      } else {
        // If API fails, just show all generated slots
        const now = new Date();
        const updatedSlots = allSlots.map(slot => ({
          ...slot,
          isAvailable: new Date(slot.startTime) >= now
        }));
        setAvailableSlots(updatedSlots);
      }
    } catch (error) {
      console.error('Failed to load slots:', error);
      // On error, still show generated slots
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
      console.error('Booking validation failed:', {
        hasSlot: !!selectedSlot,
        hasDoctor: !!selectedDoctor,
        hasAuth: !!authToken
      });
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

    console.log('=== BOOKING APPOINTMENT ===');
    console.log('1. Booking data:', JSON.stringify(bookingData, null, 2));
    console.log('2. Selected doctor:', selectedDoctor);
    console.log('3. Selected slot:', selectedSlot);
    console.log('4. API URL:', `${API_BASE_URL}/api/appointments/book`);
    console.log('5. Auth token (first 20 chars):', authToken.substring(0, 20) + '...');

    try {
      const response = await fetch(`${API_BASE_URL}/api/appointments/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(bookingData)
      });

      console.log('6. Response status:', response.status);
      console.log('7. Response status text:', response.statusText);
      console.log('8. Response headers:', Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log('9. Raw response text:', responseText);
      console.log('10. Response text length:', responseText.length);

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
        console.log('11. Parsed response data:', data);
      } catch (parseError) {
        console.error('12. JSON PARSE ERROR:', parseError);
        console.error('13. Could not parse this text:', responseText);
        throw new Error(`Server returned invalid JSON. Status: ${response.status}. Response: ${responseText.substring(0, 200)}`);
      }

      if (!response.ok) {
        console.error('14. BOOKING FAILED!');
        console.error('15. Status code:', response.status);
        console.error('16. Error data:', JSON.stringify(data, null, 2));
        console.error('17. Error message:', data.message);
        console.error('18. Error details:', data.details);
        console.error('19. Full error object:', data);
        
        const errorMessage = data.message 
          || data.error 
          || data.details
          || JSON.stringify(data)
          || `Booking failed with status ${response.status}`;
        
        throw new Error(errorMessage);
      }

      console.log('20. BOOKING SUCCESSFUL!');
      console.log('21. Success data:', data);
      alert('Appointment booked successfully! Awaiting doctor approval.');
      setShowBookingModal(false);
      resetBookingForm();
      loadAppointments();
    } catch (err: any) {
      console.error('22. CATCH BLOCK ERROR:');
      console.error('23. Error object:', err);
      console.error('24. Error type:', err.constructor.name);
      console.error('25. Error message:', err.message);
      console.error('26. Error stack:', err.stack);
      
      const errorMessage = err.message || 'An unexpected error occurred while booking';
      setError(errorMessage);
      alert(`Booking failed: ${errorMessage}`);
    } finally {
      setLoading(false);
      console.log('=== END BOOKING ATTEMPT ===');
    }
  };

  const handleCancelAppointment = async () => {
    if (!selectedAppointment || !cancellationReason.trim() || !authToken) {
      console.error('Cancellation validation failed:', {
        hasAppointment: !!selectedAppointment,
        hasReason: !!cancellationReason.trim(),
        hasAuth: !!authToken
      });
      alert('Please provide a cancellation reason');
      return;
    }

    setLoading(true);
    
    const cancelData = { reason: cancellationReason };
    console.log('Cancelling appointment:', selectedAppointment.id);
    console.log('Cancel data:', cancelData);
    console.log('API URL:', `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/cancel`);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify(cancelData)
        }
      );

      console.log('Cancel response status:', response.status);
      
      const responseText = await response.text();
      console.log('Cancel response:', responseText);

      let data;
      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('Failed to parse cancel response:', parseError);
      }

      if (!response.ok) {
        console.error('Cancellation failed:', data);
        const errorMessage = data?.message || data?.error || `Failed with status ${response.status}`;
        throw new Error(errorMessage);
      }

      console.log('Cancellation successful');
      alert('Appointment cancelled successfully');
      setShowCancelModal(false);
      setCancellationReason('');
      setSelectedAppointment(null);
      loadAppointments();
    } catch (err: any) {
      console.error('Cancellation error:', err);
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto"></div>
          <p className="text-green-800 mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex">
      <Navbar/>
      {/* Sidebar */}
      <div className="w-64 border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">AetherCare</h1>
          <p className="text-sm text-gray-600 mt-1">Patient Portal</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <a
              href="/patient/dashboard"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Home className="w-5 h-5" />
              <span className="font-medium">Dashboard</span>
            </a>
            <a
              href="/patient/appointments"
              className="flex items-center gap-3 px-4 py-3 bg-green-50 text-green-700 border-l-4 border-green-700 rounded-r-md transition-colors"
            >
              <Calendar className="w-5 h-5" />
              <span className="font-medium">Appointments</span>
            </a>
            <a
              href="/diagnosis-bot"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span className="font-medium">AI Diagnosis</span>
            </a>
            <a
              href="/patient/records"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <FileText className="w-5 h-5" />
              <span className="font-medium">Medical Records</span>
            </a>
            <a
              href="/patient/settings"
              className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </a>
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 border border-green-300 rounded-lg flex items-center justify-center">
              <User className="w-6 h-6 text-green-700" />
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {userData?.firstName} {userData?.lastName}
              </p>
              <p className="text-xs text-gray-600">Patient</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
              <p className="text-gray-600">View and manage your appointments</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 border border-gray-300 rounded-md overflow-hidden">
                <button
                  onClick={() => setActiveView('upcoming')}
                  className={`px-6 py-2 font-medium transition-colors ${
                    activeView === 'upcoming'
                      ? 'bg-green-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Upcoming
                </button>
                <button
                  onClick={() => setActiveView('past')}
                  className={`px-6 py-2 font-medium transition-colors ${
                    activeView === 'past'
                      ? 'bg-green-700 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Past
                </button>
              </div>
              <button
                onClick={() => setShowBookingModal(true)}
                className="px-6 py-2 bg-green-700 text-white border border-green-800 rounded-md hover:bg-green-800 transition-colors font-semibold whitespace-nowrap"
              >
                + Book Appointment
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 transition-colors"
              />
            </div>
          </div>

          {/* Appointments List */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-16">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-800 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading appointments...</p>
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="border border-gray-200 rounded-lg p-16 text-center">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No {activeView} appointments found</p>
              </div>
            ) : (
              filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="border border-gray-200 rounded-lg p-6 hover:border-gray-300 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center flex-shrink-0">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{appointment.doctorName}</h3>
                          <p className="text-sm text-gray-600">{appointment.doctorSpecialization}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                        <div className="flex items-center gap-2 text-gray-700">
                          <Clock className="w-4 h-4" />
                          <span>{formatDateTime(appointment.appointmentDateTime)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-700">
                          {appointment.mode === 'ONLINE' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                          <span>{appointment.mode === 'ONLINE' ? 'Online Consultation' : 'In-Person Visit'}</span>
                        </div>
                      </div>

                      {appointment.status === 'PENDING' && appointment.holdExpiresAt && (
                        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md flex items-start gap-2">
                          <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-semibold text-amber-900">Awaiting Doctor Approval</p>
                            <p className="text-xs text-amber-700 mt-1">
                              Your slot is held until {formatTime(appointment.holdExpiresAt)} (expires in {getTimeUntilExpiry(appointment.holdExpiresAt)})
                            </p>
                          </div>
                        </div>
                      )}

                      {appointment.notes && (
                        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md mb-4">
                          <p className="text-xs font-semibold text-gray-700 mb-1">Notes</p>
                          <p className="text-sm text-gray-600">{appointment.notes}</p>
                        </div>
                      )}

                      {appointment.rejectionReason && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-md mb-4">
                          <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-600">{appointment.rejectionReason}</p>
                        </div>
                      )}

                      {appointment.videoLinkAvailable && appointment.videoConferenceLink && (
                        <a
                          href={appointment.videoConferenceLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-5 py-2 bg-green-700 text-white border border-green-800 rounded-md hover:bg-green-800 transition-colors text-sm font-medium"
                        >
                          <Video className="w-4 h-4" />
                          Join Video Call
                        </a>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span className={`px-3 py-1 text-xs font-semibold border rounded-md ${
                        appointment.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        appointment.status === 'SCHEDULED' ? 'bg-green-50 text-green-700 border-green-200' :
                        appointment.status === 'COMPLETED' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                        appointment.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
                        appointment.status === 'REJECTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {appointment.status}
                      </span>

                      {(appointment.status === 'SCHEDULED' || appointment.status === 'PENDING') && activeView === 'upcoming' && (
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowCancelModal(true);
                          }}
                          className="px-4 py-2 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
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
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-900 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
              <button
                onClick={() => {
                  setShowBookingModal(false);
                  resetBookingForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
              <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Calendar */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-6">
                      <button 
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                        className="p-1 hover:bg-gray-100 border border-gray-300 rounded-md"
                      >
                        <ChevronLeft className="w-5 h-5 text-gray-600" />
                      </button>
                      <h2 className="text-base font-semibold text-gray-900">{monthYear}</h2>
                      <button 
                        onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                        className="p-1 hover:bg-gray-100 border border-gray-300 rounded-md"
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
                              aspect-square flex items-center justify-center text-sm font-medium transition-colors rounded-md
                              ${isSelected ? 'bg-green-700 text-white border border-green-800' : ''}
                              ${!isSelected && isToday ? 'bg-green-50 text-green-700 border border-green-200' : ''}
                              ${!isSelected && !isToday && !isDisabled ? 'hover:bg-gray-50 text-gray-900 border border-transparent' : ''}
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

                  {/* Consultation Mode */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Consultation Mode</h3>
                    
                    <button
                      onClick={() => setAppointmentMode('ONLINE')}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                        appointmentMode === 'ONLINE' 
                          ? 'border-green-700 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 border rounded-md flex items-center justify-center ${
                          appointmentMode === 'ONLINE' ? 'border-green-700 bg-white' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <Video className={`w-5 h-5 ${appointmentMode === 'ONLINE' ? 'text-green-700' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">Online Consultation</p>
                          <p className="text-xs text-gray-600">Video call with doctor</p>
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => setAppointmentMode('IN_PERSON')}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-colors ${
                        appointmentMode === 'IN_PERSON' 
                          ? 'border-green-700 bg-green-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 border rounded-md flex items-center justify-center ${
                          appointmentMode === 'IN_PERSON' ? 'border-green-700 bg-white' : 'border-gray-300 bg-gray-50'
                        }`}>
                          <MapPin className={`w-5 h-5 ${appointmentMode === 'IN_PERSON' ? 'text-green-700' : 'text-gray-600'}`} />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">In-Person Visit</p>
                          <p className="text-xs text-gray-600">Visit doctor's clinic</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Doctor Selection */}
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Doctor</h2>
                    
                    {!selectedDoctor ? (
                      <select
                        onChange={(e) => {
                          const doctor = doctors.find(d => d.id === e.target.value);
                          setSelectedDoctor(doctor || null);
                          setSelectedDate('');
                          setSelectedSlot(null);
                        }}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 transition-colors"
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
                          <div className="w-16 h-16 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                            <User className="w-8 h-8 text-gray-600" />
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
                          className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Time Slots */}
                  {selectedDoctor && selectedDate && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
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
                                px-4 py-3 text-sm font-medium border transition-colors rounded-md
                                ${selectedSlot === slot 
                                  ? 'border-2 border-green-700 bg-green-700 text-white' 
                                  : slot.isAvailable
                                  ? 'border border-gray-900 text-gray-900 hover:bg-gray-50'
                                  : 'border border-gray-200 text-gray-300 cursor-not-allowed'
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

                  {/* Notes */}
                  {selectedSlot && (
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any specific concerns or symptoms..."
                        rows={3}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 transition-colors resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-2">{notes.length}/500 characters</p>
                    </div>
                  )}

                  {/* Book Button */}
                  {selectedSlot && (
                    <button
                      onClick={handleBookAppointment}
                      disabled={loading}
                      className="w-full py-4 bg-green-700 text-white border border-green-800 rounded-md hover:bg-green-800 transition-colors font-semibold text-lg disabled:opacity-50"
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

      {/* Cancel Modal */}
      {showCancelModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white border-2 border-gray-900 rounded-lg max-w-md w-full">
            <div className="border-b border-gray-200 p-6">
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:border-green-700 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancellationReason('');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors font-medium"
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancelAppointment}
                  disabled={!cancellationReason.trim() || loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white border border-red-700 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
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