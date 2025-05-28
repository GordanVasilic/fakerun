import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMapEvents, useMap } from 'react-leaflet';
import { Line } from 'react-chartjs-2';
import { Search, MapPin, Edit3, MoreHorizontal, Play, Trash2 } from 'lucide-react';
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

const DrawableMap = ({ route, setRoute }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingMode, setDrawingMode] = useState('draw'); // 'draw', 'point', 'line'
  
  const MapEvents = () => {
    useMapEvents({
      click(e) {
        if (isDrawing && drawingMode === 'draw') {
          setRoute(prev => [...prev, [e.latlng.lat, e.latlng.lng]]);
        }
      },
    });
    return null;
  };

  return (
    <div className="relative h-full">
      <MapContainer 
        center={[40.7128, -74.0060]} 
        zoom={13} 
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <MapEvents />
        {route.length > 1 && (
          <Polyline 
            positions={route} 
            color="#F97316" 
            weight={4}
          />
        )}
        {route.map((position, idx) => (
          <Marker key={idx} position={position} />
        ))}
      </MapContainer>
      
      {/* Map Controls */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-2 z-[1000]">
        <div className="flex flex-col space-y-2">
          <button
            onClick={() => setIsDrawing(!isDrawing)}
            className={`p-2 rounded ${isDrawing ? 'bg-orange-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
            <MapPin className="w-4 h-4" />
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 rounded">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-1 z-[1000]">
        <div className="flex flex-col">
          <button className="p-2 hover:bg-gray-100 text-lg font-bold">+</button>
          <button className="p-2 hover:bg-gray-100 text-lg font-bold">−</button>
        </div>
      </div>
    </div>
  );
};

const RunDetailsPanel = ({ route }) => {
  const [runDetails, setRunDetails] = useState({
    name: 'Morning Run',
    date: '2026-05-29',
    startTime: '8:00',
    description: '',
    avgPace: '6:50',
    paceVariability: 50,
    distance: 0,
    duration: 0
  });

  // Calculate distance from route
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
      setRunDetails(prev => ({ 
        ...prev, 
        distance: totalDistance.toFixed(2),
        duration: Math.round(totalDistance * 8) // Assuming 8 min/km pace
      }));
    }
  }, [route]);

  return (
    <div className="h-full bg-gray-50 p-6 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Run Details</h2>
          
          {/* Basic/Pro toggle */}
          <div className="flex bg-gray-200 rounded-lg p-1 mb-4">
            <button className="flex-1 py-2 text-sm font-medium text-center bg-white rounded-md shadow-sm">
              Basic
            </button>
            <button className="flex-1 py-2 text-sm font-medium text-center text-gray-600">
              Pro
            </button>
          </div>
        </div>

        {/* Run Stats */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Run Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-orange-500 text-lg font-semibold">{runDetails.distance}</div>
              <div className="text-xs text-gray-500">kilometers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{Math.floor(runDetails.duration / 60)}:{(runDetails.duration % 60).toString().padStart(2, '0')}</div>
              <div className="text-xs text-gray-500">duration hms</div>
            </div>
          </div>
        </div>

        {/* Pace Info */}
        <div className="bg-white rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Pace Info</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Average Pace (marked)</span>
              <span className="text-orange-500 font-medium">{runDetails.avgPace} min/km</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm">Pace Variability</span>
                <span className="text-sm">{runDetails.paceVariability}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={runDetails.paceVariability}
                onChange={(e) => setRunDetails(prev => ({...prev, paceVariability: e.target.value}))}
                className="w-full h-2 bg-orange-200 rounded-lg slider"
              />
              <div className="text-xs text-gray-500 mt-1">Affects pace throughout the run versus GPX effort</div>
            </div>
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

        {/* Create Button */}
        <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-md transition-colors">
          Create Fake Run
        </button>
      </div>
    </div>
  );
};

const DataVisualization = () => {
  // Mock data for pace profile
  const paceData = {
    labels: Array.from({length: 20}, (_, i) => (i * 0.5).toFixed(1)),
    datasets: [
      {
        label: 'Pace',
        data: [6.8, 6.5, 6.3, 6.1, 5.9, 6.0, 6.2, 6.4, 6.1, 5.8, 5.9, 6.3, 6.5, 6.7, 6.4, 6.2, 6.0, 5.9, 6.1, 6.3],
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // Mock data for elevation profile
  const elevationData = {
    labels: Array.from({length: 20}, (_, i) => (i * 0.5).toFixed(1)),
    datasets: [
      {
        label: 'Elevation',
        data: [10, 12, 15, 18, 22, 25, 23, 20, 18, 15, 12, 10, 8, 6, 9, 12, 15, 18, 16, 14],
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

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
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="flex flex-col h-screen">
      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Left Panel - Map */}
        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 right-4 z-[1000]">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Create Your Custom Route</h1>
            <div className="flex space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="Search for a location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg flex items-center space-x-1 shadow-sm transition-colors">
                <Search className="w-4 h-4" />
              </button>
              <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg shadow-sm transition-colors">
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <DrawableMap route={route} setRoute={setRoute} />
          
          {/* Bottom overlay with drawing tools */}
          <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
            <div className="text-sm text-gray-600 mb-2">Choose a shape or draw manually</div>
            <div className="flex space-x-2">
              <button className="bg-orange-500 text-white px-3 py-2 rounded flex items-center space-x-1">
                <Edit3 className="w-4 h-4" />
                <span>Draw</span>
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>Point</span>
              </button>
              <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-2 rounded flex items-center space-x-1">
                <MoreHorizontal className="w-4 h-4" />
                <span>Line</span>
              </button>
            </div>
            <div className="mt-2 flex items-center space-x-2">
              <input type="checkbox" id="show-waypoints" className="rounded" />
              <label htmlFor="show-waypoints" className="text-sm text-gray-600">Show Waypoints</label>
            </div>
          </div>
        </div>

        {/* Right Panel - Run Details */}
        <div className="w-80">
          <RunDetailsPanel route={route} />
        </div>
      </div>

      {/* Data Visualization */}
      <DataVisualization />

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 py-4 px-6">
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