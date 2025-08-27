import React, { useState } from 'react'
import logo from '../assets/logo.png'

const AccessCodeInput = () => {
  const [accessCode, setAccessCode] = useState('123456')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!accessCode.trim()) {
      setError('Please enter an access code')
      setLoading(false)
      return
    }

    // For now, just validate the hardcoded code
    if (accessCode.trim() === '123456') {
      // Store quiz info in session storage for the next step
      const mockQuiz = {
        id: 1,
        title: 'Sample Quiz',
        access_code: '123456'
      }
      sessionStorage.setItem('currentQuiz', JSON.stringify(mockQuiz))
      
      // Navigate to enter name page
      window.location.href = '/enter-name'
    } else {
      setError('Invalid access code. Please check and try again.')
    }
    
    setLoading(false)
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

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Join Quiz</h1>
          <p className="text-gray-600">Enter the access code to join the quiz</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              placeholder="Enter access code"
              className="input-field text-center text-2xl font-mono tracking-widest"
              maxLength={8}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Are you an admin?{' '}
            <button
              onClick={() => window.location.href = '/admin/login'}
              className="text-purple-600 hover:text-purple-700 font-medium"
            >
              Login here
            </button>
          </p>
        </div> 
      </div>
    </div>
  )
}

export default AccessCodeInput
