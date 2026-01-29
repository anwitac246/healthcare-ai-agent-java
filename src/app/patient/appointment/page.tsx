'use client';

import { useState } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, AlertCircle, CheckCircle2, Search, ChevronLeft, ChevronRight } from 'lucide-react';

// Mock data for demonstration
const mockDoctors = [
  { id: '1', name: 'Dr. Sarah Johnson', specialization: 'Cardiologist', clinicLocation: 'City Hospital, Floor 3' },
  { id: '2', name: 'Dr. Michael Chen', specialization: 'Dermatologist', clinicLocation: 'Skin Care Clinic' },
  { id: '3', name: 'Dr. Emily Roberts', specialization: 'Pediatrician', clinicLocation: 'Children\'s Hospital' },
];

const mockUpcomingAppointments = [
  {
    id: '1',
    doctorName: 'Dr. Sarah Johnson',
    specialty: 'Cardiologist',
    mode: 'ONLINE' as const,
    appointmentDateTime: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'SCHEDULED' as const,
    videoConferenceLink: 'https://meet.google.com/xyz',
    videoLinkAvailable: true,
    notes: 'Follow-up consultation for blood pressure',
  },
  {
    id: '2',
    doctorName: 'Dr. Michael Chen',
    specialty: 'Dermatologist',
    mode: 'IN_PERSON' as const,
    appointmentDateTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'SCHEDULED' as const,
    videoLinkAvailable: false,
    notes: 'Skin allergy checkup',
  },
  {
    id: '3',
    doctorName: 'Dr. Emily Roberts',
    specialty: 'Pediatrician',
    mode: 'ONLINE' as const,
    appointmentDateTime: new Date(Date.now() + 3600000).toISOString(),
    status: 'PENDING' as const,
    videoLinkAvailable: false,
    notes: '',
    holdExpiresAt: new Date(Date.now() + 1800000).toISOString(),
  },
];

const mockPastAppointments = [
  {
    id: '4',
    doctorName: 'Dr. Sarah Johnson',
    specialty: 'Cardiologist',
    mode: 'ONLINE' as const,
    appointmentDateTime: new Date(Date.now() - 86400000 * 3).toISOString(),
    status: 'COMPLETED' as const,
    videoLinkAvailable: false,
    notes: 'Regular checkup',
  },
  {
    id: '5',
    doctorName: 'Dr. Michael Chen',
    specialty: 'Dermatologist',
    mode: 'IN_PERSON' as const,
    appointmentDateTime: new Date(Date.now() - 86400000 * 10).toISOString(),
    status: 'COMPLETED' as const,
    videoLinkAvailable: false,
    notes: 'Acne treatment consultation',
  },
  {
    id: '6',
    doctorName: 'Dr. Emily Roberts',
    specialty: 'Pediatrician',
    mode: 'ONLINE' as const,
    appointmentDateTime: new Date(Date.now() - 86400000 * 7).toISOString(),
    status: 'CANCELLED' as const,
    videoLinkAvailable: false,
    notes: 'Patient cancelled due to schedule conflict',
  },
];

// Mock time slots
const mockTimeSlots = [
  { startTime: '2024-01-30T09:00:00', endTime: '2024-01-30T09:45:00', isAvailable: true },
  { startTime: '2024-01-30T10:00:00', endTime: '2024-01-30T10:45:00', isAvailable: true },
  { startTime: '2024-01-30T11:00:00', endTime: '2024-01-30T11:45:00', isAvailable: false },
  { startTime: '2024-01-30T12:00:00', endTime: '2024-01-30T12:45:00', isAvailable: true },
  { startTime: '2024-01-30T14:00:00', endTime: '2024-01-30T14:45:00', isAvailable: true },
  { startTime: '2024-01-30T15:00:00', endTime: '2024-01-30T15:45:00', isAvailable: false },
  { startTime: '2024-01-30T16:00:00', endTime: '2024-01-30T16:45:00', isAvailable: true },
  { startTime: '2024-01-30T17:00:00', endTime: '2024-01-30T17:45:00', isAvailable: true },
];

