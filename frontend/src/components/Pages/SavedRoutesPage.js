import React, { useState, useEffect } from 'react';
import { Search, Route, Filter, Edit3, Trash2 } from 'lucide-react';
import { authService } from '../../services/auth';
import RouteThumbnail from '../UI/RouteThumbnail';
import NotificationModal from '../Modals/NotificationModal';
import DeleteConfirmModal from '../Modals/DeleteConfirmModal';
import { formatDistance } from '../../utils/unitConversions';

export const SavedRoutesPage = ({ onBackToCreate, distanceUnit = 'km'}) => {
  const [savedRoutes, setSavedRoutes] = useState([]);
  const [filteredRoutes, setFilteredRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, route: null });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    minDistance: '',
    maxDistance: '',
    minDuration: '',
    maxDuration: '',
    minPace: '',
    maxPace: '',
    minElevation: '',
    maxElevation: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [showPaceFilter, setShowPaceFilter] = useState(false);
  
  // Add new state variables for delete confirmation and notifications
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [routeToDelete, setRouteToDelete] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notification, setNotification] = useState({ type: 'success', title: '', message: '' });

  // Add formatDuration function to SavedRoutesPage component
  const formatDuration = (seconds) => {
    if (!seconds || seconds === 0) {
      return 'N/A';
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  useEffect(() => {
    fetchSavedRoutes();
  }, []);

  // Apply search and filters whenever routes, search term, or filters change
  useEffect(() => {
    applyFilters();
  }, [savedRoutes, searchTerm, filters]);

  const fetchSavedRoutes = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/routes', {
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      if (response.ok) {
        const routes = await response.json();
        setSavedRoutes(routes);
      } else if (response.status === 401) {
        // Handle unauthorized - redirect to login
        authService.logout();
        window.location.reload();
      } else {
        throw new Error('Failed to fetch routes');
      }
    } catch (err) {
      setError(err.message);
      console.error('Error fetching routes:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = savedRoutes;

    // Apply name search
    if (searchTerm.trim()) {
      filtered = filtered.filter(route => 
        route.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply numeric filters
    filtered = filtered.filter(route => {
      const details = route.run_details || {};
      
      // Parse values for comparison
      const distance = parseFloat(details.distance) || 0;
      const duration = parseDurationToMinutes(details.duration) || 0;
      const pace = parsePaceToSeconds(details.pace) || 0;
      const elevation = parseFloat(details.elevation_gain) || 0;

      // Distance filter
      if (filters.minDistance && distance < parseFloat(filters.minDistance)) return false;
      if (filters.maxDistance && distance > parseFloat(filters.maxDistance)) return false;

      // Duration filter (in minutes)
      if (filters.minDuration && duration < parseFloat(filters.minDuration)) return false;
      if (filters.maxDuration && duration > parseFloat(filters.maxDuration)) return false;

      // Pace filter (in seconds per km)
      if (filters.minPace && pace < parsePaceToSeconds(filters.minPace)) return false;
      if (filters.maxPace && pace > parsePaceToSeconds(filters.maxPace)) return false;

      // Elevation filter
      if (filters.minElevation && elevation < parseFloat(filters.minElevation)) return false;
      if (filters.maxElevation && elevation > parseFloat(filters.maxElevation)) return false;

      return true;
    });

    setFilteredRoutes(filtered);
  };

  // Helper function to parse duration string to minutes
  const parseDurationToMinutes = (duration) => {
    if (!duration || typeof duration !== 'string') return 0;
    const parts = duration.split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0]) || 0;
      const minutes = parseInt(parts[1]) || 0;
      return hours * 60 + minutes;
    }
    return 0;
  };

  // Helper function to parse pace string to seconds per km
  const parsePaceToSeconds = (pace) => {
    if (!pace || typeof pace !== 'string') return 0;
    const parts = pace.split(':');
    if (parts.length === 2) {
      const minutes = parseInt(parts[0]) || 0;
      const seconds = parseInt(parts[1]) || 0;
      return minutes * 60 + seconds;
    }
    return 0;
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilters({
      minDistance: '',
      maxDistance: '',
      minDuration: '',
      maxDuration: '',
      minPace: '',
      maxPace: '',
      minElevation: '',
      maxElevation: ''
    });
    setShowPaceFilter(false);
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Generate suggestions based on existing route names
    if (value.trim()) {
      const routeNames = savedRoutes.map(route => route.name);
      const filteredSuggestions = routeNames.filter(name => 
        name.toLowerCase().includes(value.toLowerCase()) && 
        name.toLowerCase() !== value.toLowerCase()
      );
      setSuggestions([...new Set(filteredSuggestions)].slice(0, 5)); // Remove duplicates and limit to 5
      setShowSuggestions(filteredSuggestions.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };
  const handleSearchFocus = () => {
    if (searchTerm.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };
  
  const handleSearchBlur = () => {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };
  
  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };
  const deleteRoute = async (routeId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/routes/${routeId}`, {
        method: 'DELETE',
        headers: {
          ...authService.getAuthHeaders(),
        },
      });
      
      if (response.ok) {
        setSavedRoutes(savedRoutes.filter(route => route.id !== routeId));
        setShowDeleteModal(false);
        setRouteToDelete(null);
        
        // Show success notification
        setNotification({
          type: 'success',
          title: 'Route Deleted',
          message: 'The route has been successfully deleted.'
        });
        setShowNotification(true);
      } else if (response.status === 401) {
        authService.logout();
        window.location.reload();
      } else {
        throw new Error('Failed to delete route');
      }
    } catch (err) {
      setNotification({
        type: 'error',
        title: 'Delete Failed',
        message: 'Error deleting route: ' + err.message
      });
      setShowNotification(true);
    }
  };

  const handleDeleteClick = (route) => {
    setRouteToDelete(route);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = () => {
    if (routeToDelete) {
      deleteRoute(routeToDelete.id);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setRouteToDelete(null);
  };

  const loadRoute = (route) => {
    onBackToCreate(route);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading saved routes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <Route className="w-16 h-16 mx-auto mb-2" />
            <h3 className="text-xl font-medium">Error Loading Routes</h3>
            <p className="text-sm mt-2">{error}</p>
          </div>
          <button
            onClick={fetchSavedRoutes}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Saved Routes</h1>
            <p className="text-gray-600 mt-2">Manage your created running routes</p>
          </div>
          <button
            onClick={() => onBackToCreate()}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Route className="w-5 h-5" />
            <span>Create New Route</span>
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          {/* Search Bar */}
          <div className="flex items-center space-x-4 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search routes by name..."
                value={searchTerm}
                onChange={handleSearchChange}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
              
              {/* Suggestions dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto z-10">
                  {suggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-3 py-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                    >
                      {suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-5 h-5 inline mr-2" />
              Filters
            </button>
            {(searchTerm || Object.values(filters).some(f => f)) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Distance Filter */}
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Distance ({distanceUnit})
                </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minDistance}
                      onChange={(e) => handleFilterChange('minDistance', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxDistance}
                      onChange={(e) => handleFilterChange('maxDistance', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Duration Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minDuration}
                      onChange={(e) => handleFilterChange('minDuration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxDuration}
                      onChange={(e) => handleFilterChange('maxDuration', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Elevation Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Elevation (m)</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minElevation}
                      onChange={(e) => handleFilterChange('minElevation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxElevation}
                      onChange={(e) => handleFilterChange('maxElevation', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Advanced Pace Filter Section */}
              <div className="mt-4 pt-4 border-t">
                <button
                  onClick={() => setShowPaceFilter(!showPaceFilter)}
                  className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  <span>Advanced: Pace Filter</span>
                  <svg
                    className={`ml-2 h-4 w-4 transform transition-transform ${
                      showPaceFilter ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showPaceFilter && (
                  <div className="mt-3 max-w-sm">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Avg Pace (mm:ss)</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        placeholder="Min (5:30)"
                        value={filters.minPace}
                        onChange={(e) => handleFilterChange('minPace', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                      <input
                        type="text"
                        placeholder="Max (6:00)"
                        value={filters.maxPace}
                        onChange={(e) => handleFilterChange('maxPace', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {savedRoutes.length > 0 && (
          <div className="mb-4">
            <p className="text-gray-600">
              Showing {filteredRoutes.length} of {savedRoutes.length} routes
              {(searchTerm || Object.values(filters).some(f => f)) && (
                <span className="text-orange-600 ml-1">(filtered)</span>
              )}
            </p>
          </div>
        )}

        {savedRoutes.length === 0 ? (
          <div className="text-center py-12">
            <Route className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No saved routes yet</h3>
            <p className="text-gray-500 mb-6">Create your first route to get started</p>
            <button
              onClick={() => onBackToCreate()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Create Your First Route
            </button>
          </div>
        ) : filteredRoutes.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-gray-900 mb-2">No routes match your search</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search terms or filters</p>
            <button
              onClick={clearFilters}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoutes.map((route) => (
            <div 
              key={route.id} 
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow duration-200"
              style={{ boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)' }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{route.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => loadRoute(route)}
                      className="text-orange-500 hover:text-orange-600 p-1"
                      title="Load route"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(route)}
                      className="text-red-500 hover:text-red-600 p-1"
                      title="Delete route"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-[auto_auto_1fr] gap-x-8 gap-y-3 items-center">
                      {/* Row 1 - Distance */}
                      <div className="text-sm text-gray-500">Distance</div>
                      <div className="font-medium">
                        {formatDistance(route.run_details?.distance || 0, distanceUnit)}
                      </div>
                      <div className="row-span-4 flex justify-center">
                        <RouteThumbnail coordinates={route.coordinates} width={180} height={135} />
                      </div>
                      
                      {/* Row 2 - Duration */}
                      <div className="text-sm text-gray-500">Duration</div>
                      <div className="font-medium">{formatDuration(route.run_details?.duration) || 'N/A'}</div>
                      
                      {/* Row 3 - Avg Pace */}
                      <div className="text-sm text-gray-500">Avg Pace</div>
                      <div className="font-medium">{route.run_details?.pace || 'N/A'}</div>
                      
                      {/* Row 4 - Elevation */}
                      <div className="text-sm text-gray-500">Elevation</div>
                      <div className="font-medium">{route.run_details?.elevation_gain || 'N/A'}m</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-400">
                      Created: {route.created_at ? new Date(route.created_at).toLocaleDateString() : 'Date not available'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add delete confirmation and notification modals */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        routeName={routeToDelete?.name || ''}
      />
      
      <NotificationModal
        isOpen={showNotification}
        onClose={() => setShowNotification(false)}
        type={notification.type}
        title={notification.title}
        message={notification.message}
      />
    </div>
  );
};

export default SavedRoutesPage;