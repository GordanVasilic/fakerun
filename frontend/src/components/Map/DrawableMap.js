import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet';
import { startIcon, endIcon, waypointIcon } from '../Map/mapIcons';
import MapTypeSelector from './MapTypeSelector';

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
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  
  // Add state for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [draggedPointIndex, setDraggedPointIndex] = useState(null);
  
  // Add state for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [pointToDelete, setPointToDelete] = useState(null);
  
  // Add state for context menu
  const [contextMenu, setContextMenu] = useState({ show: false, x: 0, y: 0, pointIndex: null });
  
  // Add state for map type
  const [mapType, setMapType] = useState({
    id: 'osm',
    name: 'Street',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  });
  
  // Add debounce state for route recalculation
  const [routeRecalcTimeout, setRouteRecalcTimeout] = useState(null);
  
  // Add state for route recalculation loading
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);
  
  // Add state for delayed loading notification
  const [delayedLoadingTimeout, setDelayedLoadingTimeout] = useState(null);
  
  // Sync local routeCoordinates with route prop when it changes (for loaded routes)
  useEffect(() => {
    if (route && route.length > 0) {
      setRouteCoordinates(route);
    } else if (route && route.length === 0) {
      setRouteCoordinates([]);
    }
  }, [route]);
  
  // Component to handle search and map centering
  const MapController = ({ center, shouldCenter }) => {
    const map = useMap();
    
    useEffect(() => {
      // Only center the map when explicitly requested (search, geolocation, initial load)
      if (center && shouldCenter) {
        map.setView(center, 15);
        setShouldCenter(false); // Reset the flag after centering
      }
    }, [center, map, shouldCenter]);
    
    return null;
  };

  // Component to handle map clicks and route building - always active
  const MapEvents = () => {
    useMapEvents({
      click: async (e) => {
        // Close context menu if open
        if (contextMenu.show) {
          closeContextMenu();
          return;
        }
        
        // Don't add points while dragging
        if (isDragging) return;
        
        const { lat, lng } = e.latlng;
        const newPoint = [lat, lng];
        
        const newClickedPoints = [...clickedPoints, newPoint];
        setClickedPoints(newClickedPoints);
        
        if (newClickedPoints.length === 1) {
          setRouteCoordinates([newPoint]);
          setRoute([newPoint]);
        } else {
          // INCREMENTAL APPROACH: Only calculate the new segment from last point to new point
          const lastPoint = clickedPoints[clickedPoints.length - 1];
          
          // Set up delayed loading notification (appears after 500ms)
          const timeoutId = setTimeout(() => {
            setIsRecalculatingRoute(true);
          }, 500);
          setDelayedLoadingTimeout(timeoutId);
          
          try {
            const newSegment = await getRoute(lastPoint, newPoint);
            
            if (newSegment && newSegment.length > 0) {
              // Append new segment to existing route (skip first point to avoid duplicate)
              const updatedRoute = [...routeCoordinates, ...newSegment.slice(1)];
              setRouteCoordinates(updatedRoute);
              setRoute(updatedRoute);
            } else {
              // If routing failed, just add the point directly
              const updatedRoute = [...routeCoordinates, newPoint];
              setRouteCoordinates(updatedRoute);
              setRoute(updatedRoute);
            }
          } finally {
            // Clear the timeout and hide loading if it was shown
            if (timeoutId) {
              clearTimeout(timeoutId);
            }
            setDelayedLoadingTimeout(null);
            setIsRecalculatingRoute(false);
          }
        }
      }
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
    setRouteCoordinates([]);
    setClickedPoints([]);
    setRoute([]);
  };

  const removeLastPoint = async () => {
    if (clickedPoints.length > 0) {
      const newClickedPoints = clickedPoints.slice(0, -1);
      setClickedPoints(newClickedPoints);
      
      if (newClickedPoints.length === 0) {
        setRouteCoordinates([]);
        setRoute([]);
      } else if (newClickedPoints.length === 1) {
        // Only one point left, just show that point
        setRouteCoordinates(newClickedPoints);
        setRoute(newClickedPoints);
      } else {
        // Instead of rebuilding from scratch, just remove the last segment
        // Find the last clicked point in the current route and truncate there
        const lastClickedPoint = newClickedPoints[newClickedPoints.length - 1];
        const currentRoute = routeCoordinates;
        
        // Find the index of the last clicked point in the current route
        let truncateIndex = -1;
        for (let i = currentRoute.length - 1; i >= 0; i--) {
          const coord = currentRoute[i];
          if (Math.abs(coord[0] - lastClickedPoint[0]) < 0.0001 && 
              Math.abs(coord[1] - lastClickedPoint[1]) < 0.0001) {
            truncateIndex = i;
            break;
          }
        }
        
        if (truncateIndex !== -1) {
          // Truncate the route at the last clicked point
          const newRoute = currentRoute.slice(0, truncateIndex + 1);
          setRouteCoordinates(newRoute);
          setRoute(newRoute);
        } else {
          // Fallback: rebuild if we can't find the point (shouldn't happen normally)
          await rebuildRouteFromClickedPoints(newClickedPoints);
        }
      }
    }
  };

  // Optimized function that only recalculates affected segments (not entire route)
  const recalculateAffectedSegmentsOptimized = async (changedIndex, newClickedPoints) => {
    if (newClickedPoints.length <= 1) {
      setRouteCoordinates(newClickedPoints);
      setRoute(newClickedPoints);
      return;
    }

    // Get current route coordinates
    let newRouteCoordinates = [...routeCoordinates];
    
    // Find the segments that need to be recalculated
    const segmentsToRecalculate = [];
    
    // If not the first point, recalculate segment from previous point
    if (changedIndex > 0) {
      segmentsToRecalculate.push({
        from: changedIndex - 1,
        to: changedIndex,
        fromPoint: newClickedPoints[changedIndex - 1],
        toPoint: newClickedPoints[changedIndex]
      });
    }
    
    // If not the last point, recalculate segment to next point
    if (changedIndex < newClickedPoints.length - 1) {
      segmentsToRecalculate.push({
        from: changedIndex,
        to: changedIndex + 1,
        fromPoint: newClickedPoints[changedIndex],
        toPoint: newClickedPoints[changedIndex + 1]
      });
    }

    // Recalculate only affected segments in parallel
    const segmentPromises = segmentsToRecalculate.map(async (segment) => {
      try {
        const routeSegment = await getRoute(segment.fromPoint, segment.toPoint);
        return {
          ...segment,
          coordinates: routeSegment && routeSegment.length > 0 ? routeSegment : [segment.fromPoint, segment.toPoint]
        };
      } catch (error) {
        return {
          ...segment,
          coordinates: [segment.fromPoint, segment.toPoint]
        };
      }
    });

    const calculatedSegments = await Promise.all(segmentPromises);
    
    // Rebuild only the affected parts of the route
    let rebuiltRoute = [];
    
    // Build route by going through each clicked point
    for (let i = 0; i < newClickedPoints.length; i++) {
      if (i === 0) {
        // First point
        rebuiltRoute.push(newClickedPoints[i]);
      } else {
        // Find the calculated segment for this connection
        const segment = calculatedSegments.find(s => s.from === i - 1 && s.to === i);
        if (segment) {
          // Use the calculated route segment (skip first point to avoid duplication)
          rebuiltRoute = [...rebuiltRoute, ...segment.coordinates.slice(1)];
        } else {
          // This segment wasn't recalculated, preserve existing route if possible
          // For now, add the point directly (this maintains the route structure)
          rebuiltRoute.push(newClickedPoints[i]);
        }
      }
    }
    
    setRouteCoordinates(rebuiltRoute);
    setRoute(rebuiltRoute);
  };

  // Function to handle waypoint drag
  const handleWaypointDrag = async (index, newPosition) => {
    const newClickedPoints = [...clickedPoints];
    newClickedPoints[index] = [newPosition.lat, newPosition.lng];
    setClickedPoints(newClickedPoints);
    
    // Use the complete route recalculation for proper routing
    await recalculateAffectedSegments(index, newClickedPoints);
  };

  // New optimized function that recalculates all segments properly
  const recalculateAffectedSegments = async (changedIndex, newClickedPoints) => {
    if (newClickedPoints.length <= 1) {
      setRouteCoordinates(newClickedPoints);
      setRoute(newClickedPoints);
      return;
    }

    // Show loading indicator
    setIsRecalculatingRoute(true);

    try {
      // Calculate all segments between consecutive points
      const segmentPromises = [];
      for (let i = 0; i < newClickedPoints.length - 1; i++) {
        segmentPromises.push(
          getRoute(newClickedPoints[i], newClickedPoints[i + 1])
            .then(routeSegment => ({
              index: i,
              coordinates: routeSegment && routeSegment.length > 0 ? routeSegment : [newClickedPoints[i], newClickedPoints[i + 1]]
            }))
            .catch(() => ({
              index: i,
              coordinates: [newClickedPoints[i], newClickedPoints[i + 1]]
            }))
        );
      }

      // Wait for all segments to be calculated
      const calculatedSegments = await Promise.all(segmentPromises);
      
      // Build the complete route
      let fullRoute = [newClickedPoints[0]];
      
      for (const segment of calculatedSegments) {
        // Add the route segment (skip first point to avoid duplication)
        fullRoute = [...fullRoute, ...segment.coordinates.slice(1)];
      }
      
      setRouteCoordinates(fullRoute);
      setRoute(fullRoute);
    } finally {
      // Hide loading indicator
      setIsRecalculatingRoute(false);
    }
  };

  // Helper function to rebuild route from clicked points
  const rebuildRouteFromClickedPoints = async (points) => {
    if (points.length === 0) {
      setRouteCoordinates([]);
      setRoute([]);
      return;
    }
    
    if (points.length === 1) {
      setRouteCoordinates(points);
      setRoute(points);
      return;
    }

    // Don't show immediate loading here - let the caller handle it
    // This allows for delayed loading notification
    
    try {
      // Create all route segment requests in parallel
      const routePromises = [];
      for (let i = 1; i < points.length; i++) {
        routePromises.push(
          getRoute(points[i-1], points[i]).catch(error => {
            console.log(`Route segment ${i-1} to ${i} failed:`, error);
            return null; // Return null for failed segments
          })
        );
      }
      
      // Wait for all route segments to complete in parallel
      const routeSegments = await Promise.all(routePromises);
      
      // Build the full route from the segments
      let fullRoute = [points[0]];
      
      for (let i = 0; i < routeSegments.length; i++) {
        const routeSegment = routeSegments[i];
        if (routeSegment && routeSegment.length > 0) {
          // Skip the first point of each segment to avoid duplicates
          fullRoute = [...fullRoute, ...routeSegment.slice(1)];
        } else {
          // If routing failed, just add the destination point directly
          fullRoute = [...fullRoute, points[i + 1]];
        }
      }
      
      setRouteCoordinates(fullRoute);
      setRoute(fullRoute);
    } catch (error) {
      console.error('Error rebuilding route:', error);
    }
  };

  // Function to delete a specific point
  const deletePoint = async (index) => {
    if (clickedPoints.length <= 1) {
      // If only one point or no points, clear everything
      clearRoute();
      return;
    }
    
    const newClickedPoints = clickedPoints.filter((_, i) => i !== index);
    setClickedPoints(newClickedPoints);
    
    // Set up delayed loading notification for deletion
    const timeoutId = setTimeout(() => {
      setIsRecalculatingRoute(true);
    }, 500);
    setDelayedLoadingTimeout(timeoutId);
    
    try {
      // Rebuild the route with the remaining points
      await rebuildRouteFromClickedPoints(newClickedPoints);
    } finally {
      // Clear the timeout and hide loading
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      setDelayedLoadingTimeout(null);
      setIsRecalculatingRoute(false);
    }
  };

  // Function to handle context menu delete action
  const handleContextMenuDelete = () => {
    if (contextMenu.pointIndex !== null) {
      // Delete immediately without confirmation
      deletePoint(contextMenu.pointIndex);
    }
    setContextMenu({ show: false, x: 0, y: 0, pointIndex: null });
  };

  // Function to close context menu
  const closeContextMenu = () => {
    setContextMenu({ show: false, x: 0, y: 0, pointIndex: null });
  };

  // Function to show delete confirmation modal
  const showDeleteConfirmation = (index) => {
    setPointToDelete(index);
    setShowDeleteModal(true);
  };

  // Function to handle delete confirmation
  const confirmDelete = () => {
    if (pointToDelete !== null) {
      deletePoint(pointToDelete);
    }
    setShowDeleteModal(false);
    setPointToDelete(null);
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setPointToDelete(null);
  };

  // Enhanced draggable marker with immediate visual feedback
  const createDraggableMarker = (coord, index, icon) => {
    const isDraggedPoint = draggedPointIndex === index;
    
    return (
      <Marker 
        key={`draggable-${index}`} 
        position={coord} 
        icon={icon}
        draggable={true}
        eventHandlers={{
          dragstart: () => {
            setIsDragging(true);
            setDraggedPointIndex(index);
          },
          drag: (e) => {
            // Immediate visual feedback - update clicked points without route recalculation
            const newPosition = e.target.getLatLng();
            const newClickedPoints = [...clickedPoints];
            newClickedPoints[index] = [newPosition.lat, newPosition.lng];
            setClickedPoints(newClickedPoints);
          },
          dragend: (e) => {
            setIsDragging(false);
            setDraggedPointIndex(null);
            const newPosition = e.target.getLatLng();
            // Trigger route recalculation when drag ends
            handleWaypointDrag(index, newPosition);
          },
          contextmenu: (e) => {
            // Right-click to show context menu
            e.originalEvent.preventDefault();
            e.originalEvent.stopPropagation();
            
            // Get the mouse position relative to the viewport
            const rect = e.originalEvent.target.getBoundingClientRect();
            setContextMenu({
              show: true,
              x: e.originalEvent.clientX,
              y: e.originalEvent.clientY,
              pointIndex: index
            });
          }
        }}
      />
    );
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
          url={mapType.url}
          attribution={mapType.attribution}
        />
        <MapController center={mapCenter} shouldCenter={shouldCenter} />
        <MapEvents />
        
        {route.length > 1 && (
          <Polyline 
            positions={route} 
            color="#F97316" 
            weight={4}
            opacity={0.8}
          />
        )}
        
        {clickedPoints.length > 0 && (
          <>
            {/* Render draggable clicked waypoints */}
            {clickedPoints.map((coord, index) => {
              if (index === 0) {
                // Draggable start marker
                return createDraggableMarker(coord, index, startIcon);
              } else if (index === clickedPoints.length - 1 && clickedPoints.length > 1) {
                // Draggable end marker
                return createDraggableMarker(coord, index, endIcon);
              } else {
                // Draggable intermediate waypoint markers
                return createDraggableMarker(coord, index, waypointIcon);
              }
            })}
          </>
        )}
      </MapContainer>
      
      {/* Map Type Selector */}
      <MapTypeSelector 
        selectedMapType={mapType}
        onMapTypeChange={setMapType}
      />
      
      {/* Route Controls - styled like orange buttons */}
      <div className="absolute bottom-4 left-4 z-[1000] flex space-x-2">
        <button 
          onClick={removeLastPoint}
          disabled={clickedPoints.length === 0}
          className="bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        >
          Remove last point
        </button>
        <button 
          onClick={clearRoute}
          disabled={clickedPoints.length === 0}
          className="bg-red-500 hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-3 py-2 rounded-lg shadow-lg text-sm font-medium transition-colors"
        >
          Clear route
        </button>
      </div>

      {/* Zoom Controls - moved to bottom right */}
      <div className="absolute bottom-16 right-4 bg-white rounded-lg shadow-lg p-1 z-[1000]">
        <div className="flex flex-col">
          <button className="p-2 hover:bg-gray-100 text-lg font-bold transition-colors">+</button>
          <button className="p-2 hover:bg-gray-100 text-lg font-bold transition-colors">−</button>
        </div>
      </div>
      
      {/* Loading notification for route recalculation */}
      {isRecalculatingRoute && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-[1000] flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          Recalculating route...
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu.show && (
        <>
          {/* Backdrop to close menu when clicking outside */}
          <div 
            className="fixed inset-0 z-[1001]" 
            onClick={closeContextMenu}
          />
          
          {/* Context Menu */}
          <div 
            className="fixed bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-[1002]"
            style={{
              left: `${contextMenu.x}px`,
              top: `${contextMenu.y}px`
            }}
          >
            <button
              className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-50 flex items-center"
              onClick={handleContextMenuDelete}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete this point
            </button>
          </div>
        </>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Point</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this waypoint? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrawableMap;