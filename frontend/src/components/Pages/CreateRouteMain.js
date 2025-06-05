import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Search, MapPin, Edit3, MoreHorizontal, Play, Trash2, Route, Clock, Mountain, Gauge, Minus, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
  elevationCache, 
  sampleCoordinates, 
  getOpenElevation, 
  calculateElevationGain, 
  interpolateElevation, 
  getKmElevationChanges 
} from '../../utils/elevation';
import { authService } from '../../services/auth';
import MapTypeSelector from '../Map/MapTypeSelector';
import { startIcon, endIcon, waypointIcon } from '../Map/mapIcons';
import DataVisualization from '../Charts/DataVisualization';
import SaveRouteModal from '../Modals/SaveRouteModal';
import NotificationModal from '../Modals/NotificationModal';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// DrawableMap component (extracted from components.js)
const DrawableMap = ({
  route, 
  setRoute, 
  mapCenter, 
  setMapCenter, 
  shouldCenter, 
  setShouldCenter, 
  runDetails, 
  saveRoute, 
  clickedPoints, 
  setClickedPoints
}) => {
  // ... (I need to extract the complete DrawableMap implementation)
};

// RunDetailsPanel component (extracted from components.js)
const RunDetailsPanel = ({ route, onRunDetailsChange, saveRoute, routeCoordinates }) => {
  // ... (I need to extract the complete RunDetailsPanel implementation)
};

