import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, QUESTION_TYPES } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const CreateQuiz = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('basic')
  
  // Basic quiz settings
  const [quizData, setQuizData] = useState({
    title: '',
    description: '',
    access_code: '',
    passing_score: 70,
    show_results: true,
    allow_retake: false,
    shuffle_questions: false,
    total_timer_minutes: null,
    question_timer_seconds: null
  })
  
  // Security settings
  const [securitySettings, setSecuritySettings] = useState({
    require_https: true,
    require_login: false,
    max_attempts: 1,
    prevent_backtracking: true,
    disable_copy_paste: true,
    disable_right_click: true,
    disable_print: true,
    hide_answers_until_complete: true,
    require_honor_code: true,
    allow_file_upload: false,
    ip_restriction_enabled: false,
    allowed_ip_ranges: [],
    proctoring_enabled: false,
    proctoring_url: ''
  })
  
  // Questions state
  const [questions, setQuestions] = useState([])
  const [currentQuestion, setCurrentQuestion] = useState({
    question: '',
    type: QUESTION_TYPES.MCQ,
    options: ['', '', '', ''],
    correct_answer: '',
    points: 1,
    explanation: '',
    difficulty: 'medium',
    question_timer_seconds: null
  })

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated')
    
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
    } else {
      // Redirect to admin login if not authenticated
      window.location.href = '/admin/login'
    }
  }, [])

  const generateAccessCode = () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    setQuizData(prev => ({ ...prev, access_code: code }))
  }

  const handleQuizDataChange = (field, value) => {
    setQuizData(prev => ({ ...prev, [field]: value }))
  }

  const handleSecuritySettingChange = (field, value) => {
    setSecuritySettings(prev => ({ ...prev, [field]: value }))
  }

  const handleQuestionChange = (field, value) => {
    setCurrentQuestion(prev => ({ ...prev, [field]: value }))
  }

  const handleOptionChange = (index, value) => {
    const newOptions = [...currentQuestion.options]
    newOptions[index] = value
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }))
  }

  const addQuestion = () => {
    if (!currentQuestion.question.trim()) {
      setError('Please enter a question')
      return
    }

    if (currentQuestion.type === QUESTION_TYPES.MCQ && currentQuestion.options.some(opt => !opt.trim())) {
      setError('Please fill all MCQ options')
      return
    }

    if (!currentQuestion.correct_answer.trim()) {
      setError('Please enter the correct answer')
      return
    }

    const newQuestion = {
      ...currentQuestion,
      id: Date.now(), // Temporary ID for frontend
      order_index: questions.length
    }

    setQuestions(prev => [...prev, newQuestion])
    
    // Reset current question
    setCurrentQuestion({
      question: '',
      type: QUESTION_TYPES.MCQ,
      options: ['', '', '', ''],
      correct_answer: '',
      points: 1,
      explanation: '',
      difficulty: 'medium',
      question_timer_seconds: null
    })
    
    setError('')
  }

  const removeQuestion = (index) => {
    setQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const handleCreateQuiz = async () => {
    if (!quizData.title.trim()) {
      setError('Please enter a quiz title')
      return
    }

    if (!quizData.access_code.trim()) {
      setError('Please enter an access code')
      return
    }

    // Validate that access code is exactly 6 digits
    if (!/^\d{6}$/.test(quizData.access_code)) {
      setError('Access code must be exactly 6 digits')
      return
    }

    if (questions.length === 0) {
      setError('Please add at least one question')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Create quiz with security settings
      const { data: quiz, error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .insert([{
          ...quizData,
          ...securitySettings,
          status: QUIZ_STATUS.WAITING
        }])
        .select()
        .single()

      if (quizError) {
        console.error('Error creating quiz:', quizError)
        setError('Failed to create quiz')
        setLoading(false)
        return
      }

      // Create questions
      const questionsToInsert = questions.map((q, index) => ({
        quiz_id: quiz.id,
        question: q.question,
        type: q.type,
        options: q.type === QUESTION_TYPES.MCQ ? q.options : [],
        correct_answer: q.correct_answer,
        order_index: index,
        points: q.points,
        explanation: q.explanation,
        difficulty: q.difficulty,
        question_timer_seconds: q.question_timer_seconds
      }))

      const { error: questionsError } = await supabase
        .from(TABLES.QUESTIONS)
        .insert(questionsToInsert)

      if (questionsError) {
        console.error('Error creating questions:', questionsError)
        setError('Quiz created but failed to add questions')
        setLoading(false)
        return
      }

      setSuccess(`Quiz "${quizData.title}" created successfully with access code: ${quizData.access_code}`)
      
      // Reset form
      setQuizData({
        title: '',
        description: '',
        access_code: '',
        passing_score: 70,
        show_results: true,
        allow_retake: false,
        shuffle_questions: false,
        total_timer_minutes: null,
        question_timer_seconds: null
      })
      setSecuritySettings({
        require_https: true,
        require_login: false,
        max_attempts: 1,
        prevent_backtracking: true,
        disable_copy_paste: true,
        disable_right_click: true,
        disable_print: true,
        hide_answers_until_complete: true,
        require_honor_code: true,
        allow_file_upload: false,
        ip_restriction_enabled: false,
        allowed_ip_ranges: [],
        proctoring_enabled: false,
        proctoring_url: ''
      })
      setQuestions([])
      
      setTimeout(() => setSuccess(''), 5000)
    } catch (error) {
      console.error('Error in handleCreateQuiz:', error)
      setError('An error occurred while creating the quiz')
    } finally {
      setLoading(false)
    }
  }

  const addIPRange = () => {
    const range = prompt('Enter IP range (e.g., 192.168.1.0/24):')
    if (range && range.trim()) {
      setSecuritySettings(prev => ({
        ...prev,
        allowed_ip_ranges: [...prev.allowed_ip_ranges, range.trim()]
      }))
    }
  }

  const removeIPRange = (index) => {
    setSecuritySettings(prev => ({
      ...prev,
      allowed_ip_ranges: prev.allowed_ip_ranges.filter((_, i) => i !== index)
    }))
  }

  if (!isAuthenticated) {
    return <div>Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="Logo" className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800">Create Secure Quiz</h1>
          <p className="text-gray-600 mt-2">Create a new quiz with comprehensive security features</p>
        </div>

        {/* Error and Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
            {success}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm border mb-6">
          <div className="border-b">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'basic', label: 'Basic Settings', icon: '📝' },
                { id: 'security', label: 'Security & Anti-Cheating', icon: '🔒' },
                { id: 'questions', label: 'Questions', icon: '❓' },
                { id: 'preview', label: 'Preview', icon: '👁️' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Basic Settings Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Basic Quiz Information</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quiz Title *
                    </label>
                    <input
                      type="text"
                      value={quizData.title}
                      onChange={(e) => handleQuizDataChange('title', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter quiz title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Access Code *
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={quizData.access_code}
                        onChange={(e) => handleQuizDataChange('access_code', e.target.value.replace(/[^0-9]/g, ''))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter 6-digit access code (e.g., 123456)"
                        maxLength={6}
                        pattern="[0-9]*"
                        inputMode="numeric"
                      />
                      <button
                        type="button"
                        onClick={generateAccessCode}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Generate
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Must be exactly 6 digits (0-9)</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={quizData.description}
                    onChange={(e) => handleQuizDataChange('description', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter quiz description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Passing Score (%)
                    </label>
                    <input
                      type="number"
                      value={quizData.passing_score}
                      onChange={(e) => handleQuizDataChange('passing_score', parseInt(e.target.value))}
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total Timer (minutes)
                    </label>
                    <input
                      type="number"
                      value={quizData.total_timer_minutes || ''}
                      onChange={(e) => handleQuizDataChange('total_timer_minutes', e.target.value ? parseInt(e.target.value) : null)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Question Timer (seconds)
                    </label>
                    <input
                      type="number"
                      value={quizData.question_timer_seconds || ''}
                      onChange={(e) => handleQuizDataChange('question_timer_seconds', e.target.value ? parseInt(e.target.value) : null)}
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="show_results"
                      checked={quizData.show_results}
                      onChange={(e) => handleQuizDataChange('show_results', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="show_results" className="ml-2 block text-sm text-gray-900">
                      Show results to participants
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="allow_retake"
                      checked={quizData.allow_retake}
                      onChange={(e) => handleQuizDataChange('allow_retake', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="allow_retake" className="ml-2 block text-sm text-gray-900">
                      Allow participants to retake the quiz
                    </label>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="shuffle_questions"
                      checked={quizData.shuffle_questions}
                      onChange={(e) => handleQuizDataChange('shuffle_questions', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="shuffle_questions" className="ml-2 block text-sm text-gray-900">
                      Shuffle question order
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Security & Anti-Cheating Controls</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700">Access Controls</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="require_https"
                        checked={securitySettings.require_https}
                        onChange={(e) => handleSecuritySettingChange('require_https', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="require_https" className="ml-2 block text-sm text-gray-900">
                        Require HTTPS connection
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="require_login"
                        checked={securitySettings.require_login}
                        onChange={(e) => handleSecuritySettingChange('require_login', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="require_login" className="ml-2 block text-sm text-gray-900">
                        Require participant login
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Attempts
                      </label>
                      <input
                        type="number"
                        value={securitySettings.max_attempts}
                        onChange={(e) => handleSecuritySettingChange('max_attempts', parseInt(e.target.value))}
                        min="1"
                        max="10"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="ip_restriction_enabled"
                        checked={securitySettings.ip_restriction_enabled}
                        onChange={(e) => handleSecuritySettingChange('ip_restriction_enabled', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="ip_restriction_enabled" className="ml-2 block text-sm text-gray-900">
                        Enable IP address restrictions
                      </label>
                    </div>

                    {securitySettings.ip_restriction_enabled && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Allowed IP Ranges
                        </label>
                        <div className="space-y-2">
                          {securitySettings.allowed_ip_ranges.map((range, index) => (
                            <div key={index} className="flex space-x-2">
                              <input
                                type="text"
                                value={range}
                                readOnly
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                              />
                              <button
                                type="button"
                                onClick={() => removeIPRange(index)}
                                className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addIPRange}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            Add IP Range
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-700">Anti-Cheating Controls</h3>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="prevent_backtracking"
                        checked={securitySettings.prevent_backtracking}
                        onChange={(e) => handleSecuritySettingChange('prevent_backtracking', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="prevent_backtracking" className="ml-2 block text-sm text-gray-900">
                        Prevent backtracking (sequential questions)
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="disable_copy_paste"
                        checked={securitySettings.disable_copy_paste}
                        onChange={(e) => handleSecuritySettingChange('disable_copy_paste', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="disable_copy_paste" className="ml-2 block text-sm text-gray-900">
                        Disable copy and paste
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="disable_right_click"
                        checked={securitySettings.disable_right_click}
                        onChange={(e) => handleSecuritySettingChange('disable_right_click', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="disable_right_click" className="ml-2 block text-sm text-gray-900">
                        Disable right-click context menu
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="disable_print"
                        checked={securitySettings.disable_print}
                        onChange={(e) => handleSecuritySettingChange('disable_print', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="disable_print" className="ml-2 block text-sm text-gray-900">
                        Disable printing
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="hide_answers_until_complete"
                        checked={securitySettings.hide_answers_until_complete}
                        onChange={(e) => handleSecuritySettingChange('hide_answers_until_complete', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="hide_answers_until_complete" className="ml-2 block text-sm text-gray-900">
                        Hide correct answers until quiz completion
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="require_honor_code"
                        checked={securitySettings.require_honor_code}
                        onChange={(e) => handleSecuritySettingChange('require_honor_code', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="require_honor_code" className="ml-2 block text-sm text-gray-900">
                        Require honor code agreement
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="allow_file_upload"
                        checked={securitySettings.allow_file_upload}
                        onChange={(e) => handleSecuritySettingChange('allow_file_upload', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="allow_file_upload" className="ml-2 block text-sm text-gray-900">
                        Allow file uploads (ID proof, handwritten work)
                      </label>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-700">Proctoring Integration</h3>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="proctoring_enabled"
                      checked={securitySettings.proctoring_enabled}
                      onChange={(e) => handleSecuritySettingChange('proctoring_enabled', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="proctoring_enabled" className="ml-2 block text-sm text-gray-900">
                      Enable proctoring integration
                    </label>
                  </div>

                  {securitySettings.proctoring_enabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Proctoring URL (Zoom/Google Meet)
                      </label>
                      <input
                        type="url"
                        value={securitySettings.proctoring_url}
                        onChange={(e) => handleSecuritySettingChange('proctoring_url', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://zoom.us/j/..."
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Questions Tab */}
            {activeTab === 'questions' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Quiz Questions</h2>
                
                {/* Add Question Form */}
                <div className="bg-gray-50 p-6 rounded-lg">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">Add New Question</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question *
                      </label>
                      <textarea
                        value={currentQuestion.question}
                        onChange={(e) => handleQuestionChange('question', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter your question"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Question Type
                        </label>
                        <select
                          value={currentQuestion.type}
                          onChange={(e) => handleQuestionChange('type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value={QUESTION_TYPES.MCQ}>Multiple Choice</option>
                          <option value={QUESTION_TYPES.TRUE_FALSE}>True/False</option>
                          <option value={QUESTION_TYPES.SHORT_ANSWER}>Short Answer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Points
                        </label>
                        <input
                          type="number"
                          value={currentQuestion.points}
                          onChange={(e) => handleQuestionChange('points', parseInt(e.target.value))}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Difficulty
                        </label>
                        <select
                          value={currentQuestion.difficulty}
                          onChange={(e) => handleQuestionChange('difficulty', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                    </div>

                    {currentQuestion.type === QUESTION_TYPES.MCQ && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Options *
                        </label>
                        <div className="space-y-2">
                          {currentQuestion.options.map((option, index) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                name="correct_answer"
                                value={option}
                                checked={currentQuestion.correct_answer === option}
                                onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => handleOptionChange(index, e.target.value)}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder={`Option ${index + 1}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentQuestion.type === QUESTION_TYPES.TRUE_FALSE && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correct Answer *
                        </label>
                        <div className="space-y-2">
                          {['True', 'False'].map((option) => (
                            <div key={option} className="flex items-center">
                              <input
                                type="radio"
                                name="correct_answer"
                                value={option}
                                checked={currentQuestion.correct_answer === option}
                                onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                              />
                              <label className="ml-2 block text-sm text-gray-900">{option}</label>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {currentQuestion.type === QUESTION_TYPES.SHORT_ANSWER && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Correct Answer *
                        </label>
                        <input
                          type="text"
                          value={currentQuestion.correct_answer}
                          onChange={(e) => handleQuestionChange('correct_answer', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter the correct answer"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Explanation (optional)
                      </label>
                      <textarea
                        value={currentQuestion.explanation}
                        onChange={(e) => handleQuestionChange('explanation', e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Explanation for the correct answer"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Question Timer (seconds, optional)
                      </label>
                      <input
                        type="number"
                        value={currentQuestion.question_timer_seconds || ''}
                        onChange={(e) => handleQuestionChange('question_timer_seconds', e.target.value ? parseInt(e.target.value) : null)}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Leave empty to use global timer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={addQuestion}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Add Question
                    </button>
                  </div>
                </div>

                {/* Questions List */}
                {questions.length > 0 && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-700 mb-4">
                      Questions ({questions.length})
                    </h3>
                    <div className="space-y-4">
                      {questions.map((question, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-800">
                              Question {index + 1}: {question.question}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeQuestion(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="text-sm text-gray-600">
                            <p>Type: {question.type}</p>
                            <p>Points: {question.points}</p>
                            <p>Difficulty: {question.difficulty}</p>
                            <p>Correct Answer: {question.correct_answer}</p>
                            {question.explanation && <p>Explanation: {question.explanation}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Preview Tab */}
            {activeTab === 'preview' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-800">Quiz Preview</h2>
                
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">{quizData.title || 'Untitled Quiz'}</h3>
                  {quizData.description && (
                    <p className="text-gray-600 mb-4">{quizData.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Quiz Settings</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>Access Code: {quizData.access_code || 'Not set'}</li>
                        <li>Passing Score: {quizData.passing_score}%</li>
                        <li>Total Timer: {quizData.total_timer_minutes ? `${quizData.total_timer_minutes} minutes` : 'No limit'}</li>
                        <li>Question Timer: {quizData.question_timer_seconds ? `${quizData.question_timer_seconds} seconds` : 'No limit'}</li>
                        <li>Show Results: {quizData.show_results ? 'Yes' : 'No'}</li>
                        <li>Allow Retake: {quizData.allow_retake ? 'Yes' : 'No'}</li>
                        <li>Shuffle Questions: {quizData.shuffle_questions ? 'Yes' : 'No'}</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">Security Settings</h4>
                      <ul className="text-sm text-gray-600 space-y-1">
                        <li>Require HTTPS: {securitySettings.require_https ? 'Yes' : 'No'}</li>
                        <li>Max Attempts: {securitySettings.max_attempts}</li>
                        <li>Prevent Backtracking: {securitySettings.prevent_backtracking ? 'Yes' : 'No'}</li>
                        <li>Disable Copy/Paste: {securitySettings.disable_copy_paste ? 'Yes' : 'No'}</li>
                        <li>Disable Right-Click: {securitySettings.disable_right_click ? 'Yes' : 'No'}</li>
                        <li>Disable Print: {securitySettings.disable_print ? 'Yes' : 'No'}</li>
                        <li>Require Honor Code: {securitySettings.require_honor_code ? 'Yes' : 'No'}</li>
                        <li>IP Restrictions: {securitySettings.ip_restriction_enabled ? 'Yes' : 'No'}</li>
                      </ul>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">Questions ({questions.length})</h4>
                    {questions.length === 0 ? (
                      <p className="text-gray-500">No questions added yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {questions.map((question, index) => (
                          <div key={index} className="border-l-4 border-blue-500 pl-4">
                            <p className="font-medium">Q{index + 1}: {question.question}</p>
                            <p className="text-sm text-gray-600">
                              {question.type} • {question.points} points • {question.difficulty}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => window.location.href = '/admin/dashboard'}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
          >
            Back to Dashboard
          </button>
          
          <button
            onClick={handleCreateQuiz}
            disabled={loading}
            className={`px-8 py-3 rounded-lg font-medium ${
              loading
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {loading ? 'Creating Quiz...' : 'Create Quiz'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CreateQuiz
