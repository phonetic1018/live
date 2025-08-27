import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const AdminQuiz = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showNextTimer, setShowNextTimer] = useState(false)
  const [nextTimer, setNextTimer] = useState(3)

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated')
    
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
      // Get current quiz from session storage
      const quizData = sessionStorage.getItem('currentQuiz')
      if (quizData) {
        const quizObj = JSON.parse(quizData)
        setQuiz(quizObj)
        fetchQuestions(quizObj.id)
        fetchParticipants(quizObj.id)
      }
    } else {
      // Redirect to admin login if not authenticated
      window.location.href = '/admin/login'
    }
  }, [])

  // Subscribe to participant updates
  useEffect(() => {
    if (!quiz) return

    const participantsSubscription = supabase
      .channel('admin-participants')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.PARTICIPANTS,
          filter: `quiz_id=eq.${quiz.id}`
        }, 
        (payload) => {
          console.log('Participant change:', payload)
          fetchParticipants(quiz.id)
        }
      )
      .subscribe()

    return () => {
      participantsSubscription.unsubscribe()
    }
  }, [quiz])

  const fetchQuestions = async (quizId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from(TABLES.QUESTIONS)
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error fetching questions:', error)
        setError('Failed to load quiz questions')
        return
      }

      setQuestions(data || [])
    } catch (error) {
      console.error('Error in fetchQuestions:', error)
      setError('Failed to load quiz questions')
    } finally {
      setLoading(false)
    }
  }

  const fetchParticipants = async (quizId) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.PARTICIPANTS)
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching participants:', error)
        return
      }

      setParticipants(data || [])
    } catch (error) {
      console.error('Error in fetchParticipants:', error)
    }
  }

  const handleNextQuestion = async () => {
    if (currentQuestionIndex >= questions.length - 1) {
      // Quiz completed
      await completeQuiz()
      return
    }

    // Show 3-second timer
    setShowNextTimer(true)
    setNextTimer(3)

    const timer = setInterval(() => {
      setNextTimer(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setShowNextTimer(false)
          // Move to next question
          setCurrentQuestionIndex(prev => prev + 1)
          // Update quiz status to show current question
          updateQuizQuestion(currentQuestionIndex + 1)
          return 3
        }
        return prev - 1
      })
    }, 1000)
  }

  const updateQuizQuestion = async (questionIndex) => {
    try {
      const { error } = await supabase
        .from(TABLES.QUIZZES)
        .update({ 
          current_question_index: questionIndex,
          updated_at: new Date().toISOString()
        })
        .eq('id', quiz.id)

      if (error) {
        console.error('Error updating quiz question:', error)
      }
    } catch (error) {
      console.error('Error in updateQuizQuestion:', error)
    }
  }

  const completeQuiz = async () => {
    try {
      // Update quiz status to completed
      const { error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .update({ 
          status: QUIZ_STATUS.COMPLETED,
          updated_at: new Date().toISOString()
        })
        .eq('id', quiz.id)

      if (quizError) {
        console.error('Error completing quiz:', quizError)
        return
      }

      // Update all participants to completed
      const { error: participantsError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .update({ 
          status: PARTICIPANT_STATUS.COMPLETED,
          completed_at: new Date().toISOString()
        })
        .eq('quiz_id', quiz.id)

      if (participantsError) {
        console.error('Error updating participants:', participantsError)
      }

      // Redirect to results
      window.location.href = '/admin/quiz-results'
    } catch (error) {
      console.error('Error in completeQuiz:', error)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
      updateQuizQuestion(currentQuestionIndex - 1)
    }
  }

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'mcq':
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  option === question.correct_answer 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300'
                }`}></div>
                <span className={`text-gray-700 ${
                  option === question.correct_answer ? 'font-bold text-green-600' : ''
                }`}>
                  {option}
                  {option === question.correct_answer && ' (Correct)'}
                </span>
              </div>
            ))}
          </div>
        )

      case 'true_false':
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <div key={option} className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full border-2 ${
                  option === question.correct_answer 
                    ? 'bg-green-500 border-green-500' 
                    : 'border-gray-300'
                }`}></div>
                <span className={`text-gray-700 ${
                  option === question.correct_answer ? 'font-bold text-green-600' : ''
                }`}>
                  {option}
                  {option === question.correct_answer && ' (Correct)'}
                </span>
              </div>
            ))}
          </div>
        )

      case 'short_answer':
        return (
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-600 mb-2">Correct Answer:</p>
            <p className="font-semibold text-green-600">{question.correct_answer}</p>
          </div>
        )

      default:
        return <p className="text-gray-500">Question type not supported</p>
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Questions Found</h1>
          <p className="text-gray-600 mb-6">This quiz doesn't have any questions yet.</p>
          <button 
            className="btn-secondary w-full"
            onClick={() => window.location.href = '/admin/dashboard'}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === questions.length - 1

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quiz?.title}</h1>
                <p className="text-gray-600">Admin Control Panel</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Question</p>
              <p className="font-semibold text-gray-900">{currentQuestionIndex + 1} of {questions.length}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Question Display */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-8 mb-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {currentQuestion.question}
                </h2>
                <div className="text-sm text-gray-500 mb-4">
                  Type: {currentQuestion.type.replace('_', ' ').toUpperCase()}
                </div>
              </div>

              {renderQuestion(currentQuestion)}

              {error && (
                <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg mt-4">
                  {error}
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center">
                <button
                  onClick={handlePreviousQuestion}
                  disabled={isFirstQuestion}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    isFirstQuestion 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Previous
                </button>

                <div className="flex items-center space-x-4">
                  {showNextTimer && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Moving to next question in:</p>
                      <p className="text-2xl font-bold text-blue-600">{nextTimer}</p>
                    </div>
                  )}
                  
                  <button
                    onClick={handleNextQuestion}
                    className={`px-6 py-2 rounded-lg font-medium ${
                      isLastQuestion
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isLastQuestion ? 'Complete Quiz' : 'Next Question'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Participants Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Participants</h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participants.length === 0 ? (
                  <p className="text-gray-500 text-center">No participants yet</p>
                ) : (
                  participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{participant.name}</p>
                        <p className="text-sm text-gray-600">
                          {participant.status === PARTICIPANT_STATUS.WAITING && 'Waiting'}
                          {participant.status === PARTICIPANT_STATUS.PLAYING && 'Playing'}
                          {participant.status === PARTICIPANT_STATUS.COMPLETED && 'Completed'}
                        </p>
                      </div>
                      <div className={`w-3 h-3 rounded-full ${
                        participant.status === PARTICIPANT_STATUS.WAITING ? 'bg-yellow-400' :
                        participant.status === PARTICIPANT_STATUS.PLAYING ? 'bg-blue-400' :
                        'bg-green-400'
                      }`}></div>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Total: {participants.length} participants
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminQuiz
