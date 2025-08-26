import React, { useState, useEffect } from 'react'
import logo from '../assets/logo.png'

const Lobby = () => {
  const [quiz, setQuiz] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get quiz and participant info from session storage
    const quizData = sessionStorage.getItem('currentQuiz')
    const participantData = sessionStorage.getItem('currentParticipant')
    
    if (!quizData || !participantData) {
      window.location.href = '/'
      return
    }

    setQuiz(JSON.parse(quizData))
    setParticipant(JSON.parse(participantData))
    setLoading(false)
  }, [])

  const handleLeaveLobby = () => {
    // Clear session storage
    sessionStorage.removeItem('currentQuiz')
    sessionStorage.removeItem('currentParticipant')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
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
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Waiting for Admin</h1>
        <p className="text-gray-600 mb-6">You're in the lobby waiting for the admin to start the quiz</p>
        
        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <p className="text-gray-500 text-sm mb-6">Please wait while the admin prepares the quiz...</p>

        <button 
          className="btn-secondary w-full"
          onClick={handleLeaveLobby}
        >
          Leave Lobby
        </button>
      </div>
    </div>
  )
}

export default Lobby
