import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, QUESTION_TYPES } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const CreateQuiz = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quizData, setQuizData] = useState({
    title: '',
    accessCode: '',
    totalTimerMinutes: null,
    questionTimerSeconds: null
  })
  const [questions, setQuestions] = useState([
    {
      text: '',
      type: QUESTION_TYPES.MCQ,
      options: ['', '', '', ''],
      correctAnswer: ''
    }
  ])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated')
    
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
      // Get pre-generated access code
      const accessCode = sessionStorage.getItem('newQuizAccessCode')
      if (accessCode) {
        setQuizData(prev => ({ ...prev, accessCode }))
      }
    } else {
      // Redirect to admin login if not authenticated
      window.location.href = '/admin/login'
    }
  }, [])

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        type: QUESTION_TYPES.MCQ,
        options: ['', '', '', ''],
        correctAnswer: ''
      }
    ])
  }

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((_, i) => i !== index))
    }
  }

  const updateQuestion = (index, field, value) => {
    const updatedQuestions = [...questions]
    updatedQuestions[index] = { ...updatedQuestions[index], [field]: value }
    setQuestions(updatedQuestions)
  }

  const updateOption = (questionIndex, optionIndex, value) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options[optionIndex] = value
    setQuestions(updatedQuestions)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Validation
    if (!quizData.title.trim()) {
      setError('Please enter a quiz title')
      setLoading(false)
      return
    }

    if (!quizData.accessCode.trim()) {
      setError('Please enter an access code')
      setLoading(false)
      return
    }

    if (questions.some(q => !q.text.trim())) {
      setError('Please fill in all question texts')
      setLoading(false)
      return
    }

    try {
      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .insert([
          {
            title: quizData.title.trim(),
            access_code: quizData.accessCode.trim().toUpperCase(),
            status: QUIZ_STATUS.WAITING,
            total_timer_minutes: quizData.totalTimerMinutes || null,
            question_timer_seconds: quizData.questionTimerSeconds || null
          }
        ])
        .select()
        .single()

      if (quizError) {
        console.error('Error creating quiz:', quizError)
        setError('Failed to create quiz. Please try again.')
        setLoading(false)
        return
      }

      // Create questions
      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question: q.text.trim(),
        type: q.type,
        options: q.type === QUESTION_TYPES.MCQ ? q.options : null,
        correct_answer: q.correctAnswer.trim(),
        order_index: index,
        question_timer_seconds: quizData.questionTimerSeconds || null
      }))

      const { error: questionsError } = await supabase
        .from(TABLES.QUESTIONS)
        .insert(questionsToInsert)

      if (questionsError) {
        console.error('Error creating questions:', questionsError)
        setError('Quiz created but failed to add questions. Please try again.')
        setLoading(false)
        return
      }

      setSuccess('Quiz created successfully!')
      
      // Clear form
      setQuizData({ title: '', accessCode: '', totalTimerMinutes: null, questionTimerSeconds: null })
      setQuestions([{
        text: '',
        type: QUESTION_TYPES.MCQ,
        options: ['', '', '', ''],
        correctAnswer: ''
      }])

      // Clear session storage
      sessionStorage.removeItem('newQuizAccessCode')

    } catch (error) {
      console.error('Error in handleSubmit:', error)
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>
                <p className="text-gray-600">Create a new quiz with questions and answers</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Quiz Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiz Details</h2>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quiz Title
                  </label>
                  <input
                    type="text"
                    value={quizData.title}
                    onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                    placeholder="Enter quiz title"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Code
                  </label>
                  <input
                    type="text"
                    value={quizData.accessCode}
                    onChange={(e) => setQuizData({ ...quizData, accessCode: e.target.value.toUpperCase() })}
                    placeholder="Enter access code"
                    className="input-field font-mono"
                    maxLength={8}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Timer (minutes)
                  </label>
                  <input
                    type="number"
                    value={quizData.totalTimerMinutes || ''}
                    onChange={(e) => setQuizData({ ...quizData, totalTimerMinutes: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Optional - Leave empty for no limit"
                    className="input-field"
                    min="1"
                    max="180"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for no time limit</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Question Timer (seconds)
                  </label>
                  <input
                    type="number"
                    value={quizData.questionTimerSeconds || ''}
                    onChange={(e) => setQuizData({ ...quizData, questionTimerSeconds: e.target.value ? parseInt(e.target.value) : null })}
                    placeholder="Optional - Leave empty for no limit"
                    className="input-field"
                    min="5"
                    max="300"
                  />
                  <p className="text-xs text-gray-500 mt-1">This timer will apply to all questions individually</p>
                </div>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
                <button
                  type="button"
                  onClick={addQuestion}
                  className="btn-outline"
                >
                  Add Question
                </button>
              </div>

              {questions.map((question, index) => (
                <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Question {index + 1}</h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Text
                      </label>
                      <textarea
                        value={question.text}
                        onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                        placeholder="Enter your question"
                        className="input-field"
                        rows={3}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Type
                      </label>
                      <select
                        value={question.type}
                        onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                        className="input-field"
                      >
                        <option value={QUESTION_TYPES.MCQ}>Multiple Choice</option>
                        <option value={QUESTION_TYPES.TRUE_FALSE}>True/False</option>
                        <option value={QUESTION_TYPES.SHORT_ANSWER}>Short Answer</option>
                      </select>
                    </div>

                    {question.type === QUESTION_TYPES.MCQ && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Options
                        </label>
                        <div className="space-y-2">
                          {question.options.map((option, optionIndex) => (
                            <input
                              key={optionIndex}
                              type="text"
                              value={option}
                              onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                              placeholder={`Option ${optionIndex + 1}`}
                              className="input-field"
                              required
                            />
                          ))}
                        </div>
                      </div>
                    )}

                                         <div>
                       <label className="block text-sm font-medium text-gray-700 mb-2">
                         Correct Answer
                       </label>
                       <input
                         type="text"
                         value={question.correctAnswer}
                         onChange={(e) => updateQuestion(index, 'correctAnswer', e.target.value)}
                         placeholder="Enter correct answer"
                         className="input-field"
                         required
                       />
                     </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Error and Success Messages */}
            {error && (
              <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-lg">
                {success}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex space-x-4">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading}
              >
                {loading ? 'Creating Quiz...' : 'Create Quiz'}
              </button>
              
              <button
                type="button"
                onClick={() => window.location.href = '/admin/dashboard'}
                className="btn-secondary"
              >
                Back to Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default CreateQuiz
