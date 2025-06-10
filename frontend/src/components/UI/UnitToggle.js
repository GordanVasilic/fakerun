import React from 'react';

const UnitToggle = ({ distanceUnit, onUnitChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">Units:</span>
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => onUnitChange('km')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            distanceUnit === 'km'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Metric
        </button>
        <button
          onClick={() => onUnitChange('miles')}
          className={`px-3 py-1 text-sm rounded-md transition-colors ${
            distanceUnit === 'miles'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Imperial
        </button>
      </div>
    </div>
  );
};

export default UnitToggle;