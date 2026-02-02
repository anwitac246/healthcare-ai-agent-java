'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Navigation, Phone, Globe, X, Menu } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/navbar';

interface Location {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface Place {
  name: string;
  type: string;
  location: Location;
  distance: number;
  address: string;
  phone?: string;
  website?: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function MapPage() {
  const router = useRouter();
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  
  // Authentication state
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [radius, setRadius] = useState(5000);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Check authentication first
  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authToken) {
      loadLeaflet();
    }
  }, [authToken]);

  useEffect(() => {
    if (mapLoaded && userLocation) {
      initMap();
    }
  }, [mapLoaded, userLocation]);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const userDataStr = localStorage.getItem('userData');
      
      if (!token || !userDataStr) {
        router.push('/login');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/login');
        return;
      }

      setAuthToken(token);
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    } finally {
      setIsAuthChecking(false);
    }
  };

  const loadLeaflet = () => {
    if (typeof window !== 'undefined') {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        setMapLoaded(true);
        getUserLocation();
      };
      document.head.appendChild(script);
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            displayName: 'Your Location'
          });
        },
        () => {
          setUserLocation({
            latitude: 19.0760,
            longitude: 72.8777,
            displayName: 'Mumbai, India'
          });
        }
      );
    } else {
      setUserLocation({
        latitude: 19.0760,
        longitude: 72.8777,
        displayName: 'Mumbai, India'
      });
    }
  };

  const initMap = () => {
    if (!mapRef.current && userLocation && (window as any).L) {
      const L = (window as any).L;
      
      const map = L.map('map').setView([userLocation.latitude, userLocation.longitude], 13);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      const userMarkerHtml = `<div style="background: #15803d; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`;

      const userMarker = L.marker([userLocation.latitude, userLocation.longitude], {
        icon: L.divIcon({
          className: 'custom-user-marker',
          html: userMarkerHtml,
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        })
      }).addTo(map);

      mapRef.current = map;
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim() && selectedType === 'all') {
      return;
    }

    if (!authToken) {
      router.push('/login');
      return;
    }

    setLoading(true);
    setSelectedPlace(null);

    try {
      let lat = userLocation?.latitude;
      let lon = userLocation?.longitude;

      if (searchQuery.trim()) {
        const geocodeResponse = await fetch(
          `${API_BASE_URL}/api/map/geocode?query=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`
            }
          }
        );
        
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          if (geocodeData.data?.location) {
            lat = geocodeData.data.location.latitude;
            lon = geocodeData.data.location.longitude;
            setUserLocation(geocodeData.data.location);
            
            if (mapRef.current) {
              mapRef.current.setView([lat, lon], 13);
            }
          }
        }
      }

      const typeParam = selectedType !== 'all' ? `&type=${selectedType}` : '';
      const nearbyResponse = await fetch(
        `${API_BASE_URL}/api/map/nearby?lat=${lat}&lon=${lon}&radius=${radius}${typeParam}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (nearbyResponse.ok) {
        const nearbyData = await nearbyResponse.json();
        setPlaces(nearbyData.data?.places || []);
        displayMarkers(nearbyData.data?.places || []);
      } else if (nearbyResponse.status === 401 || nearbyResponse.status === 403) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        router.push('/login');
      }
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const displayMarkers = (places: Place[]) => {
    if (!mapRef.current) return;

    const L = (window as any).L;

    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    places.forEach((place) => {
      const markerColor = getMarkerColor(place.type);
      
      const markerHtml = `
        <div style="background: ${markerColor}; width: 28px; height: 28px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
          <div style="width: 8px; height: 8px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
        </div>
      `;
      
      const marker = L.marker([place.location.latitude, place.location.longitude], {
        icon: L.divIcon({
          className: 'custom-place-marker',
          html: markerHtml,
          iconSize: [28, 28],
          iconAnchor: [14, 28]
        })
      }).addTo(mapRef.current);

      marker.on('click', () => {
        setSelectedPlace(place);
        mapRef.current.setView([place.location.latitude, place.location.longitude], 15);
      });

      markersRef.current.push(marker);
    });

    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.location.latitude, p.location.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'hospital': return '#15803d';
      case 'clinic': return '#16a34a';
      case 'doctors': return '#22c55e';
      case 'pharmacy': return '#4ade80';
      case 'ambulance_station': return '#dc2626';
      default: return '#15803d';
    }
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(1)} km`;
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    if (mapRef.current) {
      mapRef.current.setView([place.location.latitude, place.location.longitude], 15);
    }
  };

  const getDirectionsUrl = () => {
    if (!selectedPlace || !userLocation) return '#';
    const fromLat = userLocation.latitude;
    const fromLon = userLocation.longitude;
    const toLat = selectedPlace.location.latitude;
    const toLon = selectedPlace.location.longitude;
    return `https://www.openstreetmap.org/directions?from=${fromLat},${fromLon}&to=${toLat},${toLon}`;
  };

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
    <div className="h-screen flex flex-col bg-white">
      <Navbar />
      
      <div className="flex-1 flex overflow-hidden mt-16">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-96' : 'w-0'} bg-white border-r mt-10 border-gray-200 flex flex-col transition-all duration-300 overflow-hidden`}>
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Find Healthcare</h2>
            
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Search location..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent text-gray-900"
                />
              </div>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent text-gray-900"
              >
                <option value="all">All Healthcare</option>
                <option value="hospital">Hospitals</option>
                <option value="clinic">Clinics</option>
                <option value="doctors">Doctors</option>
                <option value="pharmacy">Pharmacies</option>
                <option value="ambulance">Ambulance Stations</option>
              </select>

              <select
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-700 focus:border-transparent text-gray-900"
              >
                <option value="1000">Within 1 km</option>
                <option value="2000">Within 2 km</option>
                <option value="5000">Within 5 km</option>
                <option value="10000">Within 10 km</option>
                <option value="20000">Within 20 km</option>
              </select>

              <button
                onClick={handleSearch}
                disabled={loading}
                className="w-full bg-green-700 text-white py-2.5 rounded-lg hover:bg-green-800 transition-colors font-medium disabled:opacity-50"
              >
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {places.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No results yet</p>
                <p className="text-sm mt-1">Search to find healthcare facilities</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {places.map((place, index) => (
                  <div
                    key={index}
                    onClick={() => handlePlaceClick(place)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedPlace === place ? 'bg-green-50 border-l-4 border-green-700' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div 
                        className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: getMarkerColor(place.type) }}
                      >
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{place.name}</h3>
                        <p className="text-sm text-gray-600 capitalize">{place.type.replace('_', ' ')}</p>
                        <p className="text-xs text-gray-500 truncate mt-1">{place.address}</p>
                        <p className="text-xs font-medium text-green-700 mt-1">{formatDistance(place.distance)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative mt-5">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 left-4 z-1000 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50 transition-colors border border-gray-200"
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>

          <div id="map" className="w-full h-full"></div>

          {selectedPlace && (
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-gray-200 w-96 z-1000" style={{ maxWidth: '90%' }}>
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: getMarkerColor(selectedPlace.type) }}
                    >
                      <MapPin className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 text-lg">{selectedPlace.name}</h3>
                      <p className="text-sm text-gray-600 capitalize">{selectedPlace.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPlace(null)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <Navigation className="w-4 h-4 text-gray-500 mt-0.5 shrink-0" />
                    <p className="text-gray-700">{selectedPlace.address}</p>
                  </div>
                  
                  <p className="font-medium text-green-700">{formatDistance(selectedPlace.distance)} away</p>

                  {selectedPlace.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-500 shrink-0" />
                      <a href={`tel:${selectedPlace.phone}`} className="text-green-700 hover:text-green-800">
                        {selectedPlace.phone}
                      </a>
                    </div>
                  )}

                  {selectedPlace.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-gray-500 shrink-0" />
                      <a 
                        href={selectedPlace.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-700 hover:text-green-800 truncate"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <a
                    href={getDirectionsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center bg-green-700 text-white py-2 rounded-lg hover:bg-green-800 transition-colors font-medium"
                  >
                    Get Directions
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}