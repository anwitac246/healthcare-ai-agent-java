'use client';

import { useState, useEffect } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, AlertCircle, CheckCircle2, Filter, TrendingUp, Users } from 'lucide-react';
import Navbar from '@/app/components/navbar';

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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

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
    const interval = setInterval(fetchAppointments, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    filterAppointments();
  }, [appointments, selectedStatus]);

  const fetchAppointments = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/appointments/doctor/my-appointments`, {
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

  const approveAppointment = async () => {
    if (!selectedAppointment) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (response.ok) {
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/reject`,
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
  };

  const todayAppointments = appointments.filter(a => {
    const aptDate = new Date(a.appointmentDateTime).toDateString();
    const today = new Date().toDateString();
    return aptDate === today && a.status === 'SCHEDULED';
  }).length;

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-20">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-900 mb-2">My Appointments</h1>
          <p className="text-green-700">Manage your patient appointments and consultations</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Calendar className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-green-100 text-sm font-medium mb-1">Today</p>
            <p className="text-4xl font-bold">{todayAppointments}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <Clock className="w-8 h-8 text-amber-500" />
            </div>
            <p className="text-green-700 text-sm font-medium mb-1">Pending</p>
            <p className="text-4xl font-bold text-green-900">{statusCounts.PENDING}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-green-700 text-sm font-medium mb-1">Scheduled</p>
            <p className="text-4xl font-bold text-green-900">{statusCounts.SCHEDULED}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-green-700 text-sm font-medium mb-1">Total</p>
            <p className="text-4xl font-bold text-green-900">{statusCounts.ALL}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-2 mb-8 flex gap-2 overflow-x-auto">
          {Object.entries(statusCounts).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-6 py-3 rounded-xl font-semibold transition-all whitespace-nowrap ${
                selectedStatus === status
                  ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md'
                  : 'text-green-700 hover:bg-green-50'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()} ({count})
            </button>
          ))}
        </div>

        {/* Upcoming Appointments */}
        {upcomingAppointments.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-green-900 mb-6">Upcoming Appointments</h2>
            <div className="grid gap-6">
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
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Past Appointments */}
        {pastAppointments.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-green-900 mb-6">Past Appointments</h2>
            <div className="grid gap-6">
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
                  getStatusColor={getStatusColor}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredAppointments.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-12 text-center">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-green-900 mb-2">No appointments found</h3>
            <p className="text-green-700">
              {selectedStatus !== 'ALL' 
                ? `No ${selectedStatus.toLowerCase()} appointments` 
                : 'Patients can book appointments with you'}
            </p>
          </div>
        )}

        {/* Modals */}
        <CancelModal
          show={showCancelModal}
          appointment={selectedAppointment}
          reason={cancellationReason}
          setReason={setCancellationReason}
          onCancel={() => {
            setShowCancelModal(false);
            setCancellationReason('');
            setSelectedAppointment(null);
          }}
          onConfirm={cancelAppointment}
          loading={loading}
        />

        <ApproveModal
          show={showApproveModal}
          appointment={selectedAppointment}
          formatDateTime={formatDateTime}
          onCancel={() => {
            setShowApproveModal(false);
            setSelectedAppointment(null);
          }}
          onConfirm={approveAppointment}
          loading={loading}
        />

        <RejectModal
          show={showRejectModal}
          appointment={selectedAppointment}
          reason={rejectionReason}
          setReason={setRejectionReason}
          onCancel={() => {
            setShowRejectModal(false);
            setRejectionReason('');
            setSelectedAppointment(null);
          }}
          onConfirm={rejectAppointment}
          loading={loading}
        />
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
  getStatusColor,
}: {
  appointment: Appointment;
  onCancel: () => void;
  onApprove: () => void;
  onReject: () => void;
  formatDateTime: (date: string) => string;
  formatTime: (date: string) => string;
  getStatusColor: (status: string) => string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-100 hover:shadow-md transition-all overflow-hidden">
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
                  {appointment.patientName}
                </h3>
                <p className="text-green-700 text-sm">{appointment.patientEmail}</p>
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
                    <span className="text-sm font-medium">Online ({appointment.durationMinutes} min)</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium">In-Person ({appointment.durationMinutes} min)</span>
                  </>
                )}
              </div>
            </div>

            {appointment.notes && (
              <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-100">
                <p className="text-sm font-semibold text-green-900 mb-1">Patient Notes</p>
                <p className="text-sm text-green-700">{appointment.notes}</p>
              </div>
            )}

            {appointment.cancellationReason && (
              <div className="mt-4 p-4 bg-red-50 rounded-xl border border-red-200">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  Cancelled by: {appointment.cancelledBy}
                </p>
                <p className="text-sm text-red-700">{appointment.cancellationReason}</p>
              </div>
            )}

            {appointment.videoLinkAvailable && appointment.videoConferenceLink && (
              <div className="mt-4 flex items-center gap-4">
                <a
                  href={appointment.videoConferenceLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  <Video className="w-5 h-5" />
                  Join Video Call
                </a>
                {appointment.videoLinkExpiresAt && (
                  <p className="text-xs text-green-600 font-medium">
                    Expires at {formatTime(appointment.videoLinkExpiresAt)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Right Section */}
          <div className="flex flex-col items-end gap-4 lg:border-l lg:border-green-100 lg:pl-6">
            <span className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 ${getStatusColor(appointment.status)}`}>
              {appointment.status}
            </span>

            {appointment.status === 'PENDING' && (
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={onApprove}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  Approve
                </button>
                <button
                  onClick={onReject}
                  className="px-6 py-2.5 text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium"
                >
                  Reject
                </button>
              </div>
            )}

            {appointment.status === 'SCHEDULED' && (
              <button
                onClick={onCancel}
                className="px-6 py-2.5 text-red-600 border-2 border-red-200 rounded-xl hover:bg-red-50 transition-colors font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CancelModal({ show, appointment, reason, setReason, onCancel, onConfirm, loading }: any) {
  if (!show) return null;

  return (
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
            Are you sure you want to cancel the appointment with{' '}
            <strong className="text-green-900">{appointment?.patientName}</strong>?
          </p>

          <div>
            <label className="block text-sm font-semibold text-green-900 mb-2">
              Reason for Cancellation <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors font-medium text-green-900"
            >
              Keep Appointment
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Cancelling...' : 'Cancel Appointment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ApproveModal({ show, appointment, formatDateTime, onCancel, onConfirm, loading }: any) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-green-100">
          <h2 className="text-xl font-bold text-green-600 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6" />
            Approve Appointment
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-green-800">
            Confirm appointment with{' '}
            <strong className="text-green-900">{appointment?.patientName}</strong> on{' '}
            <strong className="text-green-900">{formatDateTime(appointment?.appointmentDateTime)}</strong>?
          </p>

          {appointment?.notes && (
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <p className="text-sm font-semibold text-green-900 mb-1">Patient Notes</p>
              <p className="text-sm text-green-700">{appointment.notes}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors font-medium text-green-900"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-md hover:shadow-lg disabled:opacity-50 font-medium"
            >
              {loading ? 'Approving...' : 'Approve'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RejectModal({ show, appointment, reason, setReason, onCancel, onConfirm, loading }: any) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl">
        <div className="p-6 border-b border-green-100">
          <h2 className="text-xl font-bold text-red-600 flex items-center gap-3">
            <X className="w-6 h-6" />
            Reject Appointment
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-green-800">
            Reject appointment request from{' '}
            <strong className="text-green-900">{appointment?.patientName}</strong>?
          </p>

          <div>
            <label className="block text-sm font-semibold text-green-900 mb-2">
              Reason for Rejection <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Not available at this time, please book another slot..."
              rows={3}
              className="w-full px-4 py-3 border-2 border-green-100 rounded-xl focus:outline-none focus:border-red-500 transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-3 border-2 border-green-200 rounded-xl hover:bg-green-50 transition-colors font-medium text-green-900"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading ? 'Rejecting...' : 'Reject'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}