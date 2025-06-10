import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { kmToMiles, kmhToMph, formatDistance, formatPace } from '../../utils/unitConversions';

const DataVisualization = ({ route, runDetails, heartRateDetails, distanceUnit = 'km'  }) => {
  // Default values if runDetails is not yet available
  const defaultRunDetails = {
    pace: 6.0, // Changed from avgPace to pace
    elevationGain: 50,
    distance: 5.0,
    duration: 1800,
    activityType: 'Run', // Add missing activityType
    paceVariation: 0 // Add missing paceVariation
  };
  // Convert distance values based on unit preference
  const convertDistance = (distance) => {
    return distanceUnit === 'miles' ? kmToMiles(distance) : distance;
  };
   // Convert speed values based on unit preference
   const convertSpeed = (speed) => {
    return distanceUnit === 'miles' ? kmhToMph(speed) : speed;
  };
  const details = runDetails || defaultRunDetails;
      // Helper function to convert pace to speed
  const paceToSpeed = (pace) => {
    return 60 / pace; // Convert min/km to km/h
      };
  
  // Generate pace data based on route with elevation correlation
// Generate pace data based on route with elevation correlation
const generatePaceData = () => {
  if (!route || route.length < 2) {
    return {
      labels: ['0'],
      datasets: [{
        label: details.activityType === 'Bike' 
          ? `Speed (${distanceUnit === 'miles' ? 'mph' : 'km/h'})` 
          : `Pace (min/${distanceUnit === 'miles' ? 'mi' : 'km'})`,
        data: [details.activityType === 'Bike' ? paceToSpeed(details.pace) : details.pace],
        borderColor: '#F97316',
        backgroundColor: 'rgba(249, 115, 22, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };
  }

  const totalDistance = runDetails.distance;
  const stepSize = 0.2;
  const numPoints = Math.ceil(totalDistance / stepSize) + 1;
  const labels = [];
  const paceData = [];
  
  // Check if pace variation is enabled
  const paceVariationEnabled = runDetails.paceVariation > 0;
  
  // First generate elevation data to correlate with pace (only if variation is enabled)
  const elevationData = [];
  let currentElevation = 100;
  
  if (paceVariationEnabled) {
    // Generate elevation profile with varied patterns for different route segments
    for (let i = 0; i < numPoints; i++) {
      const progressRatio = i / (numPoints - 1);
      const baseElevationGain = runDetails.elevationGain * progressRatio;
      
      // Use different hill variation formulas for different segments of the route
      let hillVariation = 0;
      
      if (progressRatio < 0.25) {
        // First 25%: Gentle rolling hills with longer wavelength
        hillVariation = Math.sin(i * 0.15) * 12 + Math.cos(i * 0.08) * 8;
      } else if (progressRatio < 0.5) {
        // 25-50%: More varied terrain with multiple frequencies
        hillVariation = Math.sin(i * 0.25) * 18 + Math.sin(i * 0.12) * 10 + Math.cos(i * 0.18) * 6;
      } else if (progressRatio < 0.75) {
        // 50-75%: Steeper, more dramatic changes
        hillVariation = Math.sin(i * 0.35) * 20 + Math.cos(i * 0.22) * 15 + Math.sin(i * 0.45) * 8;
      } else {
        // Final 25%: Gradual changes, possibly finishing on downhill
        hillVariation = Math.sin(i * 0.18) * 14 + Math.cos(i * 0.28) * 12 - (progressRatio - 0.75) * 40;
      }
      
      // Add some random noise for natural variation
      const noise = (Math.random() - 0.5) * 6;
      
      // Combine all elevation factors
      currentElevation = 100 + baseElevationGain + hillVariation + noise;
      elevationData.push(Math.max(50, currentElevation));
    }
  }
  
  for (let i = 0; i < numPoints; i++) {
    const distanceAlongRoute = i * stepSize;
    
    // Generate labels (same as before)
    const roundedDistance = Math.round(distanceAlongRoute);
    if (Math.abs(distanceAlongRoute - roundedDistance) < 0.1) {
      labels.push(roundedDistance.toString());
    } else {
      labels.push('');
    }
    
    if (i === 0 || !paceVariationEnabled) {
      // First point or no variation: use base pace/speed
      const baseValue = runDetails.activityType === 'Bike' ? paceToSpeed(runDetails.pace) : runDetails.pace;
      paceData.push(baseValue);
    } else {
      // Calculate elevation change from previous point
      const elevationChange = elevationData[i] - elevationData[i - 1];
      const distance = stepSize * 1000; // Convert to meters
      const gradient = elevationChange / distance; // Grade as decimal (e.g., 0.05 = 5%)
      
      // Base pace/speed
      const basePace = runDetails.pace;
      const baseSpeed = paceToSpeed(basePace);
      
      // Calculate pace adjustment based on gradient
      let paceAdjustment = 0;
      let speedAdjustment = 0;
      
      if (gradient > 0) {
        // Uphill: add time to pace, reduce speed
        paceAdjustment = gradient * 100 * 0.15; // 15 seconds per km per 1% grade
        speedAdjustment = -gradient * 100 * 2; // Reduce speed by 2 km/h per 1% grade
      } else if (gradient < 0) {
        // Downhill: reduce time from pace, increase speed
        paceAdjustment = gradient * 100 * 0.08; // 8 seconds per km per 1% grade (negative)
        speedAdjustment = -gradient * 100 * 1.5; // Increase speed by 1.5 km/h per 1% grade
      }
      
      // Add random variation for realism
      const randomVariation = (Math.random() - 0.5) * 0.1;
      
      // Scale adjustments by pace variation percentage
      const variationScale = runDetails.paceVariation / 100;
      const scaledPaceAdjustment = paceAdjustment * variationScale;
      const scaledSpeedAdjustment = speedAdjustment * variationScale;
      const scaledRandomVariation = randomVariation * variationScale;
      
      if (runDetails.activityType === 'Bike') {
        // For bikes, work with speed
        const adjustedSpeed = baseSpeed + scaledSpeedAdjustment + scaledRandomVariation;
        const finalSpeed = Math.max(5.0, Math.min(50.0, adjustedSpeed));
        paceData.push(finalSpeed);
      } else {
        // For running, work with pace
        const adjustedPace = basePace + scaledPaceAdjustment + scaledRandomVariation;
        const finalPace = Math.max(3.0, Math.min(12.0, adjustedPace));
        paceData.push(finalPace);
      }
    }
  }

  return {
    labels,
    datasets: [{
      label: runDetails.activityType === 'Bike' ? 'Speed (km/h)' : 'Pace (min/km)',
      data: paceData,
      borderColor: '#F97316',
      backgroundColor: 'rgba(249, 115, 22, 0.1)',
      tension: 0.4,
      fill: true,
    }]
  };
};

    

  // Generate elevation data based on route
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

  const totalDistance = details.distance;
  const stepSize = 0.2; // Match pace and heart rate charts
  const numPoints = Math.ceil(totalDistance / stepSize) + 1;
  const labels = [];
  let elevationData = [];
  let currentElevation = 100;
  
  for (let i = 0; i < numPoints; i++) {
    const distanceAlongRoute = i * stepSize;
    
    // Generate labels - same logic as pace and heart rate charts
    const roundedDistance = Math.round(distanceAlongRoute);
    if (Math.abs(distanceAlongRoute - roundedDistance) < 0.1) {
      labels.push(roundedDistance.toString());
    } else {
      labels.push(''); // Empty label for intermediate points
    }
  }
  
  // Use real elevation data if available
  if (runDetails && runDetails.elevationProfile && runDetails.elevationProfile.length > 0) {
    // Sample the elevation data to match the number of chart points
    const elevationProfile = runDetails.elevationProfile;
    
    if (elevationProfile.length === numPoints) {
      elevationData = elevationProfile;
    } else {
      // Interpolate elevation data to match chart points
      for (let i = 0; i < numPoints; i++) {
        const ratio = (elevationProfile.length - 1) * i / (numPoints - 1);
        const lowerIndex = Math.floor(ratio);
        const upperIndex = Math.ceil(ratio);
        
        if (lowerIndex === upperIndex) {
          elevationData.push(elevationProfile[lowerIndex]);
        } else {
          const weight = ratio - lowerIndex;
          const interpolatedValue = elevationProfile[lowerIndex] * (1 - weight) + 
                                   elevationProfile[upperIndex] * weight;
          elevationData.push(interpolatedValue);
        }
      }
    }
  } else {
    // Fallback to simulation
    for (let i = 0; i < numPoints; i++) {
      const progressRatio = i / (numPoints - 1);
      const baseElevationGain = details.elevationGain * progressRatio;
      const hillVariation = Math.sin(i * 0.4) * 15;
      const noise = (Math.random() - 0.5) * 5;
      currentElevation = 100 + baseElevationGain + hillVariation + noise;
      elevationData.push(Math.max(50, currentElevation));
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

  // Generate heart rate data based on calculated heart rates
  const generateHeartRateData = () => {
    console.log('Generating heart rate data:');
    console.log('heartRateDetails:', heartRateDetails);
    
    if (!route || route.length < 2 || !heartRateDetails || !heartRateDetails.heartRateEnabled) {
      console.log('Heart rate data generation skipped - conditions not met');
      return {
        labels: ['0'],
        datasets: [{
          label: 'Heart Rate',
          data: [heartRateDetails?.avgHeartRate || 140],
          borderColor: '#DC2626',
          backgroundColor: 'rgba(220, 38, 38, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      };
    }

    const totalDistance = details.distance;
    const stepSize = 0.2; // Match the pace chart step size
    const numPoints = Math.ceil(totalDistance / stepSize) + 1;
    const labels = [];
    const heartRateData = [];
    
    for (let i = 0; i < numPoints; i++) {
      const distanceAlongRoute = i * stepSize;
      
      // Only show labels for round kilometers, empty string for intermediate points
      const roundedDistance = Math.round(distanceAlongRoute);
      if (Math.abs(distanceAlongRoute - roundedDistance) < 0.1) {
        labels.push(roundedDistance.toString());
      } else {
        labels.push(''); // Empty label for intermediate points
      }
      
      // Calculate which kilometer this point belongs to for heart rate lookup
      const kmIndex = Math.floor(distanceAlongRoute);
      const heartRate = (heartRateDetails.kmHeartRates && heartRateDetails.kmHeartRates[kmIndex]) || heartRateDetails.avgHeartRate || 140;
      heartRateData.push(heartRate);
    }
    
    console.log('Generated heart rate data:', { labels, heartRateData });
    
    return {
      labels,
      datasets: [{
        label: 'Heart Rate',
        data: heartRateData,
        borderColor: '#DC2626',
        backgroundColor: 'rgba(220, 38, 38, 0.1)',
        tension: 0.4,
        fill: true,
      }]
    };
  };
  
  // Generate chart data
  const paceData = generatePaceData();
  const elevationData = generateElevationData();
  const heartRateData = generateHeartRateData();
  
// Chart options
const paceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        display: false,
      },
      title: {
       display: true,
      text: `Distance (${distanceUnit === 'miles' ? 'mi' : 'km'})`
      }
    },
    y: {
      grid: {
        color: '#e5e7eb',
      },
      title: {
        display: true,
        text: details.activityType === 'Bike' 
        ? `Speed (${distanceUnit === 'miles' ? 'mph' : 'km/h'})` 
        : `Pace (min/${distanceUnit === 'miles' ? 'mi' : 'km'})`
      },
      beginAtZero: details.activityType === 'Bike',
      reverse: details.activityType !== 'Bike',
      min: (() => {
        const data = paceData.datasets[0].data;
        if (data && data.length > 0) {
          if (details.activityType === 'Bike') {
            return 0;
          } else {
            return Math.max(2, Math.min(...data) - 0.5);
          }
        }
        return details.activityType === 'Bike' ? 10 : 2;
      })(),
      max: (() => {
        const data = paceData.datasets[0].data;
        if (data && data.length > 0) {
          if (details.activityType === 'Bike') {
            return Math.max(...data) + 2;
          } else {
            return Math.max(...data) + 0.5;
          }
        }
        return details.activityType === 'Bike' ? 50 : 12;
      })(),
      ticks: {
        stepSize: details.activityType === 'Bike' ? 2 : 0.5,
      }
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          if (details.activityType === 'Bike') {
            return `Speed: ${context.parsed.y.toFixed(1)} ${distanceUnit === 'miles' ? 'mph' : 'km/h'}`;
          } else {
            return `Pace: ${context.parsed.y.toFixed(1)} min/${distanceUnit === 'miles' ? 'mi' : 'km'}`;
          }
        }
      }
    },
  },
};

const elevationChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: {
        display: false,
      },
      title: {
        display: true,
       text: `Distance (${distanceUnit === 'miles' ? 'mi' : 'km'})`
      }
    },
    y: {
      grid: {
        color: '#e5e7eb',
      },
      title: {
        display: true,
        text: 'Elevation (m)'
      },
      beginAtZero: true,
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      mode: 'index',
      intersect: false,
      callbacks: {
        label: function(context) {
          return `Elevation: ${Math.round(context.parsed.y)}m`;
        }
      }
    },
  },
};

  const heartRateChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        grid: {
          display: false,
        },
        title: {
          display: true,
          text: 'Kilometer'
        }
      },
      y: {
        grid: {
          color: '#e5e7eb',
        },
        title: {
          display: true,
          text: 'Heart Rate (bpm)'
        },
        beginAtZero: false,
        min: 60,
        max: 200,
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            return `Heart Rate: ${Math.round(context.parsed.y)} bpm`;
          }
        }
      },
    },
  };

  return (
    <div className="bg-white px-6 py-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Visualization</h2>
        
        <div className="space-y-8">
                    {/* Pace/Speed Profile */}
                    <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">
              {details.activityType === 'Bike' ? 'Speed Profile' : 'Pace Profile'}
            </h3>
            <div className="h-48">
              <Line data={paceData} options={paceChartOptions} />
            </div>
          </div>

          {/* Elevation Profile */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Elevation Profile</h3>
            <div className="h-48">
              <Line data={elevationData} options={elevationChartOptions} />
            </div>
          </div>

          {/* Heart Rate Profile - only show if enabled */}
          {heartRateDetails?.heartRateEnabled && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Heart Rate Profile</h3>
              <div className="h-48">
                <Line data={heartRateData} options={heartRateChartOptions} />
              </div>
            </div>
          )}
        </div>

        {/* Additional Stats */}
        <div className={`mt-8 grid grid-cols-2 ${runDetails?.heartRateEnabled ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4 text-center`}>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{details.distance.toFixed(1)}</div>
            <div className="text-sm text-gray-500">Total Distance</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">
              {(() => {
                const totalSeconds = Math.round(details.duration);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                
                if (hours > 0) {
                  return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                } else {
                  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
                }
              })()}
            </div>
            <div className="text-sm text-gray-500">Total Time</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{Math.floor(details.pace)}:{Math.round((details.pace % 1) * 60).toString().padStart(2, '0')}</div>
            <div className="text-sm text-gray-500">Avg Pace</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-2xl font-bold text-gray-900">{details.elevationGain}m</div>
            <div className="text-sm text-gray-500">Elevation Gain</div>
          </div>
          {runDetails?.heartRateEnabled && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">{runDetails.avgHeartRate || 140}</div>
              <div className="text-sm text-gray-500">Avg Heart Rate</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;