import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';

const DataVisualization = ({ route, runDetails, heartRateDetails }) => {
  // Default values if runDetails is not yet available
  const defaultRunDetails = {
    pace: 6.0, // Changed from avgPace to pace
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

    const totalDistance = details.distance;
    const stepSize = 0.2; // Generate data points every 0.2km for smoother curves
    const numPoints = Math.ceil(totalDistance / stepSize) + 1;
    const labels = [];
    const paceData = [];
    
    for (let i = 0; i < numPoints; i++) {
      const distanceAlongRoute = i * stepSize;
      
      // Only show labels for round kilometers, empty string for intermediate points
      const roundedDistance = Math.round(distanceAlongRoute);
      if (Math.abs(distanceAlongRoute - roundedDistance) < 0.1) {
        labels.push(roundedDistance.toString());
      } else {
        labels.push(''); // Empty label for intermediate points
      }
      
      if (i === 0) {
        paceData.push(details.pace); // Changed from details.avgPace to details.pace
      } else {
        // Generate realistic pace variation around target pace
        const variation = (Math.sin(i * 0.3) * 0.3) + (Math.random() - 0.5) * 0.4;
        const pace = Math.max(3.0, Math.min(12.0, details.pace + variation)); // Changed from details.avgPace to details.pace
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

    const totalDistance = details.distance;
    const stepSize = 0.1; // Generate data points every 0.1km for very smooth elevation curves
    const numPoints = Math.ceil(totalDistance / stepSize) + 1;
    const labels = [];
    let elevationData = [];
    let currentElevation = 100; // Starting elevation
    
    for (let i = 0; i < numPoints; i++) {
      const distanceAlongRoute = i * stepSize;
      
      // Only show labels for round kilometers, empty string for intermediate points
      const roundedDistance = Math.round(distanceAlongRoute);
      if (Math.abs(distanceAlongRoute - roundedDistance) < 0.05) {
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
          text: 'Distance (km)'
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(value, index, values) {
            const label = this.getLabelForValue(value);
            return label === '' ? '' : label;
          }
        }
      },
      y: {
        grid: {
          color: '#e5e7eb',
        },
        title: {
          display: true,
          text: 'Pace (min/km)'
        },
        beginAtZero: false,
        reverse: true, // Invert y-axis: faster pace (lower values) at top
        min: (() => {
          const data = paceData.datasets[0].data;
          if (data && data.length > 0) {
            return Math.max(2, Math.min(...data) - 0.5);
          }
          return 2;
        })(),
        max: (() => {
          const data = paceData.datasets[0].data;
          if (data && data.length > 0) {
            return Math.max(...data) + 0.5;
          }
          return 12;
        })(),
        ticks: {
          stepSize: 0.5,
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
            return `Pace: ${context.parsed.y.toFixed(1)} min/km`;
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
          text: 'Distance (km)'
        },
        ticks: {
          maxTicksLimit: 10,
          callback: function(value, index, values) {
            const label = this.getLabelForValue(value);
            return label === '' ? '' : label;
          }
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
          {/* Pace Profile */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Pace Profile</h3>
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