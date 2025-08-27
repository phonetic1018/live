import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, TABLES, QUIZ_STATUS, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const AdminQuiz = () => {
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
  const [optionCounts, setOptionCounts] = useState({})

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated')
    
    if (adminAuth === 'true') {
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
            // Reset option counts when question changes
            setOptionCounts({})
          }
        }
      )
      .subscribe()

    return () => {
      quizSubscription.unsubscribe()
    }
  }, [quiz])

  // Subscribe to answer updates
  useEffect(() => {
    if (!quiz || !questions[currentQuestionIndex]) return

    const currentQuestion = questions[currentQuestionIndex]
    console.log('Setting up answer subscription for question:', currentQuestion.id)

    const answerSubscription = supabase
      .channel('admin-answers')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.ANSWERS,
          filter: `question_id=eq.${currentQuestion.id}`
        }, 
        (payload) => {
          console.log('Answer change:', payload)
          // Refresh option counts when new answers are submitted
          fetchOptionCounts(currentQuestion.id)
        }
      )
      .subscribe()

    // Initial fetch of option counts
    fetchOptionCounts(currentQuestion.id)

    return () => {
      answerSubscription.unsubscribe()
    }
  }, [quiz, currentQuestionIndex, questions])

  const fetchQuestions = async (quizId) => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from(TABLES.QUESTIONS)
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching questions:', error)
        setError('Failed to fetch questions')
        return
      }

      setQuestions(data || [])
    } catch (error) {
      console.error('Error fetching questions:', error)
      setError('Failed to fetch questions')
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
      console.error('Error fetching participants:', error)
    }
  }

  const fetchOptionCounts = async (questionId) => {
    if (!questionId) return

    try {
      const { data, error } = await supabase
        .from(TABLES.ANSWERS)
        .select('answer')
        .eq('question_id', questionId)

      if (error) {
        console.error('Error fetching option counts:', error)
        return
      }

      // Count occurrences of each answer
      const counts = {}
      data.forEach(item => {
        const answer = item.answer
        counts[answer] = (counts[answer] || 0) + 1
      })

      setOptionCounts(counts)
      console.log('Option counts:', counts)
    } catch (error) {
      console.error('Error in fetchOptionCounts:', error)
    }
  }

  const startQuiz = useCallback(async () => {
    if (!quiz) return

    try {
      console.log('Starting quiz with ID:', quiz.id)
      
      // Update quiz status to PLAYING
      const { error: updateError } = await supabase
        .from(TABLES.QUIZZES)
        .update({ 
          status: QUIZ_STATUS.PLAYING,
          current_question_index: 0
        })
        .eq('id', quiz.id)

      if (updateError) {
        console.error('Failed to start quiz:', updateError)
        setError('Failed to start quiz')
        return
      }

      // Update all participants to playing status
      if (participants.length > 0) {
        const { error: participantsError } = await supabase
          .from(TABLES.PARTICIPANTS)
          .update({ status: PARTICIPANT_STATUS.PLAYING })
          .eq('quiz_id', quiz.id)

        if (participantsError) {
          console.error('Error updating participants:', participantsError)
        }
      }

      setQuizStatus(QUIZ_STATUS.PLAYING)
      setCurrentQuestionIndex(0)
      console.log('Quiz started successfully')
    } catch (error) {
      console.error('Error starting quiz:', error)
      setError('Failed to start quiz')
    }
  }, [quiz, participants])

  const pauseQuiz = async () => {
    if (!quiz) return

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
    } catch (error) {
      console.error('Error pausing quiz:', error)
      setError('Failed to pause quiz')
    }
  }

  const stopQuiz = async () => {
    if (!quiz) return

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
    } catch (error) {
      console.error('Error stopping quiz:', error)
      setError('Failed to stop quiz')
    }
  }

  const handleNextQuestion = async () => {
    if (currentQuestionIndex < questions.length - 1) {
      setShowNextTimer(true)
      setNextTimer(3)
      
      const timer = setInterval(() => {
        setNextTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setShowNextTimer(false)
            setCurrentQuestionIndex(prev => prev + 1)
            
            // Update quiz with new question index
            supabase
              .from(TABLES.QUIZZES)
              .update({ current_question_index: currentQuestionIndex + 1 })
              .eq('id', quiz.id)
              .then(({ error }) => {
                if (error) console.error('Error updating question index:', error)
              })
            
            return 3
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  const handlePreviousQuestion = async () => {
    if (currentQuestionIndex > 0) {
      setShowNextTimer(true)
      setNextTimer(3)
      
      const timer = setInterval(() => {
        setNextTimer(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            setShowNextTimer(false)
            setCurrentQuestionIndex(prev => prev - 1)
            
            // Update quiz with new question index
            supabase
              .from(TABLES.QUIZZES)
              .update({ current_question_index: currentQuestionIndex - 1 })
              .eq('id', quiz.id)
              .then(({ error }) => {
                if (error) console.error('Error updating question index:', error)
              })
            
            return 3
          }
          return prev - 1
        })
      }, 1000)
    }
  }

  const handleShowResults = async () => {
    // Show results for 5 seconds then move to next question
    setTimeout(() => {
      if (currentQuestionIndex < questions.length - 1) {
        handleNextQuestion()
      }
    }, 5000)
  }

  const renderQuestion = () => {
    if (!questions.length || currentQuestionIndex >= questions.length) {
      return (
        <div className="text-center py-8">
          <h3 className="text-xl font-semibold text-gray-700 mb-4">No questions available</h3>
          <p className="text-gray-500">Please add questions to this quiz.</p>
        </div>
      )
    }

    const question = questions[currentQuestionIndex]

    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <span className="text-sm text-gray-500">Question {currentQuestionIndex + 1} of {questions.length}</span>
            <h3 className="text-xl font-semibold text-gray-900 mt-1">{question.question}</h3>
          </div>
          <div className="text-right">
            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mb-1">
              {question.difficulty || 'medium'}
            </span>
            <div className="text-sm text-gray-500">
              Points: {question.points || 1}
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          {question.type === 'mcq' && question.options && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
              <div className="space-y-2">
                {question.options.map((option, index) => (
                  <div key={index} className="flex items-center p-3 border rounded-lg">
                    <span className="text-sm text-gray-600 mr-3">{String.fromCharCode(65 + index)}.</span>
                    <span className="text-gray-900 flex-1">{option}</span>
                    <div className="flex items-center space-x-3">
                      {/* Option Count */}
                      <div className="text-sm text-gray-500">
                        {optionCounts[option] || 0} votes
                      </div>
                      {option === question.correct_answer && (
                        <span className="text-green-600 text-sm font-medium">✓ Correct</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.type === 'true_false' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Options:</p>
              <div className="space-y-2">
                {['True', 'False'].map((option) => (
                  <div key={option} className="flex items-center p-3 border rounded-lg">
                    <span className="text-gray-900 flex-1">{option}</span>
                    <div className="flex items-center space-x-3">
                      {/* Option Count */}
                      <div className="text-sm text-gray-500">
                        {optionCounts[option] || 0} votes
                      </div>
                      {option === question.correct_answer && (
                        <span className="text-green-600 text-sm font-medium">✓ Correct</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.type === 'short_answer' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Correct Answer:</p>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <span className="text-green-800 font-medium">{question.correct_answer}</span>
              </div>
            </div>
          )}

          {/* Option Counts Summary */}
          {(question.type === 'mcq' || question.type === 'true_false') && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700">Response Summary:</h4>
                <button
                  onClick={() => fetchOptionCounts(question.id)}
                  className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="space-y-2">
                {(question.type === 'mcq' ? question.options : ['True', 'False']).map((option, index) => {
                  const count = optionCounts[option] || 0
                  const totalResponses = Object.values(optionCounts).reduce((sum, val) => sum + val, 0)
                  const percentage = totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0
                  
                  return (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {question.type === 'mcq' ? String.fromCharCode(65 + index) + '.' : ''} {option}
                        </span>
                        {option === question.correct_answer && (
                          <span className="text-green-600 text-xs">✓</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        <div className="text-sm text-gray-500">
                          {count} votes ({percentage}%)
                        </div>
                        {/* Progress bar */}
                        <div className="w-20 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div className="text-xs text-gray-500 mt-2">
                  Total responses: {Object.values(optionCounts).reduce((sum, val) => sum + val, 0)}
                </div>
              </div>
            </div>
          )}
        </div>

        {question.explanation && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-medium text-blue-800 mb-1">Explanation:</p>
            <p className="text-blue-700 text-sm">{question.explanation}</p>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No quiz selected</p>
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="btn-primary"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600">Access Code: {quiz.access_code}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-500">Status</div>
                <div className={`font-semibold ${
                  quizStatus === 'waiting' ? 'text-yellow-600' :
                  quizStatus === 'playing' ? 'text-green-600' :
                  'text-red-600'
                }`}>
                  {quizStatus.charAt(0).toUpperCase() + quizStatus.slice(1)}
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/admin/dashboard'}
                className="btn-outline"
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3">
            {/* Quiz Controls */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex flex-wrap gap-4 justify-center">
                {quizStatus === 'waiting' && (
                  <button
                    onClick={startQuiz}
                    className="btn-primary"
                  >
                    Start Quiz
                  </button>
                )}
                
                {quizStatus === 'playing' && (
                  <>
                    <button
                      onClick={pauseQuiz}
                      className="btn-secondary"
                    >
                      Pause Quiz
                    </button>
                    <button
                      onClick={stopQuiz}
                      className="btn-danger"
                    >
                      End Quiz
                    </button>
                  </>
                )}

                {quizStatus === 'completed' && (
                  <button
                    onClick={() => window.location.href = '/admin/quiz-results'}
                    className="btn-primary"
                  >
                    View Results
                  </button>
                )}
              </div>
            </div>

            {/* Current Question */}
            {quizStatus === 'playing' && (
              <div className="mb-6">
                {renderQuestion()}
              </div>
            )}

            {/* Question Navigation */}
            {quizStatus === 'playing' && questions.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-center">
                  <button
                    onClick={handlePreviousQuestion}
                    disabled={currentQuestionIndex === 0}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous Question
                  </button>
                  
                  <div className="text-center">
                    <div className="text-sm text-gray-500">Question Navigation</div>
                    <div className="font-semibold">
                      {currentQuestionIndex + 1} of {questions.length}
                    </div>
                  </div>
                  
                  <button
                    onClick={handleNextQuestion}
                    disabled={currentQuestionIndex === questions.length - 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next Question
                  </button>
                </div>
              </div>
            )}

            {/* Waiting Screen */}
            {quizStatus === 'waiting' && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Quiz is waiting to start</h3>
                <p className="text-gray-500 mb-6">Participants can join using the access code: <span className="font-mono font-semibold">{quiz.access_code}</span></p>
                <div className="text-sm text-gray-400">
                  {participants.length} participant{participants.length !== 1 ? 's' : ''} waiting
                </div>
              </div>
            )}

            {/* Completed Screen */}
            {quizStatus === 'completed' && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <h3 className="text-xl font-semibold text-gray-700 mb-4">Quiz completed</h3>
                <p className="text-gray-500 mb-6">All participants have finished the quiz.</p>
                <button
                  onClick={() => window.location.href = '/admin/quiz-results'}
                  className="btn-primary"
                >
                  View Results
                </button>
              </div>
            )}
          </div>

          {/* Participant Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
                <button
                  onClick={() => setShowParticipantList(!showParticipantList)}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  {showParticipantList ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {showParticipantList && (
                <div className="space-y-3">
                  {participants.length === 0 ? (
                    <p className="text-gray-500 text-sm">No participants yet</p>
                  ) : (
                    participants.map((participant) => (
                      <div key={participant.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium text-gray-900">{participant.name}</div>
                          <div className="text-sm text-gray-500">
                            {participant.email || 'No email'}
                          </div>
                        </div>
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          participant.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                          participant.status === 'playing' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {participant.status}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Question Switching Timer Overlay */}
      {showNextTimer && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="text-6xl font-bold mb-4">{nextTimer}</div>
            <div className="text-xl">Next Question</div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}
    </div>
  )
}

export default AdminQuiz