const CreateRouteMain = ({ loadedRoute }) => {
  const [route, setRoute] = useState([]);
  const [runDetails, setRunDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC, will be updated with user location
  const [shouldCenter, setShouldCenter] = useState(true); // Add this line
  const [isSearching, setIsSearching] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [existingRouteNames, setExistingRouteNames] = useState([]);
  const [showSaveNotification, setShowSaveNotification] = useState(false);
  const [defaultRouteName, setDefaultRouteName] = useState('');
  const [isGeneratingGpx, setIsGeneratingGpx] = useState(false);
  // Add clickedPoints state here
  const [clickedPoints, setClickedPoints] = useState([]);

  // Fetch existing route names when component mounts
  useEffect(() => {
    const fetchExistingRoutes = async () => {
      console.log('fetchExistingRoutes called');
      console.log('Is authenticated:', authService.isAuthenticated());
      console.log('Token exists:', !!authService.getToken());
      
      // Only fetch if authenticated
      if (!authService.isAuthenticated()) {
        console.log('Not authenticated, returning early');
        setExistingRouteNames([]);
        return;
      }
      
      console.log('Making API call to /api/routes');
      try {
        const response = await fetch('http://localhost:8000/api/routes', {
          headers: {
            ...authService.getAuthHeaders(),
          },
        });
        if (response.ok) {
          const routes = await response.json();
          setExistingRouteNames(routes.map(route => route.name));
        } else if (response.status === 401) {
          authService.logout();
          window.location.reload();
        }
      } catch (err) {
        console.error('Error fetching existing routes:', err);
      }
    };
    fetchExistingRoutes();
  }, []);

  const saveRoute = async (routeName, overwrite = false) => {
    if (!authService.isAuthenticated()) {
      alert('Please sign in to save routes');
      return;
    }

    if (route.length === 0) {
      alert('Please create a route first before saving.');
      return;
    }

    try {
      // Use originalRunDetails if available, otherwise calculate fallback values
      let finalRunDetails;
      
      if (runDetails && runDetails.distance > 0) {
        // Use the properly calculated values from RunDetailsPanel
        finalRunDetails = {
          route_name: routeName,
          distance: runDetails.distance,
          duration: runDetails.duration,
          pace: runDetails.avgPace ? String(runDetails.avgPace) : "6:00",
          calories: runDetails.calories || Math.round(runDetails.distance * 70),
          elevation_gain: runDetails.elevationGain || 0,
          activity_type: runDetails.activityType || 'run',
          name: runDetails.name || 'Morning Run',
          date: runDetails.date || new Date().toISOString().split('T')[0],
          start_time: runDetails.startTime || '08:00',
          description: runDetails.description || '',
          // Add heart rate data
          heart_rate_enabled: runDetails.heartRateEnabled || false,
          avg_heart_rate: runDetails.avgHeartRate || 140,
          pace_unit: runDetails.paceUnit || 'min/km',
          elevation_profile: runDetails.elevationProfile || [],
          original_elevation_data: runDetails.originalElevationData || null
        };
      } else {
        // Fallback: Calculate values if runDetails is not available
        let totalDistance = 0;
        if (route.length > 1) {
          for (let i = 1; i < route.length; i++) {
            const lat1 = route[i-1][0];
            const lon1 = route[i-1][1];
            const lat2 = route[i][0];
            const lon2 = route[i][1];
            
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            totalDistance += R * c;
          }
        }

        finalRunDetails = {
          route_name: routeName,
          distance: totalDistance || 0,
          duration: (totalDistance * 6 * 60) || 0,
          pace: "6:00",
          calories: Math.round(totalDistance * 70) || 0,
          elevation_gain: 0,
          activity_type: 'run',
          name: 'Morning Run',
          date: new Date().toISOString().split('T')[0],
          start_time: '08:00',
          description: '',
          // Add default heart rate data
          heart_rate_enabled: false,
          avg_heart_rate: 140,
          pace_unit: 'min/km',
          elevation_profile: [],
          original_elevation_data: null
        };
      }

      console.log('Saving route with data:', {
        coordinates: route,
        runDetails: finalRunDetails,
        originalRunDetails: runDetails,
        routeLength: route.length,
        usingOriginalData: !!(runDetails && runDetails.distance > 0)
      });

      const response = await fetch(`http://localhost:8000/api/routes${overwrite ? '?overwrite=true' : ''}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authService.getAuthHeaders(),
        },
        body: JSON.stringify({
          coordinates: route,
          runDetails: finalRunDetails
        })
      });

      if (response.ok) {
        setShowSaveNotification(true);
        setShowSaveModal(false);
        
        // Refresh existing route names
        const routesResponse = await fetch('http://localhost:8000/api/routes', {
          headers: {
            ...authService.getAuthHeaders(),
          },
        });
        if (routesResponse.ok) {
          const routes = await routesResponse.json();
          setExistingRouteNames(routes.map(route => route.name));
        }
      } else if (response.status === 401) {
        authService.logout();
        window.location.reload();
      } else {
        const errorData = await response.json();
        console.log('Server error response:', errorData); // Debug log
        console.log('Error detail type:', typeof errorData.detail); // Additional debug
        console.log('Error detail content:', errorData.detail); // Additional debug
        
        // Fix: Properly handle errorData.detail which might be an object
        let errorDetail = 'Failed to save route';
        if (errorData.detail) {
          if (typeof errorData.detail === 'string') {
            errorDetail = errorData.detail;
          } else if (Array.isArray(errorData.detail)) {
            // Handle validation errors array - improved formatting
            errorDetail = errorData.detail.map(err => {
              if (typeof err === 'string') {
                return err;
              } else if (err.msg && err.loc) {
                // FastAPI validation error format
                return `${err.loc.join('.')}: ${err.msg}`;
              } else {
                return JSON.stringify(err);
              }
            }).join('; ');
          } else {
            // Handle object detail
            errorDetail = JSON.stringify(errorData.detail);
          }
        }
        
        throw new Error(errorDetail);
      }
    } catch (err) {
      console.error('Error saving route:', err);
      // Fix: Better error handling to avoid [object Object] display
      let errorMessage = 'Unknown error occurred';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err.toString && typeof err.toString === 'function') {
        errorMessage = err.toString();
      }
      
      alert('Error saving route: ' + errorMessage);
    }
  };

  const handleSaveClick = () => {
    // Generate default route name with Activity Name + date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      month: '2-digit', 
      day: '2-digit', 
      year: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
    const defaultRouteName = `${runDetails?.name || 'My Run'} - ${dateStr} ${timeStr}`;
    
    setDefaultRouteName(defaultRouteName);
    setShowSaveModal(true);
  };

  // Add effect to load a route when passed from saved routes
  useEffect(() => {
    if (loadedRoute) {
      const fullRoute = loadedRoute.coordinates || [];
      setRoute(fullRoute);
      setRunDetails(loadedRoute.run_details || null);
      
      // Extract waypoints from the full route by sampling key points
      // This is a heuristic approach since we don't have the original clicked points
      let extractedWaypoints = [];
      if (fullRoute.length > 0) {
        // Always include the first point
        extractedWaypoints.push(fullRoute[0]);
        
        // For routes with many points, sample waypoints at regular intervals
        if (fullRoute.length > 10) {
          const step = Math.max(1, Math.floor(fullRoute.length / 8)); // Extract ~8 waypoints
          for (let i = step; i < fullRoute.length - 1; i += step) {
            extractedWaypoints.push(fullRoute[i]);
          }
        } else {
          // For shorter routes, use every 2nd or 3rd point
          const step = Math.max(1, Math.floor(fullRoute.length / 4));
          for (let i = step; i < fullRoute.length - 1; i += step) {
            extractedWaypoints.push(fullRoute[i]);
          }
        }
        
        // Always include the last point if it's different from the first
        if (fullRoute.length > 1) {
          extractedWaypoints.push(fullRoute[fullRoute.length - 1]);
        }
      }
      
      setClickedPoints(extractedWaypoints);
    }
  }, [loadedRoute]);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          setShouldCenter(true); // Trigger initial centering
          console.log('User location set:', latitude, longitude);
        },
        (error) => {
          console.log('Geolocation failed, using default location (NYC):', error);
          setShouldCenter(true); // Center on default location
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 600000 // Cache for 10 minutes
        }
      );
    }
  }, []);

  // Function to search for locations using Nominatim API
  const searchLocation = async (query) => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setMapCenter([lat, lon]);
        setShouldCenter(true); // Trigger centering for search
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    searchLocation(searchQuery);
  };

  const handleSearchKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchLocation(searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Main Content */}
      <div className="flex p-4 gap-4">
        {/* Left Panel - Map and Data Visualization */}
        <div className="flex-1 space-y-4">
          <div className="bg-white rounded-lg shadow-lg h-[80vh] overflow-hidden relative">
            <div className="absolute top-4 left-4 z-[1000]">
              <div className="bg-white bg-opacity-90 rounded-lg shadow-lg px-4 py-3 mb-4 w-fit">
                <h1 className="text-2xl font-bold text-gray-900">Create Your Custom Route</h1>
                <p className="text-sm text-gray-600 mt-1">Click on map to add points</p>
              </div>
              <form onSubmit={handleSearchSubmit} className="flex space-x-2">
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Search for a location..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleSearchKeyPress}
                    className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                    disabled={isSearching}
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  {isSearching && (
                    <div className="absolute right-3 top-2.5">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                    </div>
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-1 shadow-sm transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
                <button 
                  type="button"
                  onClick={() => navigator.geolocation?.getCurrentPosition(
                    (position) => {
                      setMapCenter([position.coords.latitude, position.coords.longitude]);
                      setShouldCenter(true); // Trigger centering for geolocation
                    },
                    (error) => {
                      console.error('Geolocation error:', error);
                      alert('Unable to get your location. Please search for a location instead.');
                    }
                  )}
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors"
                  title="Use current location"
                >
                  <MapPin className="w-4 h-4" />
                </button>
              </form>
            </div>
            
            <DrawableMap 
              route={route} 
              setRoute={setRoute} 
              mapCenter={mapCenter}
              setMapCenter={setMapCenter}
              shouldCenter={shouldCenter}
              setShouldCenter={setShouldCenter}
              runDetails={runDetails}
              saveRoute={saveRoute}
              clickedPoints={clickedPoints}
              setClickedPoints={setClickedPoints}
            />
          </div>
          
          {/* Data Visualization - now inside left panel */}
          <div className="bg-white rounded-lg shadow-lg">
            <DataVisualization route={route} runDetails={runDetails} />
          </div>
        </div>

        {/* Right Panel - Run Details */}
        <div className="w-96">
          <div className="bg-white rounded-lg shadow-lg relative z-[1001]">
            <RunDetailsPanel 
              route={loadedRoute}
              routeCoordinates={route}
              onRunDetailsChange={setRunDetails}
              saveRoute={handleSaveClick}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="text-sm text-gray-500">
            © 2026 FakeMyRun. All rights reserved.
          </div>
          <div className="flex space-x-6">
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">Terms of Service</a>
            <a href="#" className="text-sm text-gray-500 hover:text-gray-700">How To Upload</a>
          </div>
        </div>
      </footer>
      
      <SaveRouteModal 
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={saveRoute}
        existingNames={existingRouteNames}
        defaultName={defaultRouteName}
      />
      
      <NotificationModal
        isOpen={showSaveNotification}
        onClose={() => setShowSaveNotification(false)}
        type="success"
        title="Route Saved"
        message="Your route has been saved successfully!"
      />
    </div>
  );
};

export default CreateRouteMain;