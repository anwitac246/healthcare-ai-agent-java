'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, AlertCircle, CheckCircle2, Search, Filter } from 'lucide-react';
import Navbar from '@/app/components/navbar';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  clinicLocation: string;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface Appointment {
  id: string;
  doctorName: string;
  specialty: string;
  mode: 'ONLINE' | 'IN_PERSON';
  appointmentDateTime: string;
  status: 'PENDING' | 'SCHEDULED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS';
  videoConferenceLink?: string;
  videoLinkAvailable: boolean;
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function PatientAppointments() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [appointmentMode, setAppointmentMode] = useState<'ONLINE' | 'IN_PERSON'>('ONLINE');
  const [notes, setNotes] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      fetchAvailability();
    }
  }, [selectedDoctor, selectedDate]);

  const fetchDoctors = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/user/doctors`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch doctors:', error);
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/appointments/patient/my-appointments`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch appointments:', error);
    }
  };

  const fetchAvailability = async () => {
    if (!selectedDoctor || !selectedDate) return;
    
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/availability/${selectedDoctor.id}?date=${selectedDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      
      if (response.ok) {
        const data = await response.json();
        setAvailableSlots(data.data.availableSlots);
      }
    } catch (error) {
      console.error('Failed to fetch availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const bookAppointment = async () => {
    if (!selectedDoctor || !selectedSlot) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/appointments/book`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doctorId: selectedDoctor.id,
          appointmentDateTime: selectedSlot.startTime,
          mode: appointmentMode,
          notes: notes,
        }),
      });
      
      if (response.ok) {
        setShowBookingModal(false);
        resetBookingForm();
        fetchAppointments();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to book appointment');
      }
    } catch (error) {
      console.error('Booking failed:', error);
      alert('Failed to book appointment');
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async () => {
    if (!selectedAppointment || !cancellationReason.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/cancel`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: cancellationReason }),
        }
      );
      
      if (response.ok) {
        setShowCancelModal(false);
        setCancellationReason('');
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Cancellation failed:', error);
      alert('Failed to cancel appointment');
    } finally {
      setLoading(false);
    }
  };

  const resetBookingForm = () => {
    setSelectedDoctor(null);
    setSelectedDate('');
    setAvailableSlots([]);
    setSelectedSlot(null);
    setNotes('');
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      weekday: 'short',
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

  const getStatusColor = (status: string) => {
    const colors = {
      PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
      SCHEDULED: 'bg-green-50 text-green-700 border-green-200',
      REJECTED: 'bg-red-50 text-red-700 border-red-200',
      COMPLETED: 'bg-gray-50 text-gray-700 border-gray-200',
      CANCELLED: 'bg-red-50 text-red-700 border-red-200',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    const matchesSearch = apt.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          apt.specialty?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-900 mb-2">Appointments</h1>
          <p className="text-green-700">Manage your healthcare appointments</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 w-full lg:max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-green-600 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by doctor or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                />
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-3">
              <Filter className="text-green-600 w-5 h-5" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-500 transition-colors bg-white"
              >
                <option value="all">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Book Button */}
            <button
              onClick={() => setShowBookingModal(true)}
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 font-medium"
            >
              Book New Appointment
            </button>
          </div>
        </div>

        {/* Appointments Grid */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-12 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-900 mb-2">No appointments found</h3>
            <p className="text-green-700 mb-6">Book your first appointment to get started</p>
            <button
              onClick={() => setShowBookingModal(true)}
              className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
            >
              Book Appointment
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredAppointments.map((appointment) => (
              <div
                key={appointment.id}
                className="bg-white rounded-2xl shadow-sm border border-green-100 hover:shadow-md transition-all overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    {/* Left Section */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                          <User className="w-7 h-7 text-green-700" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-green-900 mb-1">
                            {appointment.doctorName}
                          </h3>
                          <p className="text-green-700 text-sm">{appointment.specialty}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-18">
                        <div className="flex items-center gap-3 text-green-800">
                          <Clock className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium">{formatDateTime(appointment.appointmentDateTime)}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-green-800">
                          {appointment.mode === 'ONLINE' ? (
                            <>
                              <Video className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium">Online Consultation</span>
                            </>
                          ) : (
                            <>
                              <MapPin className="w-5 h-5 text-green-600" />
                              <span className="text-sm font-medium">In-Person Visit</span>
                            </>
                          )}
                        </div>
                      </div>

                      {appointment.notes && (
                        <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                          <p className="text-sm font-medium text-green-900 mb-1">Notes</p>
                          <p className="text-sm text-green-700">{appointment.notes}</p>
                        </div>
                      )}

                      {appointment.status === 'REJECTED' && appointment.rejectionReason && (
                        <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                          <p className="text-sm font-semibold text-red-900 mb-1">Rejection Reason</p>
                          <p className="text-sm text-red-700">{appointment.rejectionReason}</p>
                        </div>
                      )}

                      {appointment.videoLinkAvailable && appointment.videoConferenceLink && (
                        <div className="mt-4">
                          <a
                            href={appointment.videoConferenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg font-medium"
                          >
                            <Video className="w-5 h-5" />
                            Join Video Call
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Right Section */}
                    <div className="flex flex-col items-end gap-4 lg:border-l lg:border-green-100 lg:pl-6">
                      <span className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 ${getStatusColor(appointment.status)}`}>
                        {appointment.status}
                      </span>

                      {(appointment.status === 'SCHEDULED' || appointment.status === 'PENDING') && (
                        <button
                          onClick={() => {
                            setSelectedAppointment(appointment);
                            setShowCancelModal(true);
                          }}
                          className="px-6 py-2.5 text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-green-100 p-6 flex justify-between items-center rounded-t-3xl">
                <h2 className="text-2xl font-bold text-green-900">Book Appointment</h2>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    resetBookingForm();
                  }}
                  className="text-green-600 hover:text-green-700 p-2 hover:bg-green-50 rounded-xl transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-3">
                    Select Doctor
                  </label>
                  <select
                    value={selectedDoctor?.id || ''}
                    onChange={(e) => {
                      const doctor = doctors.find(d => d.id === e.target.value);
                      setSelectedDoctor(doctor || null);
                    }}
                    className="w-full px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Choose a doctor...</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        {doctor.name} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Selection */}
                {selectedDoctor && (
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-3">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                )}

                {/* Time Slots */}
                {selectedDate && availableSlots.length > 0 && (
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-3">
                      Available Time Slots
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                          disabled={!slot.isAvailable}
                          className={`px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                            selectedSlot === slot
                              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                              : slot.isAvailable
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 border-2 border-green-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-gray-200'
                          }`}
                        >
                          {formatTime(slot.startTime)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Appointment Mode */}
                {selectedSlot && (
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-3">
                      Consultation Mode
                    </label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAppointmentMode('ONLINE')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appointmentMode === 'ONLINE'
                            ? 'border-green-500 bg-green-50'
                            : 'border-green-200 hover:border-green-300'
                        }`}
                      >
                        <Video className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="text-sm font-semibold text-green-900">Online</p>
                      </button>
                      <button
                        onClick={() => setAppointmentMode('IN_PERSON')}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          appointmentMode === 'IN_PERSON'
                            ? 'border-green-500 bg-green-50'
                            : 'border-green-200 hover:border-green-300'
                        }`}
                      >
                        <MapPin className="w-6 h-6 mx-auto mb-2 text-green-600" />
                        <p className="text-sm font-semibold text-green-900">In-Person</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSlot && (
                  <div>
                    <label className="block text-sm font-semibold text-green-900 mb-3">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific concerns or symptoms..."
                      rows={3}
                      className="w-full px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-green-500 transition-colors resize-none"
                    />
                  </div>
                )}

                {/* Book Button */}
                {selectedSlot && (
                  <button
                    onClick={bookAppointment}
                    disabled={loading}
                    className="w-full px-6 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 font-semibold text-lg"
                  >
                    {loading ? 'Booking...' : 'Confirm Booking'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Cancel Modal */}
        {showCancelModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
              <div className="p-6 border-b border-green-100">
                <h2 className="text-xl font-bold text-red-600 flex items-center gap-3">
                  <AlertCircle className="w-6 h-6" />
                  Cancel Appointment
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-green-800">
                  Are you sure you want to cancel your appointment with{' '}
                  <strong className="text-green-900">{selectedAppointment.doctorName}</strong>?
                </p>

                <div>
                  <label className="block text-sm font-semibold text-green-900 mb-2">
                    Reason for Cancellation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please provide a reason..."
                    rows={3}
                    className="w-full px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-red-500 transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellationReason('');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors font-medium text-green-900"
                  >
                    Keep Appointment
                  </button>
                  <button
                    onClick={cancelAppointment}
                    disabled={loading || !cancellationReason.trim()}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
                  >
                    {loading ? 'Cancelling...' : 'Cancel Appointment'}
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