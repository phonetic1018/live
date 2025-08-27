import React, { useState, useEffect } from 'react'
import { supabase, TABLES, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const EnterName = () => {
  const [participantName, setParticipantName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState(null)

  useEffect(() => {
    // Get quiz info from session storage
    const quizData = sessionStorage.getItem('currentQuiz')
    if (!quizData) {
      window.location.href = '/'
      return
    }
    setQuiz(JSON.parse(quizData))
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

    try {
      // Save participant to Supabase
      const { data: participant, error: participantError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .insert([
          {
            quiz_id: quiz.id,
            name: participantName.trim(),
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
    } catch (err) {
      console.error('Error in handleSubmit:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (!quiz) {
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

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Enter Your Name</h1>
          <p className="text-gray-600">Join quiz: {quiz.title}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              className="input-field text-center text-xl"
              maxLength={30}
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <button
              type="submit"
              className="btn-primary w-full"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Quiz'}
            </button>
            
            <button
              type="button"
              onClick={() => window.location.href = '/'}
              className="btn-secondary w-full"
            >
              Back
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EnterName
