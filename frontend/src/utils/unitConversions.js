// Distance conversions
export const kmToMiles = (km) => km * 0.621371;
export const milesToKm = (miles) => miles * 1.60934;

// Speed conversions
export const kmhToMph = (kmh) => kmh * 0.621371;
export const mphToKmh = (mph) => mph * 1.60934;

// Pace conversions (min/km to min/mile)
export const paceKmToMile = (paceKm) => paceKm * 1.60934;
export const paceMileToKm = (paceMile) => paceMile / 1.60934;

export const mToFeet = (meters) => meters * 3.28084;
export const feetToM = (feet) => feet * 0.3048;

// Format distance with unit
export const formatDistance = (distance, unit) => {
  const value = unit === 'miles' ? kmToMiles(distance) : distance;
  return `${value.toFixed(2)} ${unit}`;
};

export const formatElevation = (elevation, unit) => {
  if (unit === 'miles') {
    return `${Math.round(mToFeet(elevation))} ft`;
  }
  return `${Math.round(elevation)} m`;
};

export const formatSpeed = (speed, unit) => {
  if (unit === 'miles') {
    return `${speed.toFixed(1)} mph`;
  }
  return `${speed.toFixed(1)} km/h`;
};

// Format pace with unit
export const formatPace = (pace, unit, activityType) => {
  if (activityType === 'Bike') {
    const speed = 60 / pace;
    const displaySpeed = unit === 'miles' ? kmhToMph(speed) : speed;
    return `${displaySpeed.toFixed(1)} ${unit === 'miles' ? 'mph' : 'km/h'}`;
  } else {
    const displayPace = unit === 'miles' ? paceKmToMile(pace) : pace;
    return `${displayPace.toFixed(1)} min/${unit === 'miles' ? 'mi' : 'km'}`;
  }
};

/* export const formatPace = (pace, unit) => {
  if (unit === 'miles') {
    const milePace = pace * 1.60934; // Convert min/km to min/mile
    const minutes = Math.floor(milePace);
    const seconds = Math.round((milePace - minutes) * 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')} /mi`;
  }
  const minutes = Math.floor(pace);
  const seconds = Math.round((pace - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')} /km`;
}; */