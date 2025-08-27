import React, { useState } from 'react'
import { supabase, TABLES } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const AccessCodeInput = () => {
  const [accessCode, setAccessCode] = useState('')
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

    // Validate that access code is exactly 6 digits
    if (!/^\d{6}$/.test(accessCode.trim())) {
      setError('Access code must be exactly 6 digits')
      setLoading(false)
      return
    }

    try {
      console.log('Searching for quiz with access code:', accessCode.trim())
      
      // Fetch quiz from Supabase
      const { data: quiz, error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('access_code', accessCode.trim())
        .single()

      console.log('Quiz search result:', { quiz, quizError })

      if (quizError || !quiz) {
        console.error('Quiz not found or error:', quizError)
        setError('Invalid access code. Please check and try again.')
        setLoading(false)
        return
      }

      // Check if quiz is active
      if (quiz.status === 'completed') {
        setError('This quiz has already been completed.')
        setLoading(false)
        return
      }

      // Store quiz info in session storage
      sessionStorage.setItem('currentQuiz', JSON.stringify(quiz))
      
      // Navigate to enter name page
      window.location.href = '/enter-name'
    } catch (error) {
      console.error('Error fetching quiz:', error)
      setError('An error occurred. Please try again.')
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

        {/* Admin Login Option */}
        <div className="mb-6 text-center">
          <button
            onClick={() => window.location.href = '/admin/login'}
            className="text-blue-600 hover:text-blue-700 text-sm flex items-center justify-center mx-auto"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Admin Login
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => {
                // Only allow numeric input
                const numericValue = e.target.value.replace(/[^0-9]/g, '')
                setAccessCode(numericValue)
              }}
              placeholder="Enter 6-digit code"
              className="input-field text-center text-2xl font-mono tracking-widest"
              maxLength={6}
              pattern="[0-9]*"
              inputMode="numeric"
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
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Joining...' : 'Join Quiz'}
          </button>
        </form>



        <div className="text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your quiz administrator
          </p>
        </div>
      </div>
    </div>
  )
}

export default AccessCodeInput