export default function PatientAppointments() {
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots] = useState(mockTimeSlots);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);
  const [appointmentMode, setAppointmentMode] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [notes, setNotes] = useState('');
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activeView, setActiveView] = useState<'upcoming' | 'past'>('upcoming');

  const resetBookingForm = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setSelectedSlot(null);
    setNotes('');
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

  const previousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
  };

  const isDateSelected = (day: number) => {
    if (!selectedDate) return false;
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return selectedDate === dateStr;
  };

  const filteredAppointments = (activeView === 'upcoming' ? mockUpcomingAppointments : mockPastAppointments).filter(apt =>
    apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    apt.specialty?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const monthYear = currentMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  const { daysInMonth, startingDayOfWeek } = getDaysInMonth(currentMonth);

  return (
    <div className="min-h-screen bg-white">
      {/* Transparent Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-[1400px] mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">HealthCare</h1>
            <div className="flex items-center gap-6">
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Dashboard</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Appointments</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 font-medium">Profile</a>
              <button className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-[1400px] mx-auto px-8 py-8 mt-20">
        {/* Header with View Toggle */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Appointment</h1>
            <p className="text-gray-600">Schedule a consultation with your doctor</p>
          </div>
          <div className="flex items-center gap-2 border border-gray-300">
            <button
              onClick={() => setActiveView('upcoming')}
              className={`px-6 py-2 font-medium transition-colors ${
                activeView === 'upcoming'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setActiveView('past')}
              className={`px-6 py-2 font-medium transition-colors ${
                activeView === 'past'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Past
            </button>
          </div>
        </div>

        {/* Appointments List View */}
        {(activeView === 'upcoming' || activeView === 'past') && (
          <div className="mb-8">
            {/* Search */}
            <div className="mb-6">
              <div className="relative max-w-md">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search appointments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 focus:outline-none focus:border-emerald-600 transition-colors"
                />
              </div>
            </div>

            {/* Appointments Grid */}
            <div className="space-y-4 mb-8">
              {filteredAppointments.length === 0 ? (
                <div className="border border-gray-200 p-16 text-center">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No {activeView} appointments found</p>
                </div>
              ) : (
                filteredAppointments.map((appointment) => (
                  <div key={appointment.id} className="border border-gray-200 p-6 hover:border-gray-300 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start gap-4 mb-4">
                          <div className="w-12 h-12 bg-gray-100 border border-gray-300 flex items-center justify-center flex-shrink-0">
                            <User className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">{appointment.doctorName}</h3>
                            <p className="text-sm text-gray-600">{appointment.specialty}</p>
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
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 flex items-start gap-2">
                            <Clock className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-semibold text-amber-900">Awaiting Doctor Approval</p>
                              <p className="text-xs text-amber-700 mt-1">
                                Your slot is held until {formatTime(appointment.holdExpiresAt)}
                              </p>
                            </div>
                          </div>
                        )}

                        {appointment.notes && (
                          <div className="p-3 bg-gray-50 border border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Notes</p>
                            <p className="text-sm text-gray-600">{appointment.notes}</p>
                          </div>
                        )}

                        {appointment.videoLinkAvailable && appointment.videoConferenceLink && activeView === 'upcoming' && (
                          <a
                            href={appointment.videoConferenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 transition-colors text-sm font-medium"
                          >
                            <Video className="w-4 h-4" />
                            Join Video Call
                          </a>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-3">
                        <span className={`px-3 py-1 text-xs font-semibold border ${
                          appointment.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          appointment.status === 'SCHEDULED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          appointment.status === 'COMPLETED' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          appointment.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' :
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
                            className="px-4 py-2 text-sm text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
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

            {/* Book New Appointment Button */}
            {activeView === 'upcoming' && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="w-full py-4 bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 transition-colors font-semibold text-lg"
              >
                + Book New Appointment
              </button>
            )}
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white border-2 border-gray-900 max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="border-b border-gray-200 p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    resetBookingForm();
                  }}
                  className="p-2 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
                  {/* Left Column - Calendar */}
                  <div className="space-y-6">
                    {/* Calendar Widget */}
                    <div className="bg-white border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-6">
                        <button onClick={previousMonth} className="p-1 hover:bg-gray-100 border border-gray-300">
                          <ChevronLeft className="w-5 h-5 text-gray-600" />
                        </button>
                        <h2 className="text-base font-semibold text-gray-900">{monthYear}</h2>
                        <button onClick={nextMonth} className="p-1 hover:bg-gray-100 border border-gray-300">
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
                          const isToday = new Date().getDate() === day && 
                                          new Date().getMonth() === currentMonth.getMonth() &&
                                          new Date().getFullYear() === currentMonth.getFullYear();
                          
                          return (
                            <button
                              key={day}
                              onClick={() => selectedDoctor && handleDateClick(day)}
                              disabled={!selectedDoctor}
                              className={`
                                aspect-square flex items-center justify-center text-sm font-medium transition-colors
                                ${isSelected ? 'bg-emerald-600 text-white border border-emerald-700' : ''}
                                ${!isSelected && isToday ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : ''}
                                ${!isSelected && !isToday ? 'hover:bg-gray-50 text-gray-900 border border-transparent' : ''}
                                ${!selectedDoctor ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                              `}
                            >
                              {day}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Consultation Mode Options */}
                    <div className="bg-white border border-gray-200 p-6 space-y-4">
                      <h3 className="font-semibold text-gray-900 mb-4">Consultation Mode</h3>
                      
                      <button
                        onClick={() => setAppointmentMode('ONLINE')}
                        className={`w-full p-4 border-2 text-left transition-colors ${
                          appointmentMode === 'ONLINE' 
                            ? 'border-emerald-600 bg-emerald-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 border flex items-center justify-center ${
                            appointmentMode === 'ONLINE' ? 'border-emerald-600 bg-white' : 'border-gray-300 bg-gray-50'
                          }`}>
                            <Video className={`w-5 h-5 ${appointmentMode === 'ONLINE' ? 'text-emerald-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">Schedule Online Consultation</p>
                            <p className="text-xs text-gray-600">Schedule Text, Audio or Video call with Doctor</p>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => setAppointmentMode('IN_PERSON')}
                        className={`w-full p-4 border-2 text-left transition-colors ${
                          appointmentMode === 'IN_PERSON' 
                            ? 'border-emerald-600 bg-emerald-50' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 border flex items-center justify-center ${
                            appointmentMode === 'IN_PERSON' ? 'border-emerald-600 bg-white' : 'border-gray-300 bg-gray-50'
                          }`}>
                            <MapPin className={`w-5 h-5 ${appointmentMode === 'IN_PERSON' ? 'text-emerald-600' : 'text-gray-600'}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">Schedule Onsite Consultation</p>
                            <p className="text-xs text-gray-600">Visit Doctor's Clinic/Hospital for consultation</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Right Column - Doctor Selection & Details */}
                  <div className="space-y-6">
                    {/* Doctor Selection */}
                    <div className="bg-white border border-gray-200 p-6">
                      <h2 className="text-lg font-semibold text-gray-900 mb-4">Doctor details</h2>
                      
                      {!selectedDoctor ? (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Select Doctor
                          </label>
                          <select
                            onChange={(e) => {
                              const doctor = mockDoctors.find(d => d.id === e.target.value);
                              setSelectedDoctor(doctor || null);
                              setSelectedDate('');
                              setSelectedSlot(null);
                            }}
                            className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-emerald-600 transition-colors"
                          >
                            <option value="">Choose a doctor...</option>
                            {mockDoctors.map((doctor) => (
                              <option key={doctor.id} value={doctor.id}>
                                {doctor.name} - {doctor.specialization}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 bg-gray-100 border border-gray-300 flex items-center justify-center">
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
                            className="px-4 py-2 text-sm border border-gray-300 hover:bg-gray-50 transition-colors"
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Date & Time Selection */}
                    {selectedDoctor && selectedDate && (
                      <div className="bg-white border border-gray-200 p-6">
                        <h3 className="font-semibold text-gray-900 mb-1">
                          {new Date(selectedDate).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long', 
                            year: 'numeric' 
                          })}, availability
                        </h3>
                        <p className="text-xs text-gray-500 mb-6">Select appointment time (45 min each)</p>

                        <div className="grid grid-cols-4 gap-3">
                          {availableSlots.map((slot, index) => (
                            <button
                              key={index}
                              onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                              disabled={!slot.isAvailable}
                              className={`
                                px-4 py-3 text-sm font-medium border transition-colors
                                ${selectedSlot === slot 
                                  ? 'border-2 border-emerald-600 bg-emerald-600 text-white' 
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
                      </div>
                    )}

                    {/* Notes Section */}
                    {selectedSlot && (
                      <div className="bg-white border border-gray-200 p-6">
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Additional Notes (Optional)
                        </label>
                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Any specific concerns or symptoms..."
                          rows={3}
                          className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-emerald-600 transition-colors resize-none"
                        />
                      </div>
                    )}

                    {/* Book Button */}
                    {selectedSlot && (
                      <button
                        onClick={() => {
                          alert('Appointment booked successfully!');
                          setShowBookingModal(false);
                          resetBookingForm();
                        }}
                        className="w-full py-4 bg-emerald-600 text-white border border-emerald-700 hover:bg-emerald-700 transition-colors font-semibold text-lg"
                      >
                        Continue
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
            <div className="bg-white border-2 border-gray-900 max-w-md w-full">
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
                    className="w-full px-4 py-3 border border-gray-300 focus:outline-none focus:border-emerald-600 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellationReason('');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 px-4 py-3 border border-gray-300 hover:bg-gray-50 transition-colors font-medium"
                  >
                    Keep
                  </button>
                  <button
                    onClick={() => {
                      alert('Appointment cancelled');
                      setShowCancelModal(false);
                      setCancellationReason('');
                      setSelectedAppointment(null);
                    }}
                    disabled={!cancellationReason.trim()}
                    className="flex-1 px-4 py-3 bg-red-600 text-white border border-red-700 hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}