import React, { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash'; // or implement your own debounce function
import { MapContainer, TileLayer, Polyline, Marker, useMap, useMapEvents } from 'react-leaflet';
import { startIcon, endIcon, waypointIcon } from '../Map/mapIcons';
import MapTypeSelector from './MapTypeSelector';
import { Search, MapPin, X } from 'lucide-react';

const DrawableMap = (props) => {
  console.log('🔍 Raw props received:', props);

  const {
    route, 
    setRoute, 
    mapCenter, 
    setMapCenter, 
    shouldCenter, 
    setShouldCenter, 
    runDetails, 
    saveRoute,
    clickedPoints,
    setClickedPoints,
    searchQuery = '', // Provide default values
    setSearchQuery = () => console.warn('setSearchQuery not provided'),
    isSearching = false,
    setIsSearching = () => console.warn('setIsSearching not provided')
  } = props;

   // Verify the types after destructuring
   console.log('🏗️ After destructuring:', {
    searchQuery: { type: typeof searchQuery, value: searchQuery },
    setSearchQuery: { type: typeof setSearchQuery, value: setSearchQuery },
    isSearching: { type: typeof isSearching, value: isSearching },
    setIsSearching: { type: typeof setIsSearching, value: setIsSearching }
  });

  // ... rest of existing code ...


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
  
  // Add state for route recalculation
  const [routeRecalcTimeout, setRouteRecalcTimeout] = useState(null);
  const [isRecalculatingRoute, setIsRecalculatingRoute] = useState(false);
  const [delayedLoadingTimeout, setDelayedLoadingTimeout] = useState(null);
  
   const [searchResults, setSearchResults] = useState([]);
   const [showSuggestions, setShowSuggestions] = useState(false);

   const searchLocation = async (query) => {
    if (!query || !query.trim() || query.trim().length < 3) {
      setSearchResults([]);
      setShowSuggestions(false);
      return;
    }
  
    // Add null check for setIsSearching
    if (setIsSearching) {
      setIsSearching(true);
    }
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
      setShowSuggestions(data.length > 0);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSuggestions(false);
    } finally {
      // Add null check for setIsSearching
      if (setIsSearching) {
        setIsSearching(false);
      }
    }
  };

  const debouncedSearch = useCallback(
    debounce((query) => searchLocation(query), 300),
    [setIsSearching]
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    
    console.log('🔍 handleSearchChange called:', {
      value,
      setSearchQuery: typeof setSearchQuery,
      setSearchQueryExists: typeof setSearchQuery === 'function'
    });
    
    // Safety check before calling setSearchQuery
    if (typeof setSearchQuery === 'function') {
      setSearchQuery(value);
      
      if (value.length >= 4) {
        debouncedSearch(value);
      }
    } else {
      console.error('❌ setSearchQuery is not a function:', {
        type: typeof setSearchQuery,
        value: setSearchQuery
      });
    }
  };


  const handleSearchFocus = () => {
    console.log('🎯 Search input focused, isSearching:', isSearching);
    setShowSuggestions(searchResults.length > 0);
  };

  const handleSearchBlur = () => {
    console.log('👋 Search input blurred');
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  const handleSuggestionClick = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    setMapCenter([lat, lon]);
    setShouldCenter(true);
    if (setSearchQuery) {
      setSearchQuery(result.display_name);
    }
    setShowSuggestions(false);
    setSearchResults([]);
  };

  const clearSearch = () => {
    if (setSearchQuery) {
      setSearchQuery('');
    }
    setSearchResults([]);
    setShowSuggestions(false);
  };

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
        // Set up delayed loading notification (appears after 500ms)
        const timeoutId = setTimeout(() => {
          setIsRecalculatingRoute(true);
        }, 500);
        setDelayedLoadingTimeout(timeoutId);
        
        try {
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

  // Add missing marker drag handler functions
  const handleMarkerClick = (index) => {
    // Optional: Add any click behavior for markers
    console.log(`Marker ${index} clicked`);
  };

  const handleMarkerDragStart = (index) => {
    setIsDragging(true);
    setDraggedPointIndex(index);
  };

  const handleMarkerDragEnd = (e, index) => {
    setIsDragging(false);
    setDraggedPointIndex(null);
    const newPosition = e.target.getLatLng();
    // Trigger route recalculation when drag ends
    handleWaypointDrag(index, newPosition);
  };

  // Remove the entire search UI section (around lines 565-600)
  // Replace the search UI with just the map container
  
  return (
    <div 
      className="relative w-full h-full"
      onClick={closeContextMenu} // Add this to close context menu on outside click
    >
      <MapContainer
        center={mapCenter}
        zoom={13}
        className="w-full h-full"
        whenCreated={(map) => {
          // Map initialization logic
        }}
      >
        // Around line 580-582, replace the incorrect component references:
            <TileLayer
              url={mapType.url}
              attribution={mapType.attribution}
            />
            
            <MapEvents />
            <MapController center={mapCenter} shouldCenter={shouldCenter} />
            
            {/* Route polyline */}
            {routeCoordinates.length > 1 && (
          <Polyline
            positions={routeCoordinates}
            color="#ff6b35"
            weight={4}
            opacity={0.8}
          />
        )}
        
        {/* Route markers - show only clicked points, not interpolated route */}
        {clickedPoints.map((point, index) => (
          <Marker
            key={index}
            position={Array.isArray(point) ? point : [point.lat, point.lng]}
            icon={index === 0 ? startIcon : index === clickedPoints.length - 1 ? endIcon : waypointIcon}
            eventHandlers={{
              click: () => handleMarkerClick(index),
              dragstart: () => handleMarkerDragStart(index),
              dragend: (e) => handleMarkerDragEnd(e, index),
              contextmenu: (e) => {
                // Right-click to show context menu
                e.originalEvent.preventDefault();
                e.originalEvent.stopPropagation();
                
                // Get the mouse position relative to the viewport
                setContextMenu({
                  show: true,
                  x: e.originalEvent.clientX,
                  y: e.originalEvent.clientY,
                  pointIndex: index
                });
              }
            }}
            draggable={true}
          />
        ))}  
      </MapContainer>
      
      {/* Loading overlay */}
      {isRecalculatingRoute && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center z-[1000] pointer-events-none">
          <div className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm font-medium text-gray-700">Recalculating route...</span>
          </div>
        </div>
      )}
      
      {/* Context Menu */}
      {contextMenu.show && (
        <div 
          className="absolute bg-white border border-gray-300 rounded-lg shadow-lg py-1 z-[1001]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            transform: 'translate(-50%, -100%)' // Position above the cursor
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={handleContextMenuDelete}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Delete point</span>
          </button>
        </div>
      )}
      
      {/* Map control buttons - lower left corner */}
      <div className="absolute bottom-4 left-4 flex flex-col space-y-2 z-[1000]">
        {/* Remove last point button */}
        {clickedPoints.length > 0 && (
          <button
            onClick={removeLastPoint}
            disabled={isRecalculatingRoute}
            className="bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed border border-gray-300 rounded-lg px-3 py-2 shadow-lg flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            title="Remove last point"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Remove Last Point</span>
          </button>
        )}
        
        {/* Clear map button */}
        {clickedPoints.length > 0 && (
          <button
            onClick={clearRoute}
            disabled={isRecalculatingRoute}
            className="bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed border border-gray-300 rounded-lg px-3 py-2 shadow-lg flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            title="Clear entire route"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Clear Map</span>
          </button>
        )}
      </div>

            {/* Search UI with suggestions */}
            <div className="absolute top-4 left-4 z-[1000] w-80">
        <div className="bg-white bg-opacity-90 rounded-lg shadow-lg px-4 py-3 mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Create Your Custom Route</h1>
          <p className="text-sm text-gray-600 mt-1">Click on map to add points</p>
        </div>
        
        <div className="relative">
          <div className="flex space-x-2">
          <div className="flex-1 relative" onClick={(e) => e.stopPropagation()}>
            <input
                type="text"
                placeholder="Search for a location..."
                value={searchQuery || ''}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                onKeyDown={(e) => {
                  console.log('⌨️ KeyDown event:', {
                    key: e.key,
                    code: e.code,
                    target: e.target.tagName,
                    disabled: e.target.disabled,
                    readOnly: e.target.readOnly,
                    isSearching
                  });
                }}
                onInput={(e) => {
                  console.log('📝 Input event:', {
                    value: e.target.value,
                    inputType: e.inputType,
                    disabled: e.target.disabled
                  });
                }}
                className="w-full pl-10 pr-10 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent shadow-sm"
                
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              {searchQuery && searchQuery.trim().length > 0 && !isSearching && (
      <button
        type="button"
        onClick={clearSearch}
        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
        className="absolute right-3 top-2.5 h-5 w-5 text-gray-400 hover:text-gray-600 transition-colors"
        title="Clear search"
      >
        <X className="h-4 w-4" />
      </button>
    )}
              {isSearching && (
                <div className="absolute right-3 top-2.5">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-500"></div>
                </div>
              )}
            </div>
            
            <button 
              type="button"
              onClick={() => navigator.geolocation?.getCurrentPosition(
                (position) => {
                  setMapCenter([position.coords.latitude, position.coords.longitude]);
                  setShouldCenter(true);
                },
                (error) => {
                  console.error('Geolocation error:', error);
                  alert('Unable to get your location. Please search for a location instead.');
                }
              )}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm transition-colors"
              title="Use my location"
            >
              <MapPin className="w-4 h-4" />
            </button>
          </div>
          
                    {/* Search Suggestions Dropdown */}
                    {showSuggestions && searchResults.length > 0 && searchQuery && searchQuery.trim().length >= 4 && (
            <div className="search-suggestions absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto z-[1001]">
              {searchResults.slice(0, 5).map((result, index) => (
                <button
                  key={index}
                  onMouseDown={(e) => e.preventDefault()} // Prevent input blur
                  onClick={() => handleSuggestionClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0 flex items-start space-x-3"
                >
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {result.display_name.split(',')[0]}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {result.display_name}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Fix the MapTypeSelector props */}
      <MapTypeSelector selectedMapType={mapType} onMapTypeChange={setMapType} />
      
    </div>
  );
};

export default DrawableMap;