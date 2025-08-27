import React, { useState, useEffect } from 'react'
import { supabase, TABLES } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const Results = () => {
  const [quiz, setQuiz] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [answers, setAnswers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Get quiz and participant info from session storage
    const quizData = sessionStorage.getItem('currentQuiz')
    const participantData = sessionStorage.getItem('currentParticipant')
    
    if (quizData && participantData) {
      setQuiz(JSON.parse(quizData))
      setParticipant(JSON.parse(participantData))
      fetchAnswers(JSON.parse(participantData).id)
    } else {
      // Redirect to access code input if no data
      window.location.href = '/'
    }
  }, [])

  const fetchAnswers = async (participantId) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.ANSWERS)
        .select(`
          *,
          question:questions(*)
        `)
        .eq('participant_id', participantId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching answers:', error)
        setError('Failed to load results')
        return
      }

      setAnswers(data || [])
    } catch (error) {
      console.error('Error in fetchAnswers:', error)
      setError('Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  const calculateScore = () => {
    if (!answers.length) return { correct: 0, total: 0, percentage: 0 }
    
    const correct = answers.filter(answer => answer.is_correct).length
    const total = answers.length
    const percentage = Math.round((correct / total) * 100)
    
    return { correct, total, percentage }
  }

  const getStatusColor = (isCorrect) => {
    return isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    )
  }

  if (!quiz || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p className="text-gray-600 mb-4">No quiz or participant data found</p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Back to Access Code
          </button>
        </div>
      </div>
    )
  }

  const score = calculateScore()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Quiz Results</h1>
                <p className="text-gray-600">Quiz: {quiz.title}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Participant</div>
              <div className="font-semibold">{participant.name}</div>
            </div>
          </div>
        </div>

        {/* Score Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Score</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{score.correct}</div>
              <div className="text-gray-600">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-600 mb-2">{score.total}</div>
              <div className="text-gray-600">Total Questions</div>
            </div>
            <div className="text-center">
              <div className={`text-3xl font-bold mb-2 ${
                score.percentage >= 70 ? 'text-green-600' : 
                score.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {score.percentage}%
              </div>
              <div className="text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        {answers.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Question Details</h2>
            <div className="space-y-4">
              {answers.map((answer, index) => (
                <div key={answer.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      Question {index + 1}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(answer.is_correct)}`}>
                      {answer.is_correct ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>
                  
                  {answer.question && (
                    <div className="space-y-2">
                      <p className="text-gray-700">{answer.question.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">Your Answer:</span>
                          <p className="text-gray-600">{answer.answer || 'No answer provided'}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Correct Answer:</span>
                          <p className="text-green-600">{answer.question.correct_answer}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Messages */}
        {error && (
          <div className="mt-6 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 text-center space-x-4">
          <button
            onClick={() => {
              // Clear session storage
              sessionStorage.removeItem('currentQuiz')
              sessionStorage.removeItem('currentParticipant')
              window.location.href = '/'
            }}
            className="btn-primary"
          >
            Take Another Quiz
          </button>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="btn-secondary"
          >
            Admin Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}

export default Results
