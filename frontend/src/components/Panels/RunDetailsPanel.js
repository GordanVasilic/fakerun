import React, { useState, useEffect, useMemo } from 'react';
import { Save, MapPin, Clock, TrendingUp, Activity, Heart } from 'lucide-react';
import { 
  getOpenElevation, 
  calculateElevationGain, 
  sampleCoordinates,
  getKmElevationChanges 
} from '../../utils/elevation';
import DataVisualization from '../Charts/DataVisualization';

// Move this to the top of the file, after imports
const activityTypeOptions = [
  { value: 'Walking', label: '🚶 Walking' },
  { value: 'Hiking', label: '🥾 Hiking' },
  { value: 'Swimming', label: '🏊 Swimming' },
  { value: 'Golf', label: '⛳ Golf' },
  { value: 'Tennis', label: '🎾 Tennis' },
  { value: 'Basketball', label: '🏀 Basketball' },
  { value: 'Soccer', label: '⚽ Soccer' }
];

const RunDetailsPanel = ({
  route,
  routeCoordinates,
  onRunDetailsChange,
  onHeartRateChange, // Add this new prop
  saveRoute
}) => {
  // Seeded random number generator for consistent pace calculations
  const seededRandom = (seed) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  // State for run details
  const [runDetails, setRunDetails] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '08:00',
    description: '',
    pace: 6.0, // minutes per km - changed from 5.5 to 6.0
    distance: 0,
    duration: 0,
    elevationGain: 0,
    activityType: 'Run', // 'Run' or 'Bike'
    paceUnit: 'min/km',
    heartRateEnabled: false,
    avgHeartRate: 150,
    heartRateVariability: 10,
    paceVariation: 25 // Default to 25% pace variation - changed from 10 to 25
  });

  // State for GPX generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  // Effect to set appropriate default pace when activity type changes
  useEffect(() => {
    if (runDetails.activityType === 'Bike' && runDetails.pace === 6.0) {
      // Set default bike speed to 25 km/h (2.4 min/km)
      setRunDetails(prev => ({ ...prev, pace: 2.4 }));
    } else if (runDetails.activityType === 'Run' && runDetails.pace === 2.4) {
      // Set default running pace to 6.0 min/km
      setRunDetails(prev => ({ ...prev, pace: 6.0 }));
    }
  }, [runDetails.activityType]);
    // State for pace and heart rate per kilometer
  const [kmPaces, setKmPaces] = useState({});
  const [kmHeartRates, setKmHeartRates] = useState({});
  
  // State for elevation data
  const [elevationData, setElevationData] = useState([]);
  const [kmElevationChanges, setKmElevationChanges] = useState({});

  // State for current location
  const [currentLocation, setCurrentLocation] = useState(null);

  // Function to get location name using reverse geocoding
  const getLocationName = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`);
      const data = await response.json();
      
      if (data && data.address) {
        const { city, town, village, suburb, neighbourhood, road } = data.address;
        const locationParts = [];
        
        if (road) locationParts.push(road);
        if (neighbourhood) locationParts.push(neighbourhood);
        if (suburb) locationParts.push(suburb);
        if (city || town || village) locationParts.push(city || town || village);
        
        return locationParts.slice(0, 2).join(', ') || 'Unknown Location';
      }
    } catch (error) {
      console.error('Error getting location name:', error);
    }
    return 'Unknown Location';
  };

  // Function to generate activity name
  const generateActivityName = async () => {
    if (!routeCoordinates || routeCoordinates.length === 0) return '';
    
    const startPoint = routeCoordinates[0];
    const locationName = await getLocationName(startPoint[0], startPoint[1]);
    
    const activityType = runDetails.activityType === 'Run' ? 'Run' : 'Bike Ride';
    const timeOfDay = (() => {
      const hour = parseInt(runDetails.startTime.split(':')[0]);
      if (hour < 6) return 'Night';
      if (hour < 12) return 'Morning';
      if (hour < 17) return 'Afternoon';
      if (hour < 21) return 'Evening';
      return 'Night';
    })();
    
    return `${timeOfDay} ${activityType} in ${locationName}`;
  };

  // Get current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, []);

  // Update activity name when relevant details change
  useEffect(() => {
    if (routeCoordinates && routeCoordinates.length > 0) {
      generateActivityName().then(name => {
        if (name && !runDetails.name) {
          setRunDetails(prev => ({ ...prev, name }));
        }
      });
    }
  }, [routeCoordinates, runDetails.activityType, runDetails.startTime]);

  // Helper functions for time formatting
  const timeFormatToDecimal = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 2) return parseFloat(timeStr) || 0;
    const minutes = parseInt(parts[0]) || 0;
    const seconds = parseInt(parts[1]) || 0;
    return minutes + (seconds / 60);
  };

  const decimalToTimeFormat = (decimal) => {
    if (isNaN(decimal)) return '0:00';
    const minutes = Math.floor(decimal);
    const seconds = Math.round((decimal - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  // Handle loaded route details
  useEffect(() => {
    if (route?.run_details) {
      setRunDetails(prev => ({
        ...prev,
        ...route.run_details,
        // Handle heart rate data if it exists
        heartRateEnabled: route.run_details.avgHeartRate ? true : prev.heartRateEnabled,
        avgHeartRate: route.run_details.avgHeartRate || prev.avgHeartRate
      }));
    }
  }, [route?.run_details]);

  // Notify parent component of changes - FIXED to exclude heart rate from pace-affecting changes
  useEffect(() => {
    if (onRunDetailsChange) {
      // Create a copy without heart rate data for pace calculations
      const paceRelevantDetails = {
        ...runDetails,
        // Remove heart rate fields that shouldn't affect pace
        avgHeartRate: undefined,
        heartRateVariability: undefined,
        heartRateEnabled: undefined
      };
      onRunDetailsChange(paceRelevantDetails);
    }
  }, [
    // Only include pace-relevant dependencies
    runDetails.name,
    runDetails.date,
    runDetails.startTime,
    runDetails.activityType,
    runDetails.distance,
    runDetails.pace,
    runDetails.paceVariation
  ]);

  // Function to handle GPX creation
  const handleCreateRun = async () => {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      setError('Please create a route with at least 2 points');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/generate-gpx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          coordinates: routeCoordinates,
          runDetails: runDetails,
          kmPaces: kmPaces,
          kmHeartRates: kmHeartRates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate GPX');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${runDetails.name || 'route'}.gpx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error generating GPX:', error);
      setError(error.message || 'Failed to generate GPX file');
    } finally {
      setIsGenerating(false);
    }
  };

    // Add this useEffect to update heart rate details when heart rate settings change
    useEffect(() => {
      if (onHeartRateChange) {
        const heartRateData = {
          heartRateEnabled: runDetails.heartRateEnabled,
          avgHeartRate: runDetails.avgHeartRate,
          heartRateVariability: runDetails.heartRateVariability,
          kmHeartRates: kmHeartRates
        };
        
        console.log('Calling onHeartRateChange with:', heartRateData);
        onHeartRateChange(heartRateData);
      }
    }, [
      runDetails.heartRateEnabled,
      runDetails.avgHeartRate, 
      runDetails.heartRateVariability,
      kmHeartRates,
      onHeartRateChange
    ]);

  // Calculate distance, duration, and elevation gain based on route coordinates
  useEffect(() => {
    if (!routeCoordinates || routeCoordinates.length < 2) {
      setRunDetails(prev => ({ ...prev, distance: 0, duration: 0, elevationGain: 0 }));
      return;
    }

    const calculateRouteStats = async () => {
      // Replace the elevation calculation part with:
      try {
        // Calculate distance
        let totalDistance = 0;
        for (let i = 1; i < routeCoordinates.length; i++) {
          const [lat1, lng1] = routeCoordinates[i - 1];
          const [lat2, lng2] = routeCoordinates[i];
          
          const R = 6371; // Earth's radius in km
          const dLat = (lat2 - lat1) * Math.PI / 180;
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                    Math.sin(dLng/2) * Math.sin(dLng/2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
          totalDistance += R * c;
        }
      
        // Get elevation data
        const sampledCoords = sampleCoordinates(routeCoordinates.map(([lat, lng]) => ({ lat, lng })));
        const elevationDataResult = await getOpenElevation(sampledCoords);
        
        // Store elevation data
        setElevationData(elevationDataResult);
      
        // Calculate elevation gain
        let elevationGain = 0;
        if (elevationDataResult && elevationDataResult.length > 1) {
          elevationGain = calculateElevationGain(elevationDataResult);
          
          // Calculate km elevation changes
          const kmElevChanges = getKmElevationChanges(elevationDataResult, totalDistance, elevationDataResult);
          const kmElevChangesObj = {};
          kmElevChanges.forEach((change, index) => {
            kmElevChangesObj[index] = change;
          });
          setKmElevationChanges(kmElevChangesObj);
        }
      
        // Calculate duration based on pace and distance
        const duration = totalDistance * runDetails.pace * 60; // Convert minutes to seconds
      
        setRunDetails(prev => ({
          ...prev,
          distance: totalDistance,
          duration: duration,
          elevationGain: Math.round(elevationGain),
          elevationProfile: elevationDataResult
        }));
      } catch (error) {
        console.error('Error calculating route stats:', error);
      }
    };

    calculateRouteStats();
  }, [routeCoordinates, runDetails.pace]);

  // Update duration when pace or distance changes
  useEffect(() => {
    if (runDetails.distance > 0) {
      const newDuration = runDetails.distance * runDetails.pace * 60; // Convert minutes to seconds
      setRunDetails(prev => ({ ...prev, duration: newDuration }));
    }
  }, [runDetails.pace, runDetails.distance]);

  // Function to calculate heart rate per kilometer based on elevation and other factors
  const calculateKmHeartRates = (avgHeartRate, variability, kmElevationChanges) => {
    const kmHeartRates = {};
    const kmCount = Math.ceil(runDetails.distance);
    const adjustments = [];
    
    // First pass: calculate all adjustments
    for (let i = 0; i < kmCount; i++) {
      const elevationChange = kmElevationChanges[i] || 0;
      
      // Base heart rate adjustment based on elevation ONLY
      let heartRateAdjustment = 0;
      if (elevationChange > 10) {
        heartRateAdjustment = Math.min(25, elevationChange * 0.8); // Uphill increases HR
      } else if (elevationChange < -10) {
        heartRateAdjustment = Math.max(-15, elevationChange * 0.3); // Downhill decreases HR slightly
      }
      
      // Add some natural variability
      const sineVariation = Math.sin((i / kmCount) * Math.PI * 4) * 3; // -3 to +3
      const randomVariation = (Math.random() - 0.5) * 4; // -2 to +2
      const naturalVariation = sineVariation + randomVariation; // Combined: roughly -5 to +5
      
      // Combine elevation and natural variation
      const totalVariation = heartRateAdjustment + naturalVariation;
      
      // Scale the TOTAL variation by the variability slider
      // This way, slider at 1 = very flat (minimal variation), slider at 40 = very hilly (full variation)
      const scaledAdjustment = totalVariation * (variability / 40);
      
      adjustments.push(scaledAdjustment);
    }
    
    // Calculate average adjustment to center around target average
    const avgAdjustment = adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length;
    
    // Second pass: apply centered adjustments
    for (let i = 0; i < kmCount; i++) {
      const centeredAdjustment = adjustments[i] - avgAdjustment;
      const kmHeartRate = Math.round(avgHeartRate + centeredAdjustment);
      kmHeartRates[i] = Math.max(80, Math.min(220, kmHeartRate)); // Clamp between 80-220
    }
    
    return kmHeartRates;
  };

  // Update km heart rates when relevant details change
  useEffect(() => {
    if (runDetails.heartRateEnabled && runDetails.distance > 0) {
      const newKmHeartRates = calculateKmHeartRates(
        runDetails.avgHeartRate,
        runDetails.heartRateVariability,
        kmElevationChanges
      );
      
      setKmHeartRates(newKmHeartRates);
    }
  }, [runDetails.heartRateEnabled, runDetails.avgHeartRate, runDetails.heartRateVariability, runDetails.distance, kmElevationChanges]);

  // Function to update global pace based on km paces
  const updateGlobalPace = (kmPacesObj, kmCount, kmElevationChanges) => {
    const paceValues = [];
    let totalAdjustment = 0;
    
    for (let i = 0; i < kmCount; i++) {
      if (kmPacesObj[i]) {
        paceValues.push(kmPacesObj[i]);
      } else {
        // Calculate default pace with elevation and variation adjustments
        const kmElevationChange = kmElevationChanges[i] || 0;
        
        // Calculate realistic pace based on elevation
        let paceAdjustment = 0;
        if (kmElevationChange > 10) {
          // Uphill: slower pace
          paceAdjustment = Math.min(2.0, kmElevationChange * 0.015);
        } else if (kmElevationChange < -10) {
          // Downhill: faster pace
          paceAdjustment = Math.max(-0.8, kmElevationChange * 0.008);
        }
        
        // Apply pace variation only if enabled
                  let paceVariationAdjustment = 0;
                  // Remove this entire old pace variation block since we have the new segmented approach above
                  // The new approach is already handling pace variation in the loop starting around line 401
        
        // Combine base pace + elevation effects + pace variation
        const kmPace = Math.max(3.0, Math.min(12.0, runDetails.pace + paceAdjustment + paceVariationAdjustment));
        paceValues.push(kmPace);
        totalAdjustment += paceAdjustment + paceVariationAdjustment;
      }
    }
    
    if (paceValues.length > 0) {
      const avgPace = paceValues.reduce((sum, pace) => sum + pace, 0) / paceValues.length;
      setRunDetails(prev => ({ ...prev, pace: avgPace }));
    }
  };

  // Helper function to format pace
  const formatPace = (pace) => {
    const minutes = Math.floor(pace);
    const seconds = Math.round((pace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

        // Helper function to convert pace (min/km) to speed (km/h)
      const paceToSpeed = (pace) => {
        return 60 / pace; // Convert minutes per km to km per hour
      };

      // Helper function to convert speed (km/h) to pace (min/km)
      const speedToPace = (speed) => {
        return 60 / speed; // Convert km per hour to minutes per km
      };

      // Helper function to format speed
      const formatSpeed = (pace) => {
        const speed = paceToSpeed(pace);
        return `${speed.toFixed(1)} km/h`;
      };

      // Helper function to get appropriate label based on activity type
      const getPaceSpeedLabel = (activityType, pace) => {
        return activityType === 'Bike' ? formatSpeed(pace) : formatPace(pace);
      };

      // Helper function to get appropriate unit label
      const getPaceSpeedUnit = (activityType) => {
        return activityType === 'Bike' ? 'km/h' : 'min/km';
      };
  // Single main return statement
  // The return statement should have this structure:
  return (
    <div className="space-y-4">
      {/* Activity Type Selector */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Activity Type</h3>
        <div className="flex flex-wrap items-center gap-2">
          {/* Run Button */}
          <button
            onClick={() => setRunDetails(prev => ({ ...prev, activityType: 'Run' }))}
            className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-1 text-sm ${
              runDetails.activityType === 'Run'
                ? 'bg-blue-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-base">🏃‍♂️</span>
            <span>Run</span>
          </button>

          {/* Bike Button */}
          <button
            onClick={() => setRunDetails(prev => ({ ...prev, activityType: 'Bike' }))}
            className={`px-3 py-2 rounded-lg font-medium transition-all duration-200 flex items-center space-x-1 text-sm ${
              runDetails.activityType === 'Bike'
                ? 'bg-green-500 text-white shadow-md'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-base">🚴‍♂️</span>
            <span>Bike</span>
          </button>

          {/* Other Sports Dropdown */}
          <div className="relative flex-shrink-0">
            <select
              value={!['Run', 'Bike'].includes(runDetails.activityType) ? runDetails.activityType : ''}
              onChange={(e) => {
                if (e.target.value) {
                  setRunDetails(prev => ({ ...prev, activityType: e.target.value }));
                }
              }}
              className={`px-3 py-2 pr-8 rounded-lg font-medium transition-all duration-200 appearance-none cursor-pointer text-sm min-w-0 ${
                !['Run', 'Bike'].includes(runDetails.activityType)
                  ? 'bg-purple-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <option value="">🏆 Other</option>
              {activityTypeOptions.map((sport) => (
                <option key={sport.value} value={sport.value}>
                  {sport.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
              <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Display selected activity type */}
        {!['Run', 'Bike'].includes(runDetails.activityType) && (
          <div className="mt-2 p-2 bg-purple-50 rounded-lg">
            <span className="text-xs text-purple-700 font-medium">
              Selected: {activityTypeOptions.find(sport => sport.value === runDetails.activityType)?.label || runDetails.activityType}
            </span>
          </div>
        )}
      </div>

      {/* Activity Stats Section */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Activity Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Distance */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-orange-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {runDetails.distance.toFixed(2)} km
            </div>
            <div className="text-sm text-gray-600">Distance</div>
          </div>
          
          {/* Duration */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-blue-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.floor(runDetails.duration / 3600)}:{Math.floor((runDetails.duration % 3600) / 60).toString().padStart(2, '0')}:{Math.floor(runDetails.duration % 60).toString().padStart(2, '0')}
            </div>
            <div className="text-sm text-gray-600">Duration</div>
          </div>
          
          {/* Elevation Gain */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-green-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {Math.round(runDetails.elevationGain)}m
            </div>
            <div className="text-sm text-gray-600">Elevation Gain</div>
          </div>
          
          {/* Average Pace/Speed */}
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <svg className="w-6 h-6 text-purple-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-orange-600">
              {getPaceSpeedLabel(runDetails.activityType, runDetails.pace)}
            </div>
            <div className="text-sm text-gray-600">
              {runDetails.activityType === 'Bike' ? 'Avg Speed' : 'Avg Pace'}
            </div>
          </div>
        </div>
      </div>

        {/* Pace/Speed Controls Section */}
        {runDetails.distance > 0 && (
          <div className="bg-white rounded-lg p-4 shadow-sm max-w-full overflow-hidden space-y-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">⏱️</span>
              {runDetails.activityType === 'Bike' ? 'Speed Settings' : 'Pace Settings'}
            </h3>
            
                       {/* Average Pace/Speed Slider */}
                       <div className="max-w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {runDetails.activityType === 'Bike' ? 'Average Speed' : 'Average Pace'}: {getPaceSpeedLabel(runDetails.activityType, runDetails.pace)}
              </label>
              <input
                type="range"
                min={runDetails.activityType === 'Bike' ? "0.667" : "1"} // 0.667 min/km = 90 km/h max for bike
                max={runDetails.activityType === 'Bike' ? "8.571" : "12"} // 8.571 min/km = 7 km/h min for bike
                step="0.003"
                value={runDetails.activityType === 'Bike' ? (9.238 - runDetails.pace) : runDetails.pace} // Invert value for bike to show 7km/h on left
                onChange={(e) => {
                  const newValue = runDetails.activityType === 'Bike' 
                    ? (9.238 - parseFloat(e.target.value)) // Invert back for bike
                    : parseFloat(e.target.value);
                  setRunDetails(prev => ({ ...prev, pace: newValue }));
                }}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                {runDetails.activityType === 'Bike' ? (
                  <>
                    <span>7 km/h</span>
                    <span>90 km/h</span>
                  </>
                ) : (
                  <>
                    <span>1:00 min/km</span>
                    <span>12:00 min/km</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Pace/Speed Variation Slider */}
            <div className="max-w-full">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {runDetails.activityType === 'Bike' ? 'Speed' : 'Pace'} Variation: {runDetails.paceVariation}%
              </label>
              <input
                type="range"
                min="0"
                max="80"
                step="1"
                value={runDetails.paceVariation}
                onChange={(e) => setRunDetails(prev => ({ ...prev, paceVariation: parseInt(e.target.value) }))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0% (Constant)</span>
                <span>80% (High variation)</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {runDetails.paceVariation === 0 ? 
                  `Constant ${runDetails.activityType === 'Bike' ? 'speed' : 'pace'} throughout the ${runDetails.activityType === 'Bike' ? 'ride' : 'run'} (most efficient)` :
                  runDetails.activityType === 'Bike' ?
                    `Natural speed variation of ±${(paceToSpeed(runDetails.pace) * runDetails.paceVariation / 100).toFixed(1)} km/h` :
                    `Natural pace variation of ±${Math.round(runDetails.pace * runDetails.paceVariation / 100 * 60)}s per km`
                }
              </div>
            </div>
          </div>
        )}

            {/* Heart Rate Controls Section - moved above pace breakdown */}
            <div className="bg-white p-4 rounded-lg shadow-sm space-y-4 max-w-full overflow-hidden">
        {/* Heart Rate Toggle */}
        <div className="flex items-center space-x-3">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={runDetails.heartRateEnabled}
              onChange={(e) => setRunDetails(prev => ({ ...prev, heartRateEnabled: e.target.checked }))}
              className="sr-only"
            />
            <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              runDetails.heartRateEnabled ? 'bg-orange-500' : 'bg-gray-300'
            }`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                runDetails.heartRateEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </div>
            <span className="ml-2 text-sm font-medium text-gray-700">Include Heart Rate Data</span>
          </label>
        </div>
    
        {/* Heart Rate Slider */}
        {runDetails.heartRateEnabled && (
          <div className="max-w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Average Heart Rate: {runDetails.avgHeartRate} bpm
            </label>
            <input
              type="range"
              min="80"
              max="220"
              step="1"
              value={runDetails.avgHeartRate}
              onChange={(e) => setRunDetails(prev => ({ ...prev, avgHeartRate: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>80 bpm</span>
              <span>220 bpm</span>
            </div>
          </div>
        )}
    
        {/* Heart Rate Variability */}
        {runDetails.heartRateEnabled && (
          <div className="max-w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heart Rate Variability: ±{runDetails.heartRateVariability} bpm
            </label>
            <input
              type="range"
              min="1"
              max="40"
              step="1"
              value={runDetails.heartRateVariability}
              onChange={(e) => setRunDetails(prev => ({ ...prev, heartRateVariability: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 bpm</span>
              <span>40 bpm</span>
            </div>
          </div>
        )}
      </div>

      {/* Pace per KM Breakdown */}
      {runDetails.distance > 0 && (
        <div className="bg-white rounded-lg p-4 shadow-sm max-w-full overflow-hidden">
          <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center">
            <span className="mr-2">📊</span>
            {runDetails.activityType === 'Bike' ? 'Speed' : 'Pace'} per Kilometer
          </h3>
          <div className="max-h-64 overflow-y-auto">
            {/* Header */}
            <div className="grid grid-cols-4 gap-2 text-sm font-semibold text-gray-600 mb-3 pb-2 border-b-2 border-gray-200 bg-gray-50 p-2 rounded-t">
              <div className="text-center">KM</div>
              <div className="text-center">{runDetails.activityType === 'Bike' ? 'Speed (km/h)' : 'Pace (min/km)'}</div>
              <div className="text-center">Elevation</div>
              {runDetails.heartRateEnabled && <div className="text-center">Heart Rate</div>}
            </div>
            
            {/* Data Rows */}
            <div className="space-y-1">
              {(() => {
                // Calculate km-specific paces based on elevation changes
                const calculateKmPaces = (basePace, paceVariability, kmElevationChanges) => {
                  const kmCount = Math.ceil(runDetails.distance);
                  const kmPaces = {};
                  const adjustments = [];
                  
                  // Determine if we're working with bike activity
                  const isBike = runDetails.activityType === 'Bike';
                  const baseValue = isBike ? paceToSpeed(basePace) : basePace; // Convert to speed for bikes
                  
                  // First pass: calculate all adjustments
                  for (let i = 0; i < kmCount; i++) {
                    const elevationChange = kmElevationChanges[i] || 0;
                    
                    // Base adjustment based on elevation
                    let adjustment = 0;
                    if (elevationChange > 10) {
                      // Uphill
                      if (isBike) {
                        // For bikes: reduce speed
                        adjustment = -Math.min(8.0, elevationChange * 0.06); // Reduce speed
                      } else {
                        // For running: slower pace (increase time)
                        adjustment = Math.min(2.0, elevationChange * 0.015);
                      }
                    } else if (elevationChange < -10) {
                      // Downhill
                      if (isBike) {
                        // For bikes: increase speed
                        adjustment = Math.max(-4.0, -elevationChange * 0.04); // Increase speed
                      } else {
                        // For running: faster pace (decrease time)
                        adjustment = Math.max(-0.8, elevationChange * 0.008);
                      }
                    }
                    
                    // Add some natural variation
                    const sineVariation = Math.sin((i / kmCount) * Math.PI * 4) * (isBike ? 1.0 : 0.2);
                    const randomVariation = (Math.random() - 0.5) * (isBike ? 1.5 : 0.3);
                    const naturalVariation = sineVariation + randomVariation;
                    
                    // Combine elevation and natural variation
                    const totalVariation = adjustment + naturalVariation;
                    
                    // Scale by pace variability (0% = no variation, 100% = full variation)
                    const scaledAdjustment = totalVariation * (paceVariability / 100);
                    
                    adjustments.push(scaledAdjustment);
                  }
                  
                  // Calculate average adjustment to center around target value
                  const avgAdjustment = adjustments.reduce((sum, adj) => sum + adj, 0) / adjustments.length;
                  
                  // Second pass: apply centered adjustments
                  for (let i = 0; i < kmCount; i++) {
                    const centeredAdjustment = adjustments[i] - avgAdjustment;
                    
                    if (isBike) {
                      // For bikes: work with speed, then convert back to pace for storage
                      const adjustedSpeed = Math.max(5.0, Math.min(50.0, baseValue + centeredAdjustment));
                      const kmPace = speedToPace(adjustedSpeed); // Convert back to pace for storage
                      kmPaces[i] = kmPace;
                    } else {
                      // For running: work with pace directly
                      const kmPace = Math.max(3.0, Math.min(12.0, baseValue + centeredAdjustment));
                      kmPaces[i] = kmPace;
                    }
                  }
                  
                  return kmPaces;
                };
                
                // Calculate the km-specific paces using the pace variation slider value
                const calculatedKmPaces = calculateKmPaces(runDetails.pace, runDetails.paceVariation, kmElevationChanges);
                
                return Array.from({ length: Math.ceil(runDetails.distance) }, (_, i) => {
                  const km = i + 1;
                  const elevationChange = kmElevationChanges[i] || 0;
                  const kmPace = calculatedKmPaces[i] || runDetails.pace;
                  const heartRate = runDetails.heartRateEnabled ? (kmHeartRates[i] || runDetails.avgHeartRate) : null;
                
                  return (
                    <div key={km} className={`grid grid-cols-4 gap-2 text-sm py-2 px-2 rounded transition-colors hover:bg-gray-50 ${
                      km <= runDetails.distance ? 'text-gray-800 bg-white' : 'text-gray-400 bg-gray-50'
                    } border border-gray-100`}>
                      <div className="font-semibold text-center text-blue-600">#{km}</div>
                      <div className="text-center font-mono font-medium">{getPaceSpeedLabel(runDetails.activityType, kmPace)}</div>
                      <div className={`text-center font-medium ${
                        elevationChange > 10 ? 'text-red-600 bg-red-50' : 
                        elevationChange < -10 ? 'text-green-600 bg-green-50' : 'text-gray-600'
                      } rounded px-1`}>
                        {elevationChange > 0 ? '↗️ +' : elevationChange < 0 ? '↘️ ' : '➡️ '}{Math.round(Math.abs(elevationChange))}m
                      </div>
                      {runDetails.heartRateEnabled && (
                        <div className="text-center font-medium text-red-500 bg-red-50 rounded px-1">
                          ❤️ {Math.round(heartRate)}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>
          
          {/* Footer Note */}
          <div className="text-xs text-gray-500 mt-3 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
            <span className="font-medium">💡 Note:</span> Pace adjusts based on elevation changes and natural variation
          </div>
        </div>
      )}

      {/* Activity Details Form */}
      <div className="bg-white rounded-lg p-4">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">Activity Details</h3>

        {/* Activity Name */}
        <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
        Activity Name
        </label>
        <input
        type="text"
        value={runDetails.name}
        onChange={(e) => setRunDetails(prev => ({ ...prev, name: e.target.value }))}
        placeholder="Enter activity name"
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        </div>

        {/* Date and Start Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
        Date
        </label>
        <input
        type="date"
        value={runDetails.date}
        onChange={(e) => setRunDetails(prev => ({ ...prev, date: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        </div>
        <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
        Start Time
        </label>
        <input
        type="time"
        value={runDetails.startTime}
        onChange={(e) => setRunDetails(prev => ({ ...prev, startTime: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        </div>
        </div>

        {/* Description */}
        <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
        Description
        </label>
        <textarea
        value={runDetails.description}
        onChange={(e) => setRunDetails(prev => ({ ...prev, description: e.target.value }))}
        placeholder="Add a description for your activity..."
        rows={3}
        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
        />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-lg p-4 space-y-3">
        {/* Save Route button */}
        <button 
          onClick={saveRoute}
          disabled={!routeCoordinates || routeCoordinates.length === 0}
          className="w-full font-semibold py-3 px-3 rounded-md transition-colors bg-green-500 hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white flex items-center justify-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>Save Route</span>
        </button>

        {/* Download GPX Button */}
        <button 
          onClick={handleCreateRun}
          disabled={isGenerating || routeCoordinates.length < 2}
          className={`w-full font-semibold py-3 px-3 rounded-md transition-colors flex items-center justify-center ${
            isGenerating || routeCoordinates.length < 2
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-orange-500 hover:bg-orange-600 text-white'
          }`}
        >
          {isGenerating ? 'Generating GPX...' : 'Download GPX'}
        </button>
      </div>
    </div>
  );
  };

export default RunDetailsPanel;