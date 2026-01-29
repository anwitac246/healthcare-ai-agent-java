'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, AlertCircle, CheckCircle } from 'lucide-react';

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  mode: 'ONLINE' | 'IN_PERSON';
  appointmentDateTime: string;
  status: 'PENDING' | 'SCHEDULED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'IN_PROGRESS';
  videoConferenceLink?: string;
  videoLinkAvailable: boolean;
  videoLinkExpiresAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  rejectionReason?: string;
  approvedAt?: string;
  rejectedAt?: string;
  notes?: string;
  durationMinutes: number;
}

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [filteredAppointments, setFilteredAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchAppointments();
    
    // Refresh appointments every minute to update video links
    const interval = setInterval(fetchAppointments, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, selectedStatus]);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8080/api/appointments/doctor/my-appointments', {
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

  const filterAppointments = () => {
    if (selectedStatus === 'ALL') {
      setFilteredAppointments(appointments);
    } else {
      setFilteredAppointments(
        appointments.filter(apt => apt.status === selectedStatus)
      );
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

  const approveAppointment = async () => {
    if (!selectedAppointment) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8080/api/appointments/${selectedAppointment.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
        alert('Appointment approved successfully');
        setShowApproveModal(false);
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to approve appointment');
      }
    } catch (error) {
      console.error('Approval failed:', error);
      alert('Failed to approve appointment');
    } finally {
      setLoading(false);
    }
  };

  const rejectAppointment = async () => {
    if (!selectedAppointment || !rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:8080/api/appointments/${selectedAppointment.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason: rejectionReason }),
        }
      );
      
      if (response.ok) {
        alert('Appointment rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedAppointment(null);
        fetchAppointments();
      } else {
        const error = await response.json();
        alert(error.message || 'Failed to reject appointment');
      }
    } catch (error) {
      console.error('Rejection failed:', error);
      alert('Failed to reject appointment');
    } finally {
      setLoading(false);
    }
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

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isUpcoming = (appointment: Appointment) => {
    return new Date(appointment.appointmentDateTime) > new Date() && 
           appointment.status === 'SCHEDULED';
  };

  const upcomingAppointments = filteredAppointments.filter(isUpcoming);
  const pastAppointments = filteredAppointments.filter(apt => !isUpcoming(apt));

  const statusCounts = {
    ALL: appointments.length,
    PENDING: appointments.filter(a => a.status === 'PENDING').length,
    SCHEDULED: appointments.filter(a => a.status === 'SCHEDULED').length,
    COMPLETED: appointments.filter(a => a.status === 'COMPLETED').length,
    REJECTED: appointments.filter(a => a.status === 'REJECTED').length,
    CANCELLED: appointments.filter(a => a.status === 'CANCELLED').length,
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-800 mb-2">My Appointments</h1>
          <p className="text-gray-600">Manage your patient appointments and video consultations</p>
        </div>

        {/* Status Filter */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg font-medium transition whitespace-nowrap ${
                selectedStatus === status
                  ? 'bg-green-600 text-white'
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              {status} ({count})
            </button>
          ))}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Today's Appointments</p>
            <p className="text-2xl font-bold text-green-800">
              {appointments.filter(a => {
                const aptDate = new Date(a.appointmentDateTime).toDateString();
                const today = new Date().toDateString();
                return aptDate === today && a.status === 'SCHEDULED';
              }).length}
            </p>
          </div>

          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Upcoming</p>
            <p className="text-2xl font-bold text-green-800">
              {upcomingAppointments.length}
            </p>
          </div>

          <div className="border border-green-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">This Month</p>
            <p className="text-2xl font-bold text-green-800">
              {appointments.filter(a => {
                const aptMonth = new Date(a.appointmentDateTime).getMonth();
                const currentMonth = new Date().getMonth();
                return aptMonth === currentMonth && a.status === 'SCHEDULED';
              }).length}
            </p>
          </div>
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-green-800 mb-4">Upcoming Appointments</h2>
            <div className="space-y-4">
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCancel={() => {
                    setSelectedAppointment(appointment);
                    setShowCancelModal(true);
                  }}
                  onApprove={() => {
                    setSelectedAppointment(appointment);
                    setShowApproveModal(true);
                  }}
                  onReject={() => {
                    setSelectedAppointment(appointment);
                    setShowRejectModal(true);
                  }}
                  formatDateTime={formatDateTime}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-green-800 mb-4">Past Appointments</h2>
            <div className="space-y-4">
              {pastAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  onCancel={() => {
                    setSelectedAppointment(appointment);
                    setShowCancelModal(true);
                  }}
                  onApprove={() => {
                    setSelectedAppointment(appointment);
                    setShowApproveModal(true);
                  }}
                  onReject={() => {
                    setSelectedAppointment(appointment);
                    setShowRejectModal(true);
                  }}
                  formatDateTime={formatDateTime}
                  formatTime={formatTime}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAppointments.length === 0 && (
          <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No appointments found</p>
            <p className="text-sm text-gray-500">
              {selectedStatus !== 'ALL' 
                ? `No ${selectedStatus.toLowerCase()} appointments` 
                : 'Patients can book appointments with you'}
            </p>
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
                  Are you sure you want to cancel the appointment with{' '}
                  <strong>{selectedAppointment.patientName}</strong>?
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

        {/* Approve Modal */}
        {showApproveModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-green-600 flex items-center gap-2">
                  <CheckCircle className="w-6 h-6" />
                  Approve Appointment
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-600">
                  Confirm appointment with{' '}
                  <strong>{selectedAppointment.patientName}</strong> on{' '}
                  <strong>{formatDateTime(selectedAppointment.appointmentDateTime)}</strong>?
                </p>

                {selectedAppointment.notes && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-800 mb-1">Patient Notes:</p>
                    <p className="text-sm text-gray-700">{selectedAppointment.notes}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowApproveModal(false);
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={approveAppointment}
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Approving...' : 'Approve Appointment'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && selectedAppointment && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                  <X className="w-6 h-6" />
                  Reject Appointment
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-gray-600">
                  Reject appointment request from{' '}
                  <strong>{selectedAppointment.patientName}</strong>?
                </p>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for Rejection <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="E.g., Not available at this time, please book another slot..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectionReason('');
                      setSelectedAppointment(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={rejectAppointment}
                    disabled={loading || !rejectionReason.trim()}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                  >
                    {loading ? 'Rejecting...' : 'Reject Appointment'}
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

function AppointmentCard({
  appointment,
  onCancel,
  onApprove,
  onReject,
  formatDateTime,
  formatTime,
}: {
  appointment: Appointment;
  onCancel: () => void;
  onApprove: () => void;
  onReject: () => void;
  formatDateTime: (date: string) => string;
  formatTime: (date: string) => string;
}) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 hover:border-green-300 transition">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <User className="w-5 h-5 text-green-600" />
            <div>
              <h3 className="text-lg font-semibold text-green-800">
                {appointment.patientName}
              </h3>
              <p className="text-sm text-gray-600">{appointment.patientEmail}</p>
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {formatDateTime(appointment.appointmentDateTime)}
            </p>
            
            <p className="flex items-center gap-2">
              {appointment.mode === 'ONLINE' ? (
                <><Video className="w-4 h-4" /> Online Consultation ({appointment.durationMinutes} min)</>
              ) : (
                <><MapPin className="w-4 h-4" /> In-Person Visit ({appointment.durationMinutes} min)</>
              )}
            </p>

            {appointment.notes && (
              <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-100">
                <p className="text-sm font-medium text-green-800 mb-1">Patient Notes:</p>
                <p className="text-sm text-gray-700">{appointment.notes}</p>
              </div>
            )}

            {appointment.cancellationReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Cancelled by: {appointment.cancelledBy}
                </p>
                <p className="text-sm text-gray-700">{appointment.cancellationReason}</p>
              </div>
            )}

            {appointment.rejectionReason && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm font-medium text-red-800 mb-1">
                  Rejection Reason:
                </p>
                <p className="text-sm text-gray-700">{appointment.rejectionReason}</p>
              </div>
            )}
          </div>

          {appointment.videoLinkAvailable && appointment.videoConferenceLink && (
            <div className="mt-4 flex items-center gap-3">
              <a
                href={appointment.videoConferenceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
              >
                <Video className="w-4 h-4" />
                Join Video Call
              </a>
              {appointment.videoLinkExpiresAt && (
                <p className="text-xs text-gray-500">
                  Link expires at {formatTime(appointment.videoLinkExpiresAt)}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              appointment.status === 'PENDING'
                ? 'bg-yellow-100 text-yellow-700'
                : appointment.status === 'SCHEDULED'
                ? 'bg-green-100 text-green-700'
                : appointment.status === 'COMPLETED'
                ? 'bg-gray-100 text-gray-700'
                : appointment.status === 'CANCELLED'
                ? 'bg-red-100 text-red-700'
                : appointment.status === 'REJECTED'
                ? 'bg-red-100 text-red-700'
                : 'bg-blue-100 text-blue-700'
            }`}
          >
            {appointment.status}
          </span>

          {appointment.status === 'PENDING' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={onApprove}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm"
              >
                Approve
              </button>
              <button
                onClick={onReject}
                className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition text-sm"
              >
                Reject
              </button>
            </div>
          )}

          {appointment.status === 'SCHEDULED' && (
            <button
              onClick={onCancel}
              className="px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 transition text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}