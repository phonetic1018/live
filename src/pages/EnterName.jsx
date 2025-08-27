import React, { useState } from 'react'
import { supabase, TABLES, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const EnterName = () => {
  const [participantName, setParticipantName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState(null)

  React.useEffect(() => {
    // Get quiz info from session storage
    const quizData = sessionStorage.getItem('currentQuiz')
    if (quizData) {
      setQuiz(JSON.parse(quizData))
    } else {
      // Redirect to access code input if no quiz data
      window.location.href = '/'
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!participantName.trim()) {
      setError('Please enter your name')
      setLoading(false)
      return
    }

    if (!quiz) {
      setError('No quiz found. Please try again.')
      setLoading(false)
      return
    }

    try {
      // Create participant
      const { data: participant, error: participantError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .insert([
          {
            quiz_id: quiz.id,
            name: participantName.trim(),
            email: email.trim() || null,
            status: PARTICIPANT_STATUS.WAITING
          }
        ])
        .select()
        .single()

      if (participantError) {
        console.error('Error creating participant:', participantError)
        setError('Failed to join quiz. Please try again.')
        setLoading(false)
        return
      }

      // Store participant info in session storage
      sessionStorage.setItem('currentParticipant', JSON.stringify(participant))
      
      // Navigate to lobby
      window.location.href = '/lobby'
    } catch (error) {
      console.error('Error joining quiz:', error)
      setError('An error occurred. Please try again.')
    }
    
    setLoading(false)
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full">
        {/* Logo Section */}
        <div className="mb-6 text-center">
          <div className="w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Enter Your Name</h1>
          <p className="text-gray-600">Join the quiz: {quiz.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="participantName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              id="participantName"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your full name"
              className="input-field"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="input-field"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !participantName.trim()}
            className="btn-primary w-full"
          >
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:text-blue-700 text-sm"
          >
            ← Back to Access Code
          </button>
        </div>
      </div>
    </div>
  )
}

export default EnterName
