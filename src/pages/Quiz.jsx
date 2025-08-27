import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase, TABLES, PARTICIPANT_STATUS, QUESTION_TYPES, performanceUtils, rateLimiter, errorHandler } from '../utils/supabaseClient'
import logo from '../assets/logo.png'
import PerformanceMonitor from '../components/PerformanceMonitor'


const Quiz = () => {
  const [quiz, setQuiz] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizCompleted, setQuizCompleted] = useState(false)
  const [quizStatus, setQuizStatus] = useState('waiting')
  
  // Timer states
  const [totalTimeLeft, setTotalTimeLeft] = useState(null)
  const [questionTimeLeft, setQuestionTimeLeft] = useState(null)
  const [startTime, setStartTime] = useState(null)
  const [questionStartTime, setQuestionStartTime] = useState(null)
  
  // Question feedback states
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackData, setFeedbackData] = useState({
    isCorrect: false,
    points: 0,
    correctAnswer: '',
    userAnswer: ''
  })
  
  // Question switching timer states
  const [showQuestionTimer, setShowQuestionTimer] = useState(false)
  const [questionTimer, setQuestionTimer] = useState(3)
  
  // Submit and wait states
  const [showWaitScreen, setShowWaitScreen] = useState(false)
  const [submittedAnswers, setSubmittedAnswers] = useState({})

  useEffect(() => {
    // Get quiz and participant info from session storage
    const quizData = sessionStorage.getItem('currentQuiz')
    const participantData = sessionStorage.getItem('currentParticipant')
    
    if (!quizData || !participantData) {
      window.location.href = '/'
      return
    }

    const quizObj = JSON.parse(quizData)
    const participantObj = JSON.parse(participantData)
    
    setQuiz(quizObj)
    setParticipant(participantObj)
    setQuizStatus(quizObj.status)

    // Fetch quiz questions
    fetchQuestions(quizObj.id)
  }, [])

  // Initialize timers when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && quiz) {
      initializeTimers()
    }
  }, [questions, quiz])

  // Total quiz timer effect
  useEffect(() => {
    if (totalTimeLeft !== null && totalTimeLeft > 0 && quizStatus === 'playing') {
      const timer = setInterval(() => {
        setTotalTimeLeft(prev => {
          if (prev <= 1) {
            // Time's up! Auto-submit quiz
            handleAutoSubmit()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [totalTimeLeft, quizStatus])

  // Question timer effect
  useEffect(() => {
    if (questionTimeLeft !== null && questionTimeLeft > 0 && quizStatus === 'playing') {
      const timer = setInterval(() => {
        setQuestionTimeLeft(prev => {
          if (prev <= 1) {
            // Question time's up! Move to next question
            handleQuestionTimeout()
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [questionTimeLeft, currentQuestionIndex, quizStatus])

    // Listen for admin-controlled question changes with optimized subscription
  useEffect(() => {
    if (!quiz) return

    // Rate limiting check
    const clientKey = `quiz-${quiz.id}-${participant?.id || 'anonymous'}`
    if (!rateLimiter.isAllowed(clientKey, 200, 60000)) {
      console.warn('Rate limit exceeded for quiz subscription')
      return
    }

    const quizSubscription = performanceUtils.createOptimizedSubscription(
      'participant-quiz-control',
      TABLES.QUIZZES,
      `id=eq.${quiz.id}`,
      (payload) => {
        console.log('Quiz change:', payload)
        if (payload.new) {
          // Update quiz status
          setQuizStatus(payload.new.status)
          
          // Update current question index if available
          if (payload.new.current_question_index !== undefined) {
            // Show question switching timer
            if (payload.new.current_question_index !== currentQuestionIndex) {
              setShowQuestionTimer(true)
              setQuestionTimer(3)
              
              const countdown = setInterval(() => {
                setQuestionTimer(prev => {
                  if (prev <= 1) {
                    clearInterval(countdown)
                    setShowQuestionTimer(false)
                    setCurrentQuestionIndex(payload.new.current_question_index)
                    initializeQuestionTimer()
                    // Reset submitted answers for new question
                    setSubmittedAnswers({})
                    setShowWaitScreen(false)
                    return 3
                  }
                  return prev - 1
                })
              }, 1000)
            }
          }
        }
      }
    )

    return () => {
      quizSubscription.unsubscribe()
    }
  }, [quiz, currentQuestionIndex, questions, participant?.id])

  const initializeTimers = () => {
    // Set total quiz timer
    if (quiz.total_timer_minutes) {
      setTotalTimeLeft(quiz.total_timer_minutes * 60) // Convert to seconds
      setStartTime(new Date())
    }

    // Set question timer for first question (use global timer from quiz)
    if (questions.length > 0 && quiz.question_timer_seconds) {
      setQuestionTimeLeft(quiz.question_timer_seconds)
      setQuestionStartTime(new Date())
    }
  }

  const initializeQuestionTimer = () => {
    // Set question timer for current question (use global timer from quiz)
    if (questions[currentQuestionIndex] && quiz.question_timer_seconds) {
      setQuestionTimeLeft(quiz.question_timer_seconds)
      setQuestionStartTime(new Date())
    } else {
      setQuestionTimeLeft(null)
      setQuestionStartTime(null)
    }
  }

  const handleQuestionTimeout = () => {
    // Hide wait screen first
    setShowWaitScreen(false)
    
    // Auto-save current answer if any
    const currentQuestion = questions[currentQuestionIndex]
    const userAnswer = answers[currentQuestion.id] || ''
    
    // Check if answer is correct
    const isCorrect = userAnswer === currentQuestion.correct_answer
    const points = isCorrect ? (currentQuestion.points || 1) : 0
    
    // Show feedback
    setFeedbackData({
      isCorrect,
      points,
      correctAnswer: currentQuestion.correct_answer,
      userAnswer: userAnswer
    })
    setShowFeedback(true)
    
    // Hide feedback after 3 seconds and move to next question
    setTimeout(() => {
      setShowFeedback(false)
      
      // Move to next question or complete quiz
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(prev => prev + 1)
        // Set timer for next question (use global timer from quiz)
        const nextQuestion = questions[currentQuestionIndex + 1]
        if (nextQuestion && quiz.question_timer_seconds) {
          setQuestionTimeLeft(quiz.question_timer_seconds)
          setQuestionStartTime(new Date())
        } else {
          setQuestionTimeLeft(null)
          setQuestionStartTime(null)
        }
      } else {
        // Last question, complete quiz
        handleSubmitQuiz()
      }
    }, 3000)
  }

  const handleAutoSubmit = () => {
    // Auto-submit quiz when total time expires
    handleSubmitQuiz()
  }

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

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }))
  }

  const handleAnswerSubmit = useCallback((questionId) => {
    // Rate limiting check
    const clientKey = `answer-submit-${participant?.id || 'anonymous'}`
    if (!rateLimiter.isAllowed(clientKey, 50, 60000)) {
      setError('Too many answer submissions. Please wait a moment.')
      return
    }

    const currentQuestion = questions[currentQuestionIndex]
    const userAnswer = answers[questionId] || ''
    
    // Store the submitted answer
    setSubmittedAnswers(prev => ({
      ...prev,
      [questionId]: userAnswer
    }))
    
    // Show wait screen
    setShowWaitScreen(true)
    
    // Disable the submit button for this question
    setAnswers(prev => ({
      ...prev,
      [questionId]: userAnswer
    }))
  }, [questions, currentQuestionIndex, answers, participant?.id])

  const handleSubmitQuiz = useCallback(async () => {
    try {
      // Rate limiting check
      const clientKey = `quiz-submit-${participant?.id || 'anonymous'}`
      if (!rateLimiter.isAllowed(clientKey, 10, 60000)) {
        setError('Too many quiz submissions. Please wait a moment.')
        return
      }

      // Calculate time taken for each answer
      const answerEntries = Object.entries(answers).map(([questionId, answer]) => {
        const question = questions.find(q => q.id === questionId)
        const timeTaken = questionStartTime ? Math.floor((new Date() - questionStartTime) / 1000) : null
        
        return {
          quiz_id: quiz.id,
          participant_id: participant.id,
          question_id: questionId,
          answer: answer,
          submitted_at: new Date().toISOString(),
          time_taken_seconds: timeTaken
        }
      })

      // Use retry mechanism for database operations
      await performanceUtils.retryOperation(async () => {
        const { error } = await supabase
          .from(TABLES.ANSWERS)
          .insert(answerEntries)

        if (error) {
          console.error('Error saving answers:', error)
          throw new Error('Failed to submit answers')
        }
      })

      // Update participant status to completed
      await performanceUtils.retryOperation(async () => {
        const { error: participantError } = await supabase
          .from(TABLES.PARTICIPANTS)
          .update({ 
            status: PARTICIPANT_STATUS.COMPLETED,
            completed_at: new Date().toISOString()
          })
          .eq('id', participant.id)

        if (participantError) {
          console.error('Error updating participant status:', participantError)
          throw participantError
        }
      })

      setQuizCompleted(true)
    } catch (error) {
      console.error('Error in handleSubmitQuiz:', error)
      setError('Failed to submit quiz')
    }
  }, [answers, questions, questionStartTime, quiz?.id, participant?.id])

  const formatTime = (seconds) => {
    if (seconds === null) return null
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const renderQuestion = (question) => {
    const currentAnswer = answers[question.id] || ''

    switch (question.type) {
      case QUESTION_TYPES.MCQ:
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 flex-1">{option}</span>
              </label>
            ))}
          </div>
        )

      case QUESTION_TYPES.TRUE_FALSE:
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700 flex-1">{option}</span>
              </label>
            ))}
          </div>
        )

      case QUESTION_TYPES.SHORT_ANSWER:
        return (
          <textarea
            value={currentAnswer}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
          />
        )

      default:
        return <p className="text-gray-500">Question type not supported</p>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz questions...</p>
        </div>
      </div>
    )
  }

  if (quizCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-32 h-32 mx-auto mb-3 flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-green-600 mb-4">Quiz Completed!</h1>
          <p className="text-gray-600 mb-6">Thank you for participating in the quiz</p>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Quiz</p>
            <p className="font-semibold text-green-800 text-lg">{quiz?.title}</p>
            <p className="text-sm text-gray-600 mb-2 mt-3">Participant</p>
            <p className="font-semibold text-green-800 text-lg">{participant?.name}</p>
          </div>

          <button 
            className="btn-primary w-full"
            onClick={() => {
              sessionStorage.removeItem('currentQuiz')
              sessionStorage.removeItem('currentParticipant')
              window.location.href = '/'
            }}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="mb-6">
            <div className="w-32 h-32 mx-auto mb-3 flex items-center justify-center">
              <img src={logo} alt="Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-4">No Questions Found</h1>
          <p className="text-gray-600 mb-6">This quiz doesn't have any questions yet.</p>
          
          <button 
            className="btn-secondary w-full"
            onClick={() => window.location.href = '/'}
          >
            Back to Home
          </button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]
  const hasAnsweredCurrent = answers[currentQuestion.id]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      {/* Question Switching Timer Overlay */}
      {showQuestionTimer && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-6xl font-bold">{questionTimer}</span>
            </div>
            <h2 className="text-3xl font-bold mb-2">Next Question</h2>
            <p className="text-xl opacity-90">Preparing your next question...</p>
          </div>
        </div>
      )}

      {/* Wait Screen Overlay */}
      {showWaitScreen && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center text-white">
            <div className="w-32 h-32 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold mb-2">Wait a minute...</h2>
            <p className="text-xl opacity-90">Your answer has been submitted. Please wait for the timer to complete.</p>
          </div>
        </div>
      )}

      {/* Question Feedback Overlay */}
      {showFeedback && (
        <div className="fixed inset-0 bg-blue-600 bg-opacity-95 flex items-center justify-center z-50">
          <div className="text-center text-white">
            {feedbackData.isCorrect ? (
              <div className="space-y-4">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold">Correct!</h2>
                <div className="text-2xl font-bold">+{feedbackData.points} points</div>
                <p className="opacity-90">Great job! Moving to next question...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="w-24 h-24 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold">Wrong!</h2>
                <div className="text-2xl font-bold">+0 points</div>
                <div className="space-y-2">
                  <p className="opacity-90">Your answer: <span className="font-semibold">{feedbackData.userAnswer || 'No answer'}</span></p>
                  <p className="opacity-90">Correct answer: <span className="font-semibold">{feedbackData.correctAnswer}</span></p>
                </div>
                <p className="opacity-90">Moving to next question...</p>
              </div>
            )}
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{quiz?.title}</h1>
                <p className="text-gray-600">Question {currentQuestionIndex + 1} of {questions.length}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Participant</p>
              <p className="font-semibold text-gray-900">{participant?.name}</p>
            </div>
          </div>
        </div>

        {/* Quiz Status */}
        {quizStatus === 'waiting' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6 text-center">
            <div className="text-yellow-800">
              <h2 className="text-xl font-semibold mb-2">Waiting for Admin</h2>
              <p>The admin will start the quiz soon. Please wait...</p>
            </div>
          </div>
        )}

        {/* Progress Bar and Timers */}
        {quizStatus === 'playing' && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">Progress</span>
              <span className="text-sm font-medium text-gray-900">
                {Object.keys(answers).length} / {questions.length} answered
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
              ></div>
            </div>
            
            {/* Timer Display */}
            <div className="flex justify-between items-center">
              {totalTimeLeft !== null && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Total Time:</span>
                  <span className={`text-lg font-bold ${totalTimeLeft <= 60 ? 'text-red-600' : 'text-blue-600'}`}>
                    {formatTime(totalTimeLeft)}
                  </span>
                </div>
              )}
              
              {questionTimeLeft !== null && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Question Time:</span>
                  <span className={`text-lg font-bold ${questionTimeLeft <= 10 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatTime(questionTimeLeft)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question */}
        {quizStatus === 'playing' && currentQuestion && (
          <div className="bg-white rounded-lg shadow-md p-8 mb-6">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900">
                  {currentQuestion.question}
                </h2>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    currentQuestion.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                    currentQuestion.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {currentQuestion.difficulty}
                  </span>
                  <span className="text-sm text-gray-500">{currentQuestion.points} points</span>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-4">
                Type: {currentQuestion.type.replace('_', ' ').toUpperCase()}
              </div>
            </div>

                         {renderQuestion(currentQuestion)}

                           {/* Submit Answer Button */}
              <div className="mt-6 text-center">
                <button
                  onClick={() => handleAnswerSubmit(currentQuestion.id)}
                  disabled={!answers[currentQuestion.id] || submittedAnswers[currentQuestion.id]}
                  className={`px-6 py-3 rounded-lg font-medium ${
                    !answers[currentQuestion.id] || submittedAnswers[currentQuestion.id]
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {submittedAnswers[currentQuestion.id] ? 'Answer Submitted' : 'Submit Answer'}
                </button>
              </div>

             {error && (
               <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg mt-4">
                 {error}
               </div>
             )}
          </div>
        )}

        {/* Submit Quiz Button */}
        {quizStatus === 'playing' && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                The admin controls when to move to the next question.
              </p>
              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleSubmitQuiz}
                  disabled={Object.keys(answers).length < questions.length}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    Object.keys(answers).length < questions.length
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  Submit Quiz
                </button>
              </div>
            </div>
          </div>
                 )}
       </div>
       
       {/* Performance Monitor */}
       <PerformanceMonitor isAdmin={false} />
     </div>
   )
 }

export default Quiz
