import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, QUESTION_TYPES } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const CreateQuiz = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    accessCode: '',
    totalTimerMinutes: null,
    questionTimerSeconds: null,
    passingScore: 70,
    showResults: true,
    allowRetake: false,
    shuffleQuestions: false
  })
  const [questions, setQuestions] = useState([
    {
      text: '',
      type: QUESTION_TYPES.MCQ,
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1,
      explanation: '',
      difficulty: 'medium'
    }
  ])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('details')

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
        correctAnswer: '',
        points: 1,
        explanation: '',
        difficulty: 'medium'
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

  const addOption = (questionIndex) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options.push('')
    setQuestions(updatedQuestions)
  }

  const removeOption = (questionIndex, optionIndex) => {
    const updatedQuestions = [...questions]
    updatedQuestions[questionIndex].options.splice(optionIndex, 1)
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
            description: quizData.description.trim(),
            access_code: quizData.accessCode.trim().toUpperCase(),
            status: QUIZ_STATUS.WAITING,
            total_timer_minutes: quizData.totalTimerMinutes || null,
            question_timer_seconds: quizData.questionTimerSeconds || null,
            passing_score: quizData.passingScore,
            show_results: quizData.showResults,
            allow_retake: quizData.allowRetake,
            shuffle_questions: quizData.shuffleQuestions
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
        points: q.points,
        explanation: q.explanation,
        difficulty: q.difficulty,
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
      setQuizData({ 
        title: '', 
        description: '',
        accessCode: '', 
        totalTimerMinutes: null, 
        questionTimerSeconds: null,
        passingScore: 70,
        showResults: true,
        allowRetake: false,
        shuffleQuestions: false
      })
      setQuestions([{
        text: '',
        type: QUESTION_TYPES.MCQ,
        options: ['', '', '', ''],
        correctAnswer: '',
        points: 1,
        explanation: '',
        difficulty: 'medium'
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
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="border-b border-gray-200 p-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Create Quiz</h1>
                <p className="text-gray-600">Build engaging quizzes like FlexiQuiz</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Quiz Details
              </button>
              <button
                onClick={() => setActiveTab('questions')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'questions'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Questions ({questions.length})
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'settings'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Settings
              </button>
            </nav>
          </div>

          <form onSubmit={handleSubmit} className="p-6">
            {/* Quiz Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      value={quizData.title}
                      onChange={(e) => setQuizData({ ...quizData, title: e.target.value })}
                      placeholder="Enter an engaging quiz title"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Code *
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
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => setQuizData({ ...quizData, description: e.target.value })}
                    placeholder="Describe what this quiz is about..."
                    className="input-field"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">Questions</h2>
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="btn-primary"
                  >
                    + Add Question
                  </button>
                </div>

                {questions.map((question, index) => (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Question {index + 1}</h3>
                      <div className="flex items-center space-x-2">
                        <select
                          value={question.difficulty}
                          onChange={(e) => updateQuestion(index, 'difficulty', e.target.value)}
                          className="text-sm border border-gray-300 rounded px-2 py-1"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                        <input
                          type="number"
                          value={question.points}
                          onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 1)}
                          className="w-16 text-sm border border-gray-300 rounded px-2 py-1"
                          min="1"
                          max="10"
                        />
                        <span className="text-sm text-gray-500">points</span>
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
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Text *
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Correct Answer *
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

                      {question.type === QUESTION_TYPES.MCQ && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Options
                          </label>
                          <div className="space-y-2">
                            {question.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={option}
                                  onChange={(e) => updateOption(index, optionIndex, e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className="input-field flex-1"
                                  required
                                />
                                {question.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() => removeOption(index, optionIndex)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={() => addOption(index)}
                              className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                              + Add Option
                            </button>
                          </div>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Explanation (Optional)
                        </label>
                        <textarea
                          value={question.explanation}
                          onChange={(e) => updateQuestion(index, 'explanation', e.target.value)}
                          placeholder="Explain why this answer is correct..."
                          className="input-field"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      value={quizData.passingScore}
                      onChange={(e) => setQuizData({ ...quizData, passingScore: parseInt(e.target.value) || 70 })}
                      className="input-field"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showResults"
                        checked={quizData.showResults}
                        onChange={(e) => setQuizData({ ...quizData, showResults: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="showResults" className="ml-2 block text-sm text-gray-900">
                        Show results immediately after quiz
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allowRetake"
                        checked={quizData.allowRetake}
                        onChange={(e) => setQuizData({ ...quizData, allowRetake: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allowRetake" className="ml-2 block text-sm text-gray-900">
                        Allow participants to retake quiz
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="shuffleQuestions"
                        checked={quizData.shuffleQuestions}
                        onChange={(e) => setQuizData({ ...quizData, shuffleQuestions: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="shuffleQuestions" className="ml-2 block text-sm text-gray-900">
                        Shuffle question order
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

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
            <div className="flex space-x-4 pt-6 border-t border-gray-200">
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
