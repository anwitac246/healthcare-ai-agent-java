'use client';

import { useState, useEffect, useRef } from 'react';
import { Calendar, Clock, Video, MapPin, User, X, CheckCircle2, Mail, Home, FileText, LogOut, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Appointment {
  id: string;
  patientName: string;
  patientEmail: string;
  mode: 'ONLINE' | 'IN_PERSON';
  appointmentDateTime: string;
  status: 'PENDING' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'REJECTED';
  videoConferenceLink?: string;
  videoLinkAvailable: boolean;
  notes?: string;
  holdExpiresAt?: string;
  durationMinutes: number;
  rejectionReason?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function DoctorAppointmentsPage() {
  const router = useRouter();
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  
  const [activeView, setActiveView] = useState<'upcoming' | 'past'>('upcoming');
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'SCHEDULED'>('ALL');
  const [activeSection, setActiveSection] = useState<'dashboard' | 'appointments' | 'reports'>('appointments');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [pastAppointments, setPastAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);

  const dashboardRef = useRef<HTMLDivElement>(null);
  const appointmentsRef = useRef<HTMLDivElement>(null);
  const reportsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authToken) {
      loadAppointments();
    }
  }, [authToken, activeView]);

  const scrollToSection = (section: 'dashboard' | 'appointments' | 'reports') => {
    setActiveSection(section);
    const refs = {
      dashboard: dashboardRef,
      appointments: appointmentsRef,
      reports: reportsRef
    };
    refs[section].current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token || !userDataStr) {
        router.push('/doctor_login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/doctor_login');
        return;
      }

      setAuthToken(token);
      setUserData(JSON.parse(userDataStr));
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/doctor_login');
    } finally {
      setIsAuthChecking(false);
    }
  };

  const loadAppointments = async () => {
    if (!authToken) return;
    
    setLoading(true);
    try {
      const endpoint = activeView === 'upcoming' 
        ? '/api/appointments/doctor/upcoming'
        : '/api/appointments/doctor/past';
      
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

  const handleApproveAppointment = async (appointmentId: string) => {
    if (!authToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${appointmentId}/approve`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to approve appointment');
      }

      alert('Appointment approved successfully');
      loadAppointments();
      if (showDetailModal) {
        setShowDetailModal(false);
        setSelectedAppointment(null);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAppointment = async () => {
    if (!selectedAppointment || !rejectionReason.trim() || !authToken) return;

    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/appointments/${selectedAppointment.id}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
          },
          body: JSON.stringify({ reason: rejectionReason })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to reject appointment');
      }

      alert('Appointment rejected');
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedAppointment(null);
      loadAppointments();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    router.push('/doctor_login');
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

  const appointments = activeView === 'upcoming' ? upcomingAppointments : pastAppointments;
  
  const filteredAppointments = activeTab === 'ALL' 
    ? appointments 
    : appointments.filter(apt => apt.status === activeTab);

  const upcomingCounts = {
    ALL: upcomingAppointments.length,
    PENDING: upcomingAppointments.filter(a => a.status === 'PENDING').length,
    SCHEDULED: upcomingAppointments.filter(a => a.status === 'SCHEDULED').length,
  };

  const todayAppointments = upcomingAppointments.filter(a => {
    const aptDate = new Date(a.appointmentDateTime).toDateString();
    const today = new Date().toDateString();
    return aptDate === today;
  }).length;

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
    <div className="min-h-screen bg-white flex">
      {/* Sidebar */}
      <div className="w-72 min-h-screen bg-white border-r border-gray-200 shadow-sm fixed left-0 top-0">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-green-600 bg-clip-text text-transparent">
            AetherCare
          </h1>
          <p className="text-sm text-gray-600 mt-1">Doctor Portal</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <button
              onClick={() => scrollToSection('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeSection === 'dashboard'
                  ? 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Dashboard</span>
            </button>
            <button
              onClick={() => scrollToSection('appointments')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeSection === 'appointments'
                  ? 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Appointments</span>
            </button>
            <button
              onClick={() => scrollToSection('reports')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                activeSection === 'reports'
                  ? 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
              }`}
            >
              <FileText className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span className="font-medium">Reports</span>
            </button>
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-3 mb-4 p-3 bg-gradient-to-r from-green-50 to-green-100 rounded-lg">
            <div className="w-12 h-12 bg-white border-2 border-green-300 rounded-full flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-green-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">
                Dr. {userData?.firstName} {userData?.lastName}
              </p>
              <p className="text-xs text-gray-600 truncate">{userData?.specialization}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-72 overflow-auto">
        {/* Dashboard Section */}
        <div ref={dashboardRef} className="min-h-screen px-8 py-8">
          <div className="max-w-[1400px] mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600 text-lg mb-8">Welcome to your doctor portal</p>
            
            <div className="grid grid-cols-4 gap-6 mb-8">
              <div className="bg-white border-2 border-green-500 rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-7 h-7 text-green-700" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Today</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">{todayAppointments}</p>
                <p className="text-sm text-gray-600">Appointments</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="w-7 h-7 text-amber-600" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">{upcomingCounts.PENDING}</p>
                <p className="text-sm text-gray-600">Awaiting Action</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-7 h-7 text-green-700" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Confirmed</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">{upcomingCounts.SCHEDULED}</p>
                <p className="text-sm text-gray-600">Scheduled</p>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-all duration-200">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="w-7 h-7 text-gray-600" />
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</span>
                </div>
                <p className="text-4xl font-bold text-gray-900 mb-1">{upcomingCounts.ALL}</p>
                <p className="text-sm text-gray-600">All Upcoming</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Actions</h3>
              <p className="text-sm text-blue-800 mb-4">Manage your appointments and patient care</p>
              <div className="flex gap-3">
                <button
                  onClick={() => scrollToSection('appointments')}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg hover:shadow-lg transition-all duration-200 font-semibold"
                >
                  View Appointments
                </button>
                <button
                  onClick={() => scrollToSection('reports')}
                  className="px-6 py-2.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Section */}
        <div ref={appointmentsRef} className="min-h-screen px-8 py-8 border-t border-gray-200">
          <div className="max-w-[1400px] mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Appointment Management</h1>
              <p className="text-gray-600 text-lg">Review and manage patient appointment requests</p>
            </div>

            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveView('upcoming');
                  setActiveTab('ALL');
                }}
                className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                  activeView === 'upcoming'
                    ? 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500 hover:text-green-700'
                }`}
              >
                Upcoming Appointments
              </button>
              <button
                onClick={() => {
                  setActiveView('past');
                  setActiveTab('ALL');
                }}
                className={`px-6 py-3 font-semibold rounded-lg transition-all duration-200 ${
                  activeView === 'past'
                    ? 'bg-gradient-to-r from-green-700 to-green-600 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-300 hover:border-green-500 hover:text-green-700'
                }`}
              >
                Past Appointments
              </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl mb-6 shadow-sm">
              <div className="flex border-b border-gray-200">
                {activeView === 'upcoming' ? (
                  <>
                    <button
                      onClick={() => setActiveTab('ALL')}
                      className={`px-6 py-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                        activeTab === 'ALL'
                          ? 'border-green-600 text-green-700 bg-green-50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      ALL ({upcomingCounts.ALL})
                    </button>
                    <button
                      onClick={() => setActiveTab('PENDING')}
                      className={`px-6 py-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                        activeTab === 'PENDING'
                          ? 'border-green-600 text-green-700 bg-green-50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      PENDING ({upcomingCounts.PENDING})
                    </button>
                    <button
                      onClick={() => setActiveTab('SCHEDULED')}
                      className={`px-6 py-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                        activeTab === 'SCHEDULED'
                          ? 'border-green-600 text-green-700 bg-green-50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      SCHEDULED ({upcomingCounts.SCHEDULED})
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setActiveTab('ALL')}
                    className={`px-6 py-4 font-semibold text-sm border-b-2 transition-all duration-200 ${
                      activeTab === 'ALL'
                        ? 'border-green-600 text-green-700 bg-green-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    ALL ({pastAppointments.length})
                  </button>
                )}
              </div>

              <div className="p-6">
                {loading ? (
                  <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-700 mx-auto"></div>
                    <p className="text-gray-600 mt-6 font-medium">Loading appointments...</p>
                  </div>
                ) : filteredAppointments.length === 0 ? (
                  <div className="text-center py-20">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No appointments found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredAppointments.map((appointment) => (
                      <div key={appointment.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 bg-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-start gap-4 mb-4">
                              <div className="w-14 h-14 bg-gradient-to-br from-green-100 to-green-50 border-2 border-green-200 rounded-xl flex items-center justify-center flex-shrink-0">
                                <User className="w-7 h-7 text-green-700" />
                              </div>
                              <div className="flex-1">
                                <h3 className="text-xl font-bold text-gray-900">{appointment.patientName}</h3>
                                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                  <Mail className="w-4 h-4" />
                                  {appointment.patientEmail}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                                <Clock className="w-4 h-4 text-green-600" />
                                <span className="font-medium">{formatDateTime(appointment.appointmentDateTime)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-700 bg-gray-50 px-3 py-2 rounded-lg">
                                {appointment.mode === 'ONLINE' ? <Video className="w-4 h-4 text-green-600" /> : <MapPin className="w-4 h-4 text-green-600" />}
                                <span className="font-medium">{appointment.mode === 'ONLINE' ? 'Online' : 'In-Person'} ({appointment.durationMinutes} min)</span>
                              </div>
                              <div>
                                <span className={`inline-flex px-4 py-1.5 text-xs font-semibold rounded-full ${
                                  appointment.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                  appointment.status === 'SCHEDULED' ? 'bg-green-100 text-green-700' :
                                  appointment.status === 'COMPLETED' ? 'bg-gray-100 text-gray-700' :
                                  appointment.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                  appointment.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                  'bg-gray-100 text-gray-600'
                                }`}>
                                  {appointment.status}
                                </span>
                              </div>
                            </div>

                            {appointment.status === 'PENDING' && appointment.holdExpiresAt && (
                              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                                <Clock className="w-4 h-4 text-amber-600 mt-0.5" />
                                <p className="text-xs text-amber-800">
                                  Hold expires in: <strong>{getTimeUntilExpiry(appointment.holdExpiresAt)}</strong>
                                </p>
                              </div>
                            )}

                            {appointment.notes && (
                              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-xs font-semibold text-blue-900 mb-1">Patient Notes</p>
                                <p className="text-sm text-blue-800">{appointment.notes}</p>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-2 ml-6">
                            <button
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setShowDetailModal(true);
                              }}
                              className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-all flex items-center gap-2 font-medium"
                            >
                              View Details
                              <ChevronRight className="w-4 h-4" />
                            </button>

                            {appointment.status === 'PENDING' && activeView === 'upcoming' && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleApproveAppointment(appointment.id)}
                                  disabled={loading}
                                  className="px-4 py-2 text-sm bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedAppointment(appointment);
                                    setShowRejectModal(true);
                                  }}
                                  className="px-4 py-2 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-all font-medium"
                                >
                                  Reject
                                </button>
                              </div>
                            )}

                            {appointment.videoLinkAvailable && appointment.videoConferenceLink && activeView === 'upcoming' && (
                              <a
                                href={appointment.videoConferenceLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 text-sm bg-gradient-to-r from-green-700 to-green-600 text-white rounded-lg hover:shadow-lg transition-all inline-flex items-center gap-2 font-medium"
                              >
                                <Video className="w-4 h-4" />
                                Join Call
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reports Section */}
        <div ref={reportsRef} className="min-h-screen px-8 py-8 border-t border-gray-200">
          <div className="max-w-[1400px] mx-auto">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
            <p className="text-gray-600 text-lg mb-8">View patient reports and practice analytics</p>
            
            <div className="bg-white border border-gray-200 rounded-xl p-20 text-center shadow-sm">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No reports available yet</p>
              <p className="text-gray-500 text-sm mt-2">Patient reports and analytics will appear here</p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl">
            <div className="border-b border-gray-200 p-6 flex justify-between items-center bg-gradient-to-r from-green-50 to-white">
              <h2 className="text-xl font-bold text-gray-900">Appointment Details</h2>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  setSelectedAppointment(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Patient Information</h3>
                <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl">
                  <div className="w-16 h-16 bg-white border-2 border-green-300 rounded-xl flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-green-700" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-lg">{selectedAppointment.patientName}</p>
                    <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                      <Mail className="w-4 h-4" />
                      {selectedAppointment.patientEmail}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Appointment Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Date & Time</p>
                    <p className="font-semibold text-gray-900">{formatDateTime(selectedAppointment.appointmentDateTime)}</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.durationMinutes} minutes</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Mode</p>
                    <p className="font-semibold text-gray-900">{selectedAppointment.mode === 'ONLINE' ? 'Online Video' : 'In-Person Visit'}</p>
                  </div>
                  <div className="p-4 border border-gray-200 rounded-xl bg-gray-50">
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      selectedAppointment.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                      selectedAppointment.status === 'SCHEDULED' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {selectedAppointment.status}
                    </span>
                  </div>
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Patient Notes</h3>
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                    <p className="text-sm text-gray-800">{selectedAppointment.notes}</p>
                  </div>
                </div>
              )}

              {selectedAppointment.status === 'PENDING' && activeView === 'upcoming' && (
                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      handleApproveAppointment(selectedAppointment.id);
                    }}
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-700 to-green-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Approving...' : 'Approve Appointment'}
                  </button>
                  <button
                    onClick={() => {
                      setShowDetailModal(false);
                      setShowRejectModal(true);
                    }}
                    className="flex-1 px-6 py-3 text-red-600 border border-red-300 rounded-xl hover:bg-red-50 transition-all font-semibold"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="border-b border-gray-200 p-6 bg-gradient-to-r from-red-50 to-white">
              <h2 className="text-xl font-bold text-gray-900">Reject Appointment</h2>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-700">
                Reject appointment with <strong>{selectedAppointment.patientName}</strong>?
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Rejection <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="E.g., Not available at this time..."
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none shadow-sm"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectionReason('');
                    setSelectedAppointment(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectAppointment}
                  disabled={!rejectionReason.trim() || loading}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 hover:shadow-lg transition-all disabled:opacity-50 font-medium"
                >
                  {loading ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}