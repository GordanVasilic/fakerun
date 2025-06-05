import React from 'react';
import { Route, Save, List, Filter, Mountain } from 'lucide-react';

const HowItWorksPage = ({ onBackToCreate }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h1>
            <p className="text-lg text-gray-600">
              Learn how to create, customize, and manage your running routes with Fake My Run.
            </p>
          </div>

          {/* Creating a New Route Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Route className="w-6 h-6 mr-2 text-orange-500" />
              Creating a New Route
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">1. Drawing Your Route</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Click on the map</strong> to start drawing your route. Each click adds a new point.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Automatic routing:</strong> The app automatically creates realistic running paths between your points using road networks.</span>
                  </li>
                  <li className="flex items-start">
                    <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                    <span><strong>Real-time updates:</strong> Distance, elevation, and estimated time update automatically as you draw.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">2. Route Customization Options</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pace Settings</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Set your target pace (minutes per km)</li>
                      <li>• Choose from preset paces or enter custom</li>
                      <li>• Affects estimated completion time</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Route Controls</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• <strong>Clear Route:</strong> Remove all points and start over</li>
                      <li>• <strong>Undo:</strong> Remove the last added point</li>
                      <li>• <strong>Center Map:</strong> Focus map on your current route</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">3. Route Information Display</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Basic Metrics</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• <strong>Distance:</strong> Total route length in kilometers</li>
                      <li>• <strong>Estimated Time:</strong> Based on your selected pace</li>
                      <li>• <strong>Elevation Gain:</strong> Total uphill climbing</li>
                      <li>• <strong>Average Pace:</strong> Your target pace per kilometer</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Visual Profiles</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• <strong>Elevation Profile:</strong> Shows hills and valleys along your route</li>
                      <li>• <strong>Pace Profile:</strong> Displays pace variations throughout the run</li>
                      <li>• Both charts start from 0 for easy comparison</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Saving Routes Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Save className="w-6 h-6 mr-2 text-orange-500" />
              Saving Your Routes
            </h2>
            
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">How to Save a Route</h3>
                <ol className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">1</span>
                    <span>Click the <strong>"Save Route"</strong> button after creating your route</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">2</span>
                    <span>Enter a descriptive name for your route in the modal dialog</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">3</span>
                    <span>If the name already exists, you'll be prompted to overwrite or choose a different name</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">4</span>
                    <span>Your route is saved with all details: path, distance, elevation, and pace information</span>
                  </li>
                </ol>
              </div>

              <div className="bg-yellow-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">💡 Naming Tips</h3>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Use descriptive names like "Morning Park Loop" or "Hill Training 5K"</li>
                  <li>• Include distance or location for easy identification</li>
                  <li>• Avoid special characters that might cause issues</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Managing Saved Routes Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <List className="w-6 h-6 mr-2 text-orange-500" />
              Managing Saved Routes
            </h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Accessing Your Routes</h3>
                <p className="text-gray-700 mb-3">
                  Click <strong>"Saved Routes"</strong> in the navigation to view all your created routes.
                </p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Route Information</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Route name and creation date</li>
                      <li>• Distance and estimated duration</li>
                      <li>• Average pace and elevation gain</li>
                      <li>• Quick preview of route path</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Available Actions</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• <strong>Load:</strong> Open route in the editor</li>
                      <li>• <strong>Edit:</strong> Modify route details</li>
                      <li>• <strong>Delete:</strong> Remove route permanently</li>
                      <li>• <strong>View Details:</strong> See full route information</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Loading a Saved Route</h3>
                <ol className="space-y-2 text-gray-700">
                  <li className="flex items-start">
                    <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">1</span>
                    <span>Go to the <strong>Saved Routes</strong> page</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">2</span>
                    <span>Find the route you want to edit or run</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">3</span>
                    <span>Click the <strong>"Load Route"</strong> button</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center mt-0.5 mr-3 flex-shrink-0">4</span>
                    <span>You'll be taken to the Create Route page with your route loaded and ready to modify</span>
                  </li>
                </ol>
              </div>
            </div>
          </section>

          {/* Filtering and Search Section */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Filter className="w-6 h-6 mr-2 text-orange-500" />
              Filtering and Search
            </h2>
            
            <div className="space-y-6">
              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Search by Name</h3>
                <p className="text-gray-700 mb-3">
                  Use the search bar at the top of the Saved Routes page to quickly find routes by name.
                </p>
                <ul className="space-y-1 text-sm text-gray-700">
                  <li>• Search is case-insensitive</li>
                  <li>• Searches partial matches (e.g., "park" finds "Morning Park Loop")</li>
                  <li>• Results update in real-time as you type</li>
                </ul>
              </div>

              <div className="bg-purple-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Advanced Filters</h3>
                <p className="text-gray-700 mb-4">
                  Click the <strong>"Filters"</strong> button to access advanced filtering options:
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Distance Filter</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Set minimum distance (km)</li>
                      <li>• Set maximum distance (km)</li>
                      <li>• Find routes within your preferred range</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Duration Filter</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Set minimum duration (minutes)</li>
                      <li>• Set maximum duration (minutes)</li>
                      <li>• Perfect for time-based training</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Pace Filter (Collapsible)</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Click "Show Pace Filter" to expand</li>
                      <li>• Set minimum pace (min/km)</li>
                      <li>• Set maximum pace (min/km)</li>
                      <li>• Filter by running intensity</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Elevation Filter</h4>
                    <ul className="space-y-1 text-sm text-gray-700">
                      <li>• Set minimum elevation gain (m)</li>
                      <li>• Set maximum elevation gain (m)</li>
                      <li>• Find flat routes or hill training</li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-white rounded border">
                  <h4 className="font-medium text-gray-900 mb-2">Filter Tips</h4>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Combine multiple filters for precise results</li>
                    <li>• Use "Clear Filters" to reset all filter values</li>
                    <li>• Filter results show "X of Y routes" for easy tracking</li>
                    <li>• Empty filter fields are ignored (no restriction)</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Tips and Best Practices */}
          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <Mountain className="w-6 h-6 mr-2 text-orange-500" />
              Tips and Best Practices
            </h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-orange-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Route Creation Tips</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Start with major landmarks or intersections</li>
                  <li>• Add points at turns and direction changes</li>
                  <li>• Consider traffic and safety when planning</li>
                  <li>• Test different paces to see time estimates</li>
                  <li>• Use the elevation profile to plan for hills</li>
                </ul>
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-3">Organization Tips</h3>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li>• Use consistent naming conventions</li>
                  <li>• Include distance in route names</li>
                  <li>• Create routes for different training types</li>
                  <li>• Regularly review and delete unused routes</li>
                  <li>• Use filters to organize by difficulty</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Back to Create Button */}
          <div className="text-center pt-8 border-t border-gray-200">
            <button
              onClick={() => onBackToCreate()}
              className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 rounded-lg font-medium transition-colors"
            >
              Start Creating Routes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;