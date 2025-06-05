// Open-Elevation API functions
export const elevationCache = new Map();

export const sampleCoordinates = (route, maxPoints = 50) => {
  if (route.length <= maxPoints) return route;
  
  const step = Math.floor(route.length / maxPoints);
  const sampled = [];
  
  for (let i = 0; i < route.length; i += step) {
    sampled.push(route[i]);
  }
  
  // Always include the last point
  if (sampled[sampled.length - 1] !== route[route.length - 1]) {
    sampled.push(route[route.length - 1]);
  }
  
  return sampled;
};

export const getOpenElevation = async (coordinates) => {
  const cacheKey = coordinates.map(c => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`).join('|');
  
  if (elevationCache.has(cacheKey)) {
    return elevationCache.get(cacheKey);
  }
  
  try {
    const locations = coordinates.map(coord => `${coord.lat},${coord.lng}`).join('|');
    const response = await fetch(
      `https://api.open-elevation.com/api/v1/lookup?locations=${locations}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locations: coordinates.map(coord => ({ latitude: coord.lat, longitude: coord.lng }))
        })
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const elevationData = data.results.map(result => result.elevation);
    
    elevationCache.set(cacheKey, elevationData);
    return elevationData;
  } catch (error) {
    console.error('Open-Elevation API error:', error);
    throw error;
  }
};

export const calculateElevationGain = (elevationData) => {
  let totalGain = 0;
  for (let i = 1; i < elevationData.length; i++) {
    const diff = elevationData[i] - elevationData[i - 1];
    if (diff > 0) {
      totalGain += diff;
    }
  }
  return Math.round(totalGain);
};

export const interpolateElevation = (elevationData, targetLength) => {
  if (elevationData.length === targetLength) return elevationData;
  
  const interpolated = [];
  const ratio = (elevationData.length - 1) / (targetLength - 1);
  
  for (let i = 0; i < targetLength; i++) {
    const index = i * ratio;
    const lowerIndex = Math.floor(index);
    const upperIndex = Math.ceil(index);
    
    if (lowerIndex === upperIndex) {
      interpolated.push(elevationData[lowerIndex]);
    } else {
      const weight = index - lowerIndex;
      const interpolatedValue = elevationData[lowerIndex] * (1 - weight) + elevationData[upperIndex] * weight;
      interpolated.push(interpolatedValue);
    }
  }
  
  return interpolated;
};

export const getKmElevationChanges = (elevationProfile, distance, originalElevationData) => {
  const kmCount = Math.ceil(distance);
  const kmElevationChanges = [];
  
  // Use original sampled data instead of interpolated profile
  if (originalElevationData && originalElevationData.length > 1) {
    const pointsPerKm = originalElevationData.length / distance;
    
    for (let i = 0; i < kmCount; i++) {
      const startIdx = Math.floor(i * pointsPerKm);
      let endIdx;
      
      // For the last kilometer, use the actual end of the route
      if (i === kmCount - 1) {
        endIdx = originalElevationData.length - 1;
      } else {
        endIdx = Math.min(Math.floor((i + 1) * pointsPerKm), originalElevationData.length - 1);
      }
      
      if (startIdx < originalElevationData.length && endIdx < originalElevationData.length && startIdx !== endIdx) {
        const elevationChange = originalElevationData[endIdx] - originalElevationData[startIdx];
        kmElevationChanges.push(Math.round(elevationChange));
      } else {
        kmElevationChanges.push(0);
      }
    }
  } else {
    // Fallback to current interpolated method if original data not available
    const pointsPerKm = elevationProfile.length / distance;
    
    for (let i = 0; i < kmCount; i++) {
      const startIdx = Math.floor(i * pointsPerKm);
      let endIdx;
      
      // For the last kilometer, use the actual end of the route
      if (i === kmCount - 1) {
        endIdx = elevationProfile.length - 1;
      } else {
        endIdx = Math.floor((i + 1) * pointsPerKm);
      }
      
      if (startIdx < elevationProfile.length && endIdx < elevationProfile.length && startIdx !== endIdx) {
        const elevationChange = elevationProfile[endIdx] - elevationProfile[startIdx];
        kmElevationChanges.push(Math.round(elevationChange));
      } else {
        kmElevationChanges.push(0);
      }
    }
  }
  
  return kmElevationChanges;
};