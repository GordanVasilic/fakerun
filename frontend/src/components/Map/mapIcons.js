import L from 'leaflet';

export const startIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background-color: #22c55e;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export const endIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background-color: #ef4444;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

export const waypointIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `
    <div style="
      background-color: #3b82f6;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      cursor: pointer;
    "></div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});