import React from 'react';

const MapTypeSelector = ({ selectedMapType, onMapTypeChange }) => {
  const mapTypes = [
    { id: 'osm', name: 'OpenStreetMap', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' },
    { id: 'satellite', name: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}' },
    { id: 'terrain', name: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png' }
  ];

  return (
    <div className="absolute top-4 right-4 z-[1000] bg-white rounded-lg shadow-lg p-2">
      <div className="flex flex-col space-y-1">
        {mapTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => onMapTypeChange(type)}
            className={`px-3 py-2 text-sm rounded transition-colors ${
              selectedMapType.id === type.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {type.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default MapTypeSelector;