import React, { useState, useEffect } from 'react'
import { supabase, TABLES, PARTICIPANT_STATUS, QUESTION_TYPES } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const Quiz = () => {
  const [quiz, setQuiz] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [questions, setQuestions] = useState([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quizCompleted, setQuizCompleted] = useState(false)

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

    // Fetch quiz questions
    fetchQuestions(quizObj.id)
  }, [])

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

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmitQuiz = async () => {
    try {
      // Save all answers to database
      const answerEntries = Object.entries(answers).map(([questionId, answer]) => ({
        quiz_id: quiz.id,
        participant_id: participant.id,
        question_id: questionId,
        answer: answer,
        submitted_at: new Date().toISOString()
      }))

      const { error } = await supabase
        .from(TABLES.ANSWERS)
        .insert(answerEntries)

      if (error) {
        console.error('Error saving answers:', error)
        setError('Failed to submit answers')
        return
      }

      // Update participant status to completed
      const { error: participantError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .update({ status: PARTICIPANT_STATUS.COMPLETED })
        .eq('id', participant.id)

      if (participantError) {
        console.error('Error updating participant status:', participantError)
      }

      setQuizCompleted(true)
    } catch (error) {
      console.error('Error in handleSubmitQuiz:', error)
      setError('Failed to submit quiz')
    }
  }

  const renderQuestion = (question) => {
    const currentAnswer = answers[question.id] || ''

    switch (question.type) {
      case QUESTION_TYPES.MCQ:
        return (
          <div className="space-y-3">
            {question.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )

      case QUESTION_TYPES.TRUE_FALSE:
        return (
          <div className="space-y-3">
            {['True', 'False'].map((option) => (
              <label key={option} className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name={`question-${question.id}`}
                  value={option}
                  checked={currentAnswer === option}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">{option}</span>
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
  const isFirstQuestion = currentQuestionIndex === 0
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const hasAnsweredCurrent = answers[currentQuestion.id]

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

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {Object.keys(answers).length} / {questions.length} answered
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
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

            <div className="flex space-x-2">
              {!isLastQuestion ? (
                <button
                  onClick={handleNextQuestion}
                  disabled={!hasAnsweredCurrent}
                  className={`px-6 py-2 rounded-lg font-medium ${
                    !hasAnsweredCurrent
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  Next
                </button>
              ) : (
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Quiz
