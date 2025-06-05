import React, { useRef, useEffect } from 'react';

const RouteThumbnail = ({ coordinates, width = 216, height = 162 }) => {
  const canvasRef = useRef(null);

  // Add this check
  if (!coordinates || coordinates.length === 0) {
    return (
      <div 
        className="rounded bg-gray-100 flex items-center justify-center"
        style={{ width: `${width}px`, height: `${height}px` }}
      >
        <span className="text-gray-400 text-sm">No route data</span>
      </div>
    );
  }

  useEffect(() => {
    console.log('RouteThumbnail coordinates:', coordinates); // Debug log
    if (!coordinates || coordinates.length === 0) {
      console.log('No coordinates provided'); // Debug log
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Find bounds - handle both array [lat, lng] and object {lat, lng} formats
    const lats = coordinates.map(c => Array.isArray(c) ? c[0] : c.lat);
    const lngs = coordinates.map(c => Array.isArray(c) ? c[1] : c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    // Add padding
    const padding = 10;
    const drawWidth = width - 2 * padding;
    const drawHeight = height - 2 * padding;
    
    // Convert coordinates to canvas coordinates
    const toCanvasCoords = (lat, lng) => {
      const x = padding + ((lng - minLng) / (maxLng - minLng)) * drawWidth;
      const y = padding + ((maxLat - lat) / (maxLat - minLat)) * drawHeight;
      return { x, y };
    };
    
    // Draw route
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    coordinates.forEach((coord, index) => {
      // Handle both array [lat, lng] and object {lat, lng} formats
      const lat = Array.isArray(coord) ? coord[0] : coord.lat;
      const lng = Array.isArray(coord) ? coord[1] : coord.lng;
      const { x, y } = toCanvasCoords(lat, lng);
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    
    // Draw start point
    if (coordinates.length > 0) {
      const firstCoord = coordinates[0];
      const startLat = Array.isArray(firstCoord) ? firstCoord[0] : firstCoord.lat;
      const startLng = Array.isArray(firstCoord) ? firstCoord[1] : firstCoord.lng;
      const start = toCanvasCoords(startLat, startLng);
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(start.x, start.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // Draw end point
    if (coordinates.length > 1) {
      const lastCoord = coordinates[coordinates.length - 1];
      const endLat = Array.isArray(lastCoord) ? lastCoord[0] : lastCoord.lat;
      const endLng = Array.isArray(lastCoord) ? lastCoord[1] : lastCoord.lng;
      const end = toCanvasCoords(endLat, endLng);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(end.x, end.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [coordinates, width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded"
      style={{ 
        width: `${width}px`, 
        height: `${height}px`
      }}
    />
  );
};

export default RouteThumbnail;