import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const ManageQuiz = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingQuiz, setEditingQuiz] = useState(null)
  const [editForm, setEditForm] = useState({
    title: '',
    access_code: '',
    status: QUIZ_STATUS.WAITING
  })

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated')
    
    if (adminAuth === 'true') {
      setIsAuthenticated(true)
      fetchQuizzes()
    } else {
      // Redirect to admin login if not authenticated
      window.location.href = '/admin/login'
    }
  }, [])

  const fetchQuizzes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from(TABLES.QUIZZES)
        .select(`
          *,
          questions:questions(count),
          participants:participants(count)
        `)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching quizzes:', error)
        setError('Failed to load quizzes')
        return
      }

      setQuizzes(data || [])
    } catch (error) {
      console.error('Error in fetchQuizzes:', error)
      setError('Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  const handleEditQuiz = (quiz) => {
    setEditingQuiz(quiz)
    setEditForm({
      title: quiz.title,
      access_code: quiz.access_code,
      status: quiz.status
    })
  }

  const handleUpdateQuiz = async () => {
    try {
      const { error } = await supabase
        .from(TABLES.QUIZZES)
        .update({
          title: editForm.title,
          access_code: editForm.access_code.toUpperCase(),
          status: editForm.status,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingQuiz.id)

      if (error) {
        console.error('Error updating quiz:', error)
        setError('Failed to update quiz')
        return
      }

      setEditingQuiz(null)
      setEditForm({ title: '', access_code: '', status: QUIZ_STATUS.WAITING })
      fetchQuizzes() // Refresh the list
    } catch (error) {
      console.error('Error in handleUpdateQuiz:', error)
      setError('Failed to update quiz')
    }
  }

  const handleDeleteQuiz = async (quizId) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from(TABLES.QUIZZES)
        .delete()
        .eq('id', quizId)

      if (error) {
        console.error('Error deleting quiz:', error)
        setError('Failed to delete quiz')
        return
      }

      fetchQuizzes() // Refresh the list
    } catch (error) {
      console.error('Error in handleDeleteQuiz:', error)
      setError('Failed to delete quiz')
    }
  }

  const handleJoinQuiz = (quiz) => {
    sessionStorage.setItem('currentQuiz', JSON.stringify(quiz))
    window.location.href = '/lobby'
  }

  const startQuiz = async (quizId) => {
    try {
      // Update quiz status to PLAYING
      const { error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .update({ status: QUIZ_STATUS.PLAYING })
        .eq('id', quizId)

      if (quizError) {
        console.error('Error starting quiz:', quizError)
        setError('Failed to start quiz. Please try again.')
        return
      }

      // Update all participants in this quiz to PLAYING status
      const { error: participantsError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .update({ status: PARTICIPANT_STATUS.PLAYING })
        .eq('quiz_id', quizId)

      if (participantsError) {
        console.error('Error updating participants:', participantsError)
        // Don't return here as the quiz was already started
      }

      // Refresh quiz list
      await fetchQuizzes()
      
      alert('Quiz started successfully! All participants can now begin the quiz.')
      
    } catch (error) {
      console.error('Error starting quiz:', error)
      setError('Failed to start quiz. Please try again.')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case QUIZ_STATUS.WAITING:
        return 'bg-yellow-100 text-yellow-800'
      case QUIZ_STATUS.PLAYING:
        return 'bg-blue-100 text-blue-800'
      case QUIZ_STATUS.COMPLETED:
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
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
        <div className="bg-white rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-4 mb-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Manage Quiz</h1>
                <p className="text-gray-600">Edit, delete, or view existing quizzes</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading quizzes...</p>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">No quizzes found</p>
              <button
                onClick={() => window.location.href = '/admin/create-quiz'}
                className="btn-primary"
              >
                Create Your First Quiz
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {quizzes.map((quiz) => (
                <div key={quiz.id} className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  {editingQuiz?.id === quiz.id ? (
                    // Edit Form
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Quiz Title
                          </label>
                          <input
                            type="text"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
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
                            value={editForm.access_code}
                            onChange={(e) => setEditForm({ ...editForm, access_code: e.target.value.toUpperCase() })}
                            className="input-field font-mono"
                            maxLength={8}
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          <select
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="input-field"
                          >
                            <option value={QUIZ_STATUS.WAITING}>Waiting</option>
                            <option value={QUIZ_STATUS.PLAYING}>Playing</option>
                            <option value={QUIZ_STATUS.COMPLETED}>Completed</option>
                          </select>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleUpdateQuiz}
                          className="btn-success"
                        >
                          Save Changes
                        </button>
                        <button
                          onClick={() => setEditingQuiz(null)}
                          className="btn-secondary"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Display Quiz Info
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <h3 className="text-lg font-semibold text-gray-900">{quiz.title}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quiz.status)}`}>
                            {quiz.status}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-sm text-gray-600">
                          <p><strong>Access Code:</strong> <span className="font-mono">{quiz.access_code}</span></p>
                          <p><strong>Created:</strong> {new Date(quiz.created_at).toLocaleDateString()}</p>
                          <p><strong>Questions:</strong> {quiz.questions?.[0]?.count || 0}</p>
                          <p><strong>Participants:</strong> {quiz.participants?.[0]?.count || 0}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {quiz.status === QUIZ_STATUS.WAITING && (
                          <button
                            onClick={() => startQuiz(quiz.id)}
                            className="btn-success text-sm"
                          >
                            Start Quiz
                          </button>
                        )}
                        <button
                          onClick={() => handleJoinQuiz(quiz)}
                          className="btn-outline text-sm"
                        >
                          Join
                        </button>
                        <button
                          onClick={() => handleEditQuiz(quiz)}
                          className="btn-secondary text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="btn-danger text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex space-x-4">
            <button
              onClick={() => window.location.href = '/admin/create-quiz'}
              className="btn-primary"
            >
              Create New Quiz
            </button>
            <button
              onClick={() => window.location.href = '/admin/dashboard'}
              className="btn-secondary"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ManageQuiz
