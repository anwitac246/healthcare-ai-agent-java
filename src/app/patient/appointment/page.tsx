'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, AlertCircle } from 'lucide-react';

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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/user/doctors', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/appointments/patient/my-appointments', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8080/api/appointments/availability/${selectedDoctor.id}?date=${selectedDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
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
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/appointments/book', {
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
        alert('Appointment booked successfully!');
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
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8080/api/appointments/${selectedAppointment.id}/cancel`,
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
        alert('Appointment cancelled successfully');
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

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">My Appointments</h1>
          <p className="text-gray-600">Book and manage your medical appointments</p>
        </div>

        {/* Book New Appointment Button */}
        <button
          onClick={() => setShowBookingModal(true)}
          className="mb-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          Book New Appointment
        </button>

        {/* Appointments List */}
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No appointments yet</p>
              <p className="text-sm text-gray-500">Book your first appointment above</p>
            </div>
          ) : (
            appointments.map((appointment) => (
              <div
                key={appointment.id}
                className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <User className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-green-800">
                        {appointment.doctorName}
                      </h3>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <p className="flex items-center gap-2">
                        <span className="font-medium">Specialty:</span> {appointment.specialty}
                      </p>
                      
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        {formatDateTime(appointment.appointmentDateTime)}
                      </p>
                      
                      <p className="flex items-center gap-2">
                        {appointment.mode === 'ONLINE' ? (
                          <><Video className="w-4 h-4" /> Online Consultation</>
                        ) : (
                          <><MapPin className="w-4 h-4" /> In-Person Visit</>
                        )}
                      </p>

                      {appointment.notes && (
                        <p className="flex items-start gap-2">
                          <span className="font-medium">Notes:</span>
                          <span>{appointment.notes}</span>
                        </p>
                      )}

                      {appointment.status === 'PENDING' && (
                        <div className="mt-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="text-sm font-medium text-yellow-800">
                            ⏳ Waiting for doctor approval
                          </p>
                          <p className="text-xs text-yellow-700 mt-1">
                            The doctor will review and approve your appointment request shortly.
                          </p>
                        </div>
                      )}

                      {appointment.status === 'REJECTED' && appointment.rejectionReason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-sm font-medium text-red-800 mb-1">
                            ❌ Appointment Rejected
                          </p>
                          <p className="text-sm text-gray-700">
                            <span className="font-medium">Reason:</span> {appointment.rejectionReason}
                          </p>
                        </div>
                      )}
                    </div>

                    {appointment.videoLinkAvailable && appointment.videoConferenceLink && (
                      <a
                        href={appointment.videoConferenceLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                      >
                        Join Video Call
                      </a>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        appointment.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : appointment.status === 'SCHEDULED'
                          ? 'bg-green-100 text-green-700'
                          : appointment.status === 'REJECTED'
                          ? 'bg-red-100 text-red-700'
                          : appointment.status === 'COMPLETED'
                          ? 'bg-gray-100 text-gray-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {appointment.status}
                    </span>

                    {appointment.status === 'SCHEDULED' && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowCancelModal(true);
                        }}
                        className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition"
                      >
                        Cancel
                      </button>
                    )}

                    {appointment.status === 'PENDING' && (
                      <button
                        onClick={() => {
                          setSelectedAppointment(appointment);
                          setShowCancelModal(true);
                        }}
                        className="px-4 py-2 text-orange-600 border border-orange-600 rounded-lg hover:bg-orange-50 transition text-sm"
                      >
                        Withdraw Request
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Booking Modal */}
        {showBookingModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-green-800">Book Appointment</h2>
                <button
                  onClick={() => {
                    setShowBookingModal(false);
                    resetBookingForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Doctor Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Doctor
                  </label>
                  <select
                    value={selectedDoctor?.id || ''}
                    onChange={(e) => {
                      const doctor = doctors.find(d => d.id === e.target.value);
                      setSelectedDoctor(doctor || null);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Time Slots */}
                {selectedDate && availableSlots.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Available Time Slots
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot, index) => (
                        <button
                          key={index}
                          onClick={() => slot.isAvailable && setSelectedSlot(slot)}
                          disabled={!slot.isAvailable}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                            selectedSlot === slot
                              ? 'bg-green-600 text-white'
                              : slot.isAvailable
                              ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Consultation Mode
                    </label>
                    <div className="flex gap-4">
                      <button
                        onClick={() => setAppointmentMode('ONLINE')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          appointmentMode === 'ONLINE'
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <Video className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-sm font-medium">Online</p>
                      </button>
                      <button
                        onClick={() => setAppointmentMode('IN_PERSON')}
                        className={`flex-1 px-4 py-3 rounded-lg border-2 transition ${
                          appointmentMode === 'IN_PERSON'
                            ? 'border-green-600 bg-green-50'
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                      >
                        <MapPin className="w-5 h-5 mx-auto mb-1" />
                        <p className="text-sm font-medium">In-Person</p>
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSlot && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Any specific concerns or symptoms..."
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}

                {/* Book Button */}
                {selectedSlot && (
                  <button
                    onClick={bookAppointment}
                    disabled={loading}
                    className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                  <AlertCircle className="w-6 h-6" />
                  Cancel Appointment
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-600">
                  Are you sure you want to cancel your appointment with{' '}
                  <strong>{selectedAppointment.doctorName}</strong>?
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Cancellation <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Please provide a reason..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellationReason('');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Keep Appointment
                  </button>
                  <button
                    onClick={cancelAppointment}
                    disabled={loading || !cancellationReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
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