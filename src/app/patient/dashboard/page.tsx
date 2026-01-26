'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../../../firebase-config'; 
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

// Types
interface UserOverview {
  name: string;
  email: string;
  accountCreatedAt: string;
}

interface RecentDiagnosis {
  id: string;
  query: string;
  status: 'completed' | 'failed' | 'processing';
  timestamp: string;
}

interface Appointment {
  id: string;
  doctorName: string;
  mode: 'online' | 'in-person';
  appointmentDateTime: string;
  specialty?: string;
}

interface DashboardData {
  userOverview: UserOverview;
  recentDiagnoses: RecentDiagnosis[];
  upcomingAppointments: Appointment[];
}

// API Helper
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

async function fetchDashboardData(): Promise<DashboardData> {
  const user = auth.currentUser;
  if (!user) throw new Error('User not authenticated');
  
  const idToken = await user.getIdToken();
  const response = await fetch(`${API_BASE_URL}/api/dashboard`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) throw new Error('Unauthorized - Please log in again');
    if (response.status === 404) throw new Error('User data not found');
    throw new Error('Failed to fetch dashboard data');
  }
  
  return response.json();
}

// UI Components
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children }: { children: React.ReactNode }) {
  return <div className="mb-4 pb-3 border-b border-green-100">{children}</div>;
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-lg font-semibold text-gray-800">{children}</h2>;
}

function StatusBadge({ status }: { status: 'completed' | 'failed' | 'processing' }) {
  const styles = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    failed: 'bg-red-100 text-red-700 border-red-200',
    processing: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  };

  const labels = {
    completed: 'Completed',
    failed: 'Failed',
    processing: 'Processing',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Main Dashboard Component
export default function DashboardPage() {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth Guard
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  // Fetch Dashboard Data
  useEffect(() => {
    async function loadDashboard() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardData();
        setDashboardData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!dashboardData) return null;

  const { userOverview, recentDiagnoses, upcomingAppointments } = dashboardData;

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your health journey</p>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - User Overview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
              </CardHeader>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Name</p>
                  <p className="text-base font-medium text-gray-900">{userOverview.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="text-base text-gray-700">{userOverview.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member Since</p>
                  <p className="text-base text-gray-700">
                    {format(new Date(userOverview.accountCreatedAt), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column - Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Health Queries */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Health Queries</CardTitle>
              </CardHeader>
              {recentDiagnoses.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No recent queries found. Start a new diagnosis to get started.
                </p>
              ) : (
                <div className="space-y-4">
                  {recentDiagnoses.map((query) => (
                    <div
                      key={query.id}
                      className="flex items-start justify-between p-3 rounded-md border border-gray-100 hover:border-green-200 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 mb-1">{query.query}</p>
                        <p className="text-xs text-gray-500">
                          {formatDistanceToNow(new Date(query.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <StatusBadge status={query.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Upcoming Appointments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Appointments</CardTitle>
              </CardHeader>
              {upcomingAppointments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  No upcoming appointments scheduled.
                </p>
              ) : (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-start gap-4 p-4 rounded-md border border-gray-100 hover:border-green-200 transition-colors"
                    >
                      <div className="shrink-0">
                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900">{appointment.doctorName}</h3>
                        {appointment.specialty && (
                          <p className="text-xs text-gray-600 mt-0.5">{appointment.specialty}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-xs text-gray-700">
                            {format(new Date(appointment.appointmentDateTime), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-700">
                            {format(new Date(appointment.appointmentDateTime), 'h:mm a')}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className={`text-xs font-medium ${
                            appointment.mode === 'online' ? 'text-green-600' : 'text-blue-600'
                          }`}>
                            {appointment.mode === 'online' ? 'Online' : 'In-Person'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Quick Actions - Full Width */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                href="/diagnosis/new"
                className="group block p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 flex items-center justify-center mb-3 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Start New Diagnosis</h3>
                <p className="text-xs text-gray-600">Describe your symptoms and get AI-powered insights</p>
              </Link>

              <Link
                href="/doctors/search"
                className="group block p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Find Nearby Doctors</h3>
                <p className="text-xs text-gray-600">Search for healthcare providers in your area</p>
              </Link>

              <Link
                href="/appointments/book"
                className="group block p-4 rounded-lg border border-gray-200 hover:border-green-300 transition-all"
              >
                <div className="w-12 h-12 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 flex items-center justify-center mb-3 transition-colors">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Book Appointment</h3>
                <p className="text-xs text-gray-600">Schedule a consultation with a specialist</p>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}