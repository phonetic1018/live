import React from 'react'
import logo from '../assets/logo.png'

function Lobby({ accessCode, participantName, onBack }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        {/* Logo Section */}
        <div className="mb-6">
          <div className="w-32 h-32 mx-auto mb-3 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Waiting for Admin</h1>
        <p className="text-gray-600 mb-6">You're in the lobby waiting for the admin to start the quiz</p>
        
        {/* Participant Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Access Code</p>
          <p className="font-mono font-bold text-blue-600 text-lg">{accessCode}</p>
          <p className="text-sm text-gray-600 mb-2 mt-3">Your Name</p>
          <p className="font-semibold text-gray-800 text-lg">{participantName}</p>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <p className="text-gray-500 text-sm mb-6">Please wait while the admin prepares the quiz...</p>

        <button 
          className="btn-secondary w-full"
          onClick={onBack}
        >
          Leave Lobby
        </button>
      </div>
    </div>
  )
}

export default Lobby
