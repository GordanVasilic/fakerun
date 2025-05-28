import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import { Search, MapPin, Edit3, MoreHorizontal, Play, Trash2, Route, Clock, Mountain, Gauge, Minus, RotateCcw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Import Chart.js components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const Header = () => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center">
              <Play className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Fake My Run</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#" className="text-gray-600 hover:text-gray-900 transition-colors">How To Upload</a>
          </nav>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">0</span>
          <button className="text-gray-600 hover:text-gray-900">Log Email</button>
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md transition-colors">
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
};

const DrawableMap = ({ route, setRoute, mapCenter, setMapCenter }) => {
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  
  // Component to handle search and map centering
  const MapController = ({ center }) => {
    const map = useMap();
    
    useEffect(() => {
      if (center) {
        map.setView(center, 15);
      }
    }, [center, map]);
    
    return null;
  };

  // Component to handle map clicks and route building - always active
  const MapEvents = () => {
    useMapEvents({
      async click(e) {
        const newPoint = [e.latlng.lat, e.latlng.lng];
        
        if (routeCoordinates.length === 0) {
          // First point
          setRouteCoordinates([newPoint]);
          setRoute([newPoint]);
        } else {
          // Get route from last point to new point using routing service
          const lastPoint = routeCoordinates[routeCoordinates.length - 1];
          try {
            const routeSegment = await getRoute(lastPoint, newPoint);
            if (routeSegment && routeSegment.length > 0) {
              const newRouteCoords = [...routeCoordinates, ...routeSegment.slice(1)];
              setRouteCoordinates(newRouteCoords);
              setRoute(newRouteCoords);
            } else {
              // Fallback to direct line if routing fails
              const newRouteCoords = [...routeCoordinates, newPoint];
              setRouteCoordinates(newRouteCoords);
              setRoute(newRouteCoords);
            }
          } catch (error) {
            console.log('Routing failed, using direct line:', error);
            const newRouteCoords = [...routeCoordinates, newPoint];
            setRouteCoordinates(newRouteCoords);
            setRoute(newRouteCoords);
          }
        }
      },
    });
    return null;
  };

  // Function to get route between two points using OSRM (free routing service)
  const getRoute = async (start, end) => {
    try {
      // Using OSRM demo server (free, no API key needed)
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/foot/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`
      );
      const data = await response.json();
      
      if (data.routes && data.routes[0] && data.routes[0].geometry) {
        const coordinates = data.routes[0].geometry.coordinates;
        return coordinates.map(coord => [coord[1], coord[0]]); // Convert [lng,lat] to [lat,lng]
      }
      return null;
    } catch (error) {
      console.log('OSRM routing failed:', error);
      return null;
    }
  };

  const clearRoute = () => {
    setRoute([]);
    setRouteCoordinates([]);
  };

  const removeLastPoint = () => {
    if (routeCoordinates.length > 0) {
      const newCoords = routeCoordinates.slice(0, -1);
      setRouteCoordinates(newCoords);
      setRoute(newCoords);
    }
  };

  return (
    <div className="relative h-full">
      <MapContainer 
        center={mapCenter} 
        zoom={13} 
        className="h-full w-full cursor-crosshair"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapController center={mapCenter} />
        <MapEvents />
        
        {route.length > 1 && (
          <Polyline 
            positions={route} 
            color="#F97316" 
            weight={4}
            opacity={0.8}
          />
        )}
        
        {routeCoordinates.length > 0 && (
          <>
            <Marker position={routeCoordinates[0]} />
            {routeCoordinates.length > 1 && (
              <Marker position={routeCoordinates[routeCoordinates.length - 1]} />
            )}
          </>
        )}
      </MapContainer>
      
      {/* Route Controls - styled like orange buttons */}
      <div className="absolute bottom-4 left-4 z-[1000] flex space-x-2">
        <button 
          onClick={removeLastPoint}
          disabled={routeCoordinates.length === 0}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        >
          Remove last point
        </button>
        <button 
          onClick={clearRoute}
          disabled={routeCoordinates.length === 0}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        >
          Clear route
        </button>
      </div>

      {/* Click instruction */}
      <div className="absolute bottom-16 left-4 bg-orange-500 text-white px-3 py-2 rounded-lg shadow-lg z-[1000]">
        <div className="text-sm font-medium">Click on map to add points</div>
      </div>

      {/* Zoom Controls - moved to bottom right */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-1 z-[1000]">
        <div className="flex flex-col">
          <button className="p-2 hover:bg-gray-100 text-lg font-bold transition-colors">+</button>
          <button className="p-2 hover:bg-gray-100 text-lg font-bold transition-colors">−</button>
        </div>
      </div>
    </div>
  );
};

const RunDetailsPanel = ({ route, onRunDetailsChange }) => {
  const [runDetails, setRunDetails] = useState({
    name: 'Morning Run',
    date: '2026-05-29',
    startTime: '8:00',
    description: '',
    avgPace: 6.50, // Changed to number for easier calculations
    distance: 0,
    duration: 0,
    elevationGain: 0,
    activityType: 'run', // 'run' or 'bike'
    paceUnit: 'min/km' // 'min/km' or 'min/mi'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  // Notify parent component when runDetails change
  useEffect(() => {
    if (onRunDetailsChange) {
      onRunDetailsChange(runDetails);
    }
  }, [runDetails, onRunDetailsChange]);

  // Format duration in h:mm:ss format
  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // Handle creating fake run and downloading GPX
  const handleCreateRun = async () => {
    if (route.length < 2) {
      setError('Please create a route with at least 2 points on the map');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const backendUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
      
      const response = await fetch(`${backendUrl}/api/generate-gpx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: route,
          runDetails: runDetails
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to generate GPX file');
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'fake_run.gpx';
      if (contentDisposition) {
        const matches = contentDisposition.match(/filename="?([^"]+)"?/);
        if (matches) {
          filename = matches[1];
        }
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Error generating GPX:', error);
      setError(`Error: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate distance and update stats from route
  useEffect(() => {
    if (route.length > 1) {
      let totalDistance = 0;
      for (let i = 1; i < route.length; i++) {
        const lat1 = route[i-1][0];
        const lon1 = route[i-1][1];
        const lat2 = route[i][0];
        const lon2 = route[i][1];
        
        // Haversine formula for distance calculation
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        totalDistance += R * c;
      }
      
      const distance = parseFloat(totalDistance.toFixed(2));
      const duration = Math.round(distance * runDetails.avgPace); // Duration based on pace
      const elevationGain = Math.round(distance * 5.5); // Estimated elevation gain
      
      setRunDetails(prev => ({ 
        ...prev, 
        distance,
        duration,
        elevationGain
      }));
    } else {
      setRunDetails(prev => ({ 
        ...prev, 
        distance: 0,
        duration: 0,
        elevationGain: 0
      }));
    }
  }, [route, runDetails.avgPace]); // Re-calculate when pace changes

  // Handle pace input change
  const handlePaceInputChange = (e) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setRunDetails(prev => ({...prev, avgPace: value}));
    }
  };

  // Handle pace slider change
  const handlePaceSliderChange = (e) => {
    const value = parseFloat(e.target.value);
    setRunDetails(prev => ({...prev, avgPace: value}));
  };

  // Format pace for display
  const formatPace = (pace, unit = runDetails.paceUnit) => {
    // Convert pace if needed
    let displayPace = pace;
    if (unit === 'min/mi' && runDetails.paceUnit === 'min/km') {
      displayPace = pace * 1.60934; // Convert km to mile pace
    } else if (unit === 'min/km' && runDetails.paceUnit === 'min/mi') {
      displayPace = pace / 1.60934; // Convert mile to km pace
    }
    
    const minutes = Math.floor(displayPace);
    const seconds = Math.round((displayPace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-full bg-gray-50 p-6">
      <div className="space-y-6">{/* removed overflow-y-auto */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Details</h2>
          
          {/* Run/Bike toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
            <button 
              onClick={() => setRunDetails(prev => ({...prev, activityType: 'run'}))}
              className={`flex-1 py-2 text-sm font-medium text-center rounded-md shadow-sm transition-colors ${
                runDetails.activityType === 'run' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Run
            </button>
            <button 
              onClick={() => setRunDetails(prev => ({...prev, activityType: 'bike'}))}
              className={`flex-1 py-2 text-sm font-medium text-center rounded-md shadow-sm transition-colors ${
                runDetails.activityType === 'bike' ? 'bg-white text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Bike
            </button>
          </div>
        </div>

        {/* Run Stats */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Run Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* Distance */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Route className="w-5 h-5 text-orange-500" />
              </div>
              <div className="text-orange-500 text-lg font-semibold">{runDetails.distance}</div>
              <div className="text-xs text-gray-500">kilometers</div>
            </div>
            
            {/* Duration */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div className="text-2xl font-bold">{formatDuration(runDetails.duration)}</div>
              <div className="text-xs text-gray-500">duration</div>
            </div>
            
            {/* Elevation Gain */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Mountain className="w-5 h-5 text-green-500" />
              </div>
              <div className="text-lg font-semibold text-green-600">{runDetails.elevationGain}m</div>
              <div className="text-xs text-gray-500">elevation gain</div>
            </div>
            
            {/* Average Pace */}
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Gauge className="w-5 h-5 text-purple-500" />
              </div>
              <div className="text-lg font-semibold text-purple-600">{formatPace(runDetails.avgPace)}</div>
              <div className="text-xs text-gray-500">avg pace min/km</div>
            </div>
          </div>
        </div>

        {/* Pace Info */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Pace Info</h3>
          <div className="space-y-4">
            {/* Pace Slider and Input Combined */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Target Pace</span>
                <span className="text-orange-500 font-medium">{formatPace(runDetails.avgPace)} {runDetails.paceUnit}</span>
              </div>
              
              {/* Slider and Input in same row */}
              <div className="flex items-center space-x-3">
                <input 
                  type="range" 
                  min="3.0" 
                  max="12.0" 
                  step="0.1"
                  value={runDetails.avgPace}
                  onChange={handlePaceSliderChange}
                  className="flex-1 h-2 bg-orange-200 rounded-lg slider"
                />
                <input
                  type="number"
                  value={runDetails.avgPace.toFixed(1)}
                  onChange={handlePaceInputChange}
                  step="0.1"
                  min="3.0"
                  max="15.0"
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm text-center"
                  placeholder="6.0"
                />
              </div>
              
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>3:00</span>
                <span>12:00</span>
              </div>
            </div>

            {/* Pace Unit Toggle */}
            <div className="flex justify-center mt-3">
              <div className="flex bg-gray-200 rounded-lg p-1">
                <button
                  onClick={() => setRunDetails(prev => ({...prev, paceUnit: 'min/km'}))}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    runDetails.paceUnit === 'min/km'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  min/km
                </button>
                <button
                  onClick={() => setRunDetails(prev => ({...prev, paceUnit: 'min/mi'}))}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    runDetails.paceUnit === 'min/mi'
                      ? 'bg-orange-500 text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  min/mi
                </button>
              </div>
            </div>

            {/* Km-by-Km Pace Breakdown for Running */}
            {runDetails.activityType === 'run' && runDetails.distance > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Pace per Km (with Elevation)</h4>
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {(() => {
                    const kmCount = Math.ceil(runDetails.distance);
                    const kmPaces = [];
                    
                    // Calculate elevation change per km
                    const elevationPerKm = runDetails.elevationGain / kmCount;
                    
                    for (let i = 0; i < kmCount; i++) {
                      // Simulate elevation effect on pace
                      // Uphill: +10-30% slower, Downhill: 5-15% faster
                      const elevationFactor = Math.sin((i / kmCount) * Math.PI * 2) * 0.2; // -0.2 to +0.2
                      const uphillFactor = Math.max(0, elevationFactor) * 1.5; // More impact for uphill
                      const downhillFactor = Math.min(0, elevationFactor) * 0.75; // Less impact for downhill
                      
                      const paceAdjustment = (uphillFactor + downhillFactor) * runDetails.avgPace;
                      const kmPace = runDetails.avgPace + paceAdjustment;
                      
                      kmPaces.push(
                        <div key={i} className="flex items-center justify-between bg-white p-2 rounded border">
                          <span className="text-sm font-medium">Km {i + 1}</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">
                              {elevationFactor > 0.05 ? '↗️ uphill' : elevationFactor < -0.05 ? '↘️ downhill' : '→ flat'}
                            </span>
                            <input
                              type="number"
                              value={kmPace.toFixed(1)}
                              onChange={(e) => {
                                // Handle individual km pace changes
                                // Note: This is a simplified version - in a real app you'd want to update 
                                // the global pace based on average of all km paces
                                const value = parseFloat(e.target.value);
                                if (!isNaN(value) && value > 0) {
                                  // For now, just show the input - could implement full recalculation
                                  console.log(`Km ${i + 1} pace changed to ${value}`);
                                }
                              }}
                              step="0.1"
                              min="3.0"
                              max="15.0"
                              className="w-16 px-1 py-1 border border-gray-300 rounded text-xs text-center focus:outline-none focus:ring-1 focus:ring-orange-500"
                            />
                            <span className="text-xs text-gray-500">{runDetails.paceUnit}</span>
                          </div>
                        </div>
                      );
                    }
                    
                    return kmPaces;
                  })()}
                </div>
                <div className="mt-2 text-xs text-gray-500 text-center">
                  Average: {formatPace(runDetails.avgPace)} {runDetails.paceUnit}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Run Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Run Name</label>
          <input
            type="text"
            value={runDetails.name}
            onChange={(e) => setRunDetails(prev => ({...prev, name: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input
            type="date"
            value={runDetails.date}
            onChange={(e) => setRunDetails(prev => ({...prev, date: e.target.value}))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Start Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
          <div className="flex space-x-2">
            <input
              type="time"
              value={runDetails.startTime}
              onChange={(e) => setRunDetails(prev => ({...prev, startTime: e.target.value}))}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            value={runDetails.description}
            onChange={(e) => setRunDetails(prev => ({...prev, description: e.target.value}))}
            placeholder="Great morning run through the park"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {/* Create Button */}
        <button 
          onClick={handleCreateRun}
          disabled={isGenerating || route.length < 2}
          className={`w-full font-semibold py-3 px-4 rounded-md transition-colors ${
            isGenerating || route.length < 2
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isGenerating ? 'Generating GPX...' : 'Create Fake Run'}
        </button>
      </div>
    </div>
  );
};

const DataVisualization = ({ route, runDetails }) => {
  // Default values if runDetails is not yet available
  const defaultRunDetails = {
    avgPace: 6.0,
    elevationGain: 50,
    distance: 5.0,
    duration: 1800
  };
  
  const details = runDetails || defaultRunDetails;
  
  // Generate realistic data based on the actual route
  const generatePaceData = () => {
    if (!route || route.length < 2) {
      return {
        labels: ['0'],
        datasets: [{
          label: 'Pace',
          data: [details.avgPace],
          borderColor: '#F97316',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    const numPoints = Math.min(route.length, 20);
    const labels = [];
    const paceData = [];
    
    // Calculate total distance for this route (simplified)
    const totalDistance = details.distance;
    
    for (let i = 0; i < numPoints; i++) {
      const distanceAlongRoute = (totalDistance * i) / (numPoints - 1);
      labels.push(distanceAlongRoute.toFixed(1));
      
      if (i === 0) {
        paceData.push(details.avgPace);
      } else {
        // Generate realistic pace variation around target pace
        const variation = (Math.sin(i * 0.5) * 0.3) + (Math.random() - 0.5) * 0.4;
        const pace = Math.max(3.0, Math.min(12.0, details.avgPace + variation));
        paceData.push(pace);
      }
    }
    
    return {
      labels,
      datasets: [{
        label: 'Pace',
        data: paceData,
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };
  };

  // Generate elevation data based on route
  const generateElevationData = () => {
    if (!route || route.length < 2) {
      return {
        labels: ['0'],
        datasets: [{
          label: 'Elevation',
          data: [100],
          borderColor: '#059669',
          backgroundColor: 'rgba(5, 150, 105, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    const numPoints = Math.min(route.length, 20);
    const labels = [];
    const elevationData = [];
    
    const totalDistance = details.distance;
    let currentElevation = 100; // Starting elevation
    
    for (let i = 0; i < numPoints; i++) {
      const distanceAlongRoute = (totalDistance * i) / (numPoints - 1);
      labels.push(distanceAlongRoute.toFixed(1));
      
      if (i === 0) {
        elevationData.push(currentElevation);
      } else {
        // Simulate elevation changes based on total elevation gain
        const progressRatio = i / (numPoints - 1);
        const baseElevationGain = details.elevationGain * progressRatio;
        
        // Add some realistic variation
        const hillVariation = Math.sin(i * 0.8) * 15; // Hills and valleys
        const noise = (Math.random() - 0.5) * 10; // Small variations
        
        currentElevation = 100 + baseElevationGain + hillVariation + noise;
        elevationData.push(Math.max(50, currentElevation)); // Minimum 50m elevation
      }
    }
    
    return {
      labels,
      datasets: [{
        label: 'Elevation',
        data: elevationData,
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };
  };

  const paceData = generatePaceData();
  const elevationData = generateElevationData();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
      },
      y: {
        grid: {
          color: '#e5e7eb',
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
  };

  return (
    <div className="bg-white px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Visualization</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pace Profile */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Pace Profile</h3>
              <span className="text-sm text-gray-500">Average: 6.15 min/km over total</span>
            </div>
            <div className="h-64">
              <Line data={paceData} options={chartOptions} />
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">Distance (km)</div>
          </div>

          {/* Elevation Profile */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Elevation Profile</h3>
              <span className="text-sm text-gray-500">Total Gain: 56m</span>
            </div>
            <div className="h-64">
              <Line data={elevationData} options={chartOptions} />
            </div>
            <div className="mt-2 text-xs text-gray-500 text-center">Distance (km)</div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">10.2</div>
            <div className="text-sm text-gray-500">Total Distance</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">62:48</div>
            <div className="text-sm text-gray-500">Total Time</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">6:15</div>
            <div className="text-sm text-gray-500">Avg Pace</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">56m</div>
            <div className="text-sm text-gray-500">Elevation Gain</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreateRouteMain = () => {
  const [route, setRoute] = useState([]);
  const [runDetails, setRunDetails] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060]); // Default to NYC, will be updated with user location
  const [isSearching, setIsSearching] = useState(false);

  // Get user's current location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setMapCenter([latitude, longitude]);
          console.log('User location set:', latitude, longitude);
        },
        (error) => {
          console.log('Geolocation failed, using default location (NYC):', error);
          // Keep default NYC location if geolocation fails
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
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex p-4 gap-4 min-h-[80vh]">
        {/* Left Panel - Map */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-lg h-[80vh] overflow-hidden relative">
            <div className="absolute top-4 left-4 right-4 z-[1000]">
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Your Custom Route</h1>
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
            />
          </div>
        </div>

        {/* Right Panel - Run Details */}
        <div className="w-96">
          <div className="bg-white rounded-lg shadow-lg h-[80vh]">
            <RunDetailsPanel route={route} onRunDetailsChange={setRunDetails} />
          </div>
        </div>
      </div>

      {/* Data Visualization - same width as map */}
      <div className="mx-4 mb-4">
        <div className="bg-white rounded-lg shadow-lg">
          <DataVisualization route={route} runDetails={runDetails} />
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 py-4 px-6 mt-4">
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
    </div>
  );
};