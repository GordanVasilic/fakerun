import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const MapTypeSelector = ({ selectedMapType, onMapTypeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const mapTypes = [
    { id: 'osm', name: 'Street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    { id: 'satellite', name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'terrain', name: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' },
    { id: 'cyclosm', name: 'Cycling', url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png' },
    { id: 'humanitarian', name: 'Humanitarian', url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png' },
    { id: 'cartodb-light', name: 'Light', url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png' },
    { id: 'cartodb-dark', name: 'Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' },
    { id: 'stamen-toner', name: 'Minimal', url: 'https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png' },
    { id: 'stamen-watercolor', name: 'Artistic', url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg' }
  ];

  const handleMapTypeSelect = (mapType) => {
    onMapTypeChange(mapType);
    setIsOpen(false);
  };

  return (
    <div className="absolute top-4 right-4 z-[1000]">
      <div className="relative">
        {/* Dropdown Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white rounded-lg shadow-lg px-4 py-2 flex items-center space-x-2 hover:bg-gray-50 transition-colors min-w-[120px]"
        >
          <span className="text-sm font-medium text-gray-700">
            {selectedMapType.name}
          </span>
          <ChevronDown 
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop to close dropdown */}
            <div 
              className="fixed inset-0 z-[-1]" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Options */}
            <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[140px] max-h-64 overflow-y-auto">
              {mapTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleMapTypeSelect(type)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                    selectedMapType.id === type.id
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700'
                  }`}
                >
                  {type.name}
                  {selectedMapType.id === type.id && (
                    <span className="float-right text-blue-500">✓</span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MapTypeSelector;