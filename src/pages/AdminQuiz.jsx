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
  const [quizStatus, setQuizStatus] = useState('waiting')
  const [showParticipantList, setShowParticipantList] = useState(true)

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
        setQuizStatus(quizObj.status)
        setCurrentQuestionIndex(quizObj.current_question_index || 0)
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

  // Subscribe to quiz status updates
  useEffect(() => {
    if (!quiz) return

    const quizSubscription = supabase
      .channel('admin-quiz-status')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.QUIZZES,
          filter: `id=eq.${quiz.id}`
        }, 
        (payload) => {
          console.log('Quiz status change:', payload)
          if (payload.new) {
            setQuizStatus(payload.new.status)
            setCurrentQuestionIndex(payload.new.current_question_index || 0)
          }
        }
      )
      .subscribe()

    return () => {
      quizSubscription.unsubscribe()
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

  const startQuiz = async () => {
    try {
      console.log('Starting quiz with ID:', quiz.id)
      console.log('Current quiz status:', quiz.status)
      
      // First, let's check if the quiz exists and get its current state
      const { data: currentQuiz, error: fetchError } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('id', quiz.id)
        .single()

      if (fetchError) {
        console.error('Error fetching current quiz:', fetchError)
        setError(`Failed to fetch quiz: ${fetchError.message}`)
        return
      }

      console.log('Current quiz data:', currentQuiz)

      // Try to update with all new columns first
      let updateData, error
      
      try {
        const result = await supabase
          .from(TABLES.QUIZZES)
          .update({ 
            status: QUIZ_STATUS.PLAYING,
            current_question_index: 0
          })
          .eq('id', quiz.id)
          .select()
        
        updateData = result.data
        error = result.error
      } catch (columnError) {
        console.log('Column current_question_index might not exist, trying without it...')
        
        // Fallback: try updating only the status
        const result = await supabase
          .from(TABLES.QUIZZES)
          .update({ 
            status: QUIZ_STATUS.PLAYING
          })
          .eq('id', quiz.id)
          .select()
        
        updateData = result.data
        error = result.error
      }

      if (error) {
        console.error('Error starting quiz:', error)
        console.error('Error details:', error.details)
        console.error('Error hint:', error.hint)
        setError(`Failed to start quiz: ${error.message}`)
        return
      }

      console.log('Quiz updated successfully:', updateData)
      setQuizStatus(QUIZ_STATUS.PLAYING)
      setCurrentQuestionIndex(0)
      setError('')
    } catch (error) {
      console.error('Error in startQuiz:', error)
      setError(`Failed to start quiz: ${error.message}`)
    }
  }

  const pauseQuiz = async () => {
    try {
      const { error } = await supabase
        .from(TABLES.QUIZZES)
        .update({ status: QUIZ_STATUS.WAITING })
        .eq('id', quiz.id)

      if (error) {
        console.error('Error pausing quiz:', error)
        setError('Failed to pause quiz')
        return
      }

      setQuizStatus(QUIZ_STATUS.WAITING)
      setError('')
    } catch (error) {
      console.error('Error in pauseQuiz:', error)
      setError('Failed to pause quiz')
    }
  }

  const stopQuiz = async () => {
    try {
      const { error } = await supabase
        .from(TABLES.QUIZZES)
        .update({ status: QUIZ_STATUS.COMPLETED })
        .eq('id', quiz.id)

      if (error) {
        console.error('Error stopping quiz:', error)
        setError('Failed to stop quiz')
        return
      }

      setQuizStatus(QUIZ_STATUS.COMPLETED)
      setError('')
      
      // Redirect to results page
      window.location.href = '/admin/results'
    } catch (error) {
      console.error('Error in stopQuiz:', error)
      setError('Failed to stop quiz')
    }
  }

  const handleNextQuestion = async () => {
    if (currentQuestionIndex >= questions.length - 1) {
      // Last question, complete quiz
      await stopQuiz()
      return
    }

    setShowNextTimer(true)
    setNextTimer(3)

    const countdown = setInterval(() => {
      setNextTimer(prev => {
        if (prev <= 1) {
          clearInterval(countdown)
          setShowNextTimer(false)
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
        .update({ current_question_index: questionIndex })
        .eq('id', quiz.id)

      if (error) {
        console.error('Error updating question:', error)
        setError('Failed to move to next question')
        return
      }

      setCurrentQuestionIndex(questionIndex)
      setError('')
    } catch (error) {
      console.error('Error in updateQuizQuestion:', error)
      setError('Failed to move to next question')
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      updateQuizQuestion(currentQuestionIndex - 1)
    }
  }

  const completeQuiz = async () => {
    await stopQuiz()
  }

  const renderQuestion = (question) => {
    if (!question) return null

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs rounded-full ${
                question.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {question.difficulty}
              </span>
              <span className="text-sm text-gray-500">{question.points} points</span>
            </div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {question.question}
          </h2>
          <div className="text-sm text-gray-500 mb-4">
            Type: {question.type.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {question.type === 'mcq' && question.options && (
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900 mb-3">Options:</h3>
            {question.options.map((option, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-500">{String.fromCharCode(65 + index)}.</span>
                <span className="text-gray-700">{option}</span>
                {option === question.correct_answer && (
                  <span className="ml-auto text-green-600 font-medium">✓ Correct</span>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-medium text-green-900 mb-2">Correct Answer:</h3>
          <p className="text-green-800">{question.correct_answer}</p>
          {question.explanation && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <h4 className="font-medium text-green-900 mb-1">Explanation:</h4>
              <p className="text-green-700 text-sm">{question.explanation}</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'playing': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getParticipantStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'playing': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
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

  const currentQuestion = questions[currentQuestionIndex]
  const waitingParticipants = participants.filter(p => p.status === 'waiting').length
  const playingParticipants = participants.filter(p => p.status === 'playing').length
  const completedParticipants = participants.filter(p => p.status === 'completed').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
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
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quizStatus)}`}>
                {quizStatus.toUpperCase()}
              </span>
              <button
                onClick={() => setShowParticipantList(!showParticipantList)}
                className="text-blue-600 hover:text-blue-700"
              >
                {showParticipantList ? 'Hide' : 'Show'} Participants
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quiz Controls */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Quiz Controls</h2>
              <div className="flex flex-wrap gap-3">
                {quizStatus === 'waiting' && (
                  <button
                    onClick={startQuiz}
                    className="btn-primary"
                  >
                    ▶️ Start Quiz
                  </button>
                )}
                {quizStatus === 'playing' && (
                  <>
                    <button
                      onClick={pauseQuiz}
                      className="btn-secondary"
                    >
                      ⏸️ Pause Quiz
                    </button>
                    <button
                      onClick={stopQuiz}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
                    >
                      ⏹️ Stop Quiz
                    </button>
                  </>
                )}
                {quizStatus === 'paused' && (
                  <button
                    onClick={startQuiz}
                    className="btn-primary"
                  >
                    ▶️ Resume Quiz
                  </button>
                )}
              </div>
            </div>

            {/* Current Question */}
            {currentQuestion && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Question</h2>
                {renderQuestion(currentQuestion)}
              </div>
            )}

            {/* Question Navigation */}
            {quizStatus === 'playing' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Question Navigation</h2>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className={`px-4 py-2 rounded-lg font-medium ${
                      currentQuestionIndex === 0
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    ← Previous Question
                  </button>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-600">Question Progress</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {currentQuestionIndex + 1} / {questions.length}
                    </div>
                  </div>

                  <button
                    onClick={handleNextQuestion}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    {currentQuestionIndex >= questions.length - 1 ? 'Complete Quiz' : 'Next Question →'}
                  </button>
                </div>
              </div>
            )}

            {/* Next Question Timer */}
            {showNextTimer && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                <div className="text-2xl font-bold text-blue-600 mb-2">
                  Moving to next question in {nextTimer}...
                </div>
                <div className="text-blue-600">All participants will see the next question automatically</div>
              </div>
            )}
          </div>

          {/* Participant Sidebar */}
          {showParticipantList && (
            <div className="bg-white rounded-lg shadow-md p-6 h-fit">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Participants</h2>
              
              {/* Participant Stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 bg-yellow-50 rounded">
                  <div className="text-lg font-bold text-yellow-600">{waitingParticipants}</div>
                  <div className="text-xs text-yellow-600">Waiting</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="text-lg font-bold text-green-600">{playingParticipants}</div>
                  <div className="text-xs text-green-600">Playing</div>
                </div>
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="text-lg font-bold text-blue-600">{completedParticipants}</div>
                  <div className="text-xs text-blue-600">Completed</div>
                </div>
              </div>

              {/* Participant List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {participants.map((participant) => (
                  <div key={participant.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div>
                      <div className="font-medium text-gray-900">{participant.name}</div>
                      <div className="text-xs text-gray-500">
                        Joined: {new Date(participant.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getParticipantStatusColor(participant.status)}`}>
                      {participant.status}
                    </span>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No participants yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mt-6 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminQuiz
