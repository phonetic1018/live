import React from 'react'
import logo from '../assets/logo.png'

function EnterName({ accessCode, participantName, setParticipantName, onContinue, onBack }) {
  const handleEnterName = () => {
    if (participantName.trim()) {
      onContinue()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        {/* Logo Section */}
        <div className="mb-6">
          <div className="w-32 h-32 mx-auto mb-3 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Enter Your Name</h1>
        <p className="text-gray-600 mb-6">Join quiz with access code: <span className="font-mono font-bold text-blue-600">{accessCode}</span></p>
        <div className="space-y-4">
          <input 
            type="text" 
            placeholder="Enter Your Name" 
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            className="input-field text-center text-xl"
            maxLength={30}
          />
          <button 
            className="btn-primary w-full"
            onClick={handleEnterName}
            disabled={!participantName.trim()}
          >
            Continue
          </button>
          <button 
            className="btn-secondary w-full"
            onClick={onBack}
          >
            Back
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnterName
