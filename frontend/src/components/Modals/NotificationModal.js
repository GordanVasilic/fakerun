import React from 'react';

const NotificationModal = ({ isOpen, onClose, type = 'success', title, message }) => {
  if (!isOpen) return null;

  const bgColor = type === 'success' ? 'bg-green-50' : type === 'error' ? 'bg-red-50' : 'bg-blue-50';
  const textColor = type === 'success' ? 'text-green-800' : type === 'error' ? 'text-red-800' : 'text-blue-800';
  const borderColor = type === 'success' ? 'border-green-200' : type === 'error' ? 'border-red-200' : 'border-blue-200';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`${bgColor} ${borderColor} border rounded-lg p-6 max-w-md w-full mx-4`}>
        <h3 className={`text-lg font-semibold ${textColor} mb-2`}>{title}</h3>
        <p className={`${textColor} mb-4`}>{message}</p>
        <button
          onClick={onClose}
          className="bg-white text-gray-700 px-4 py-2 rounded border hover:bg-gray-50 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default NotificationModal;