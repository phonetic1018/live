import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const AdminDashboard = () => {
  const [adminUsername, setAdminUsername] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [quizzes, setQuizzes] = useState([])
  const [participants, setParticipants] = useState([])
  const [stats, setStats] = useState({
    activeQuizzes: 0,
    totalParticipants: 0,
    completedQuizzes: 0
  })
  const [loading, setLoading] = useState(true)
  const [selectedQuiz, setSelectedQuiz] = useState(null)

  useEffect(() => {
    // Check if admin is authenticated
    const adminAuth = sessionStorage.getItem('adminAuthenticated')
    const username = sessionStorage.getItem('adminUsername')
    
    if (adminAuth === 'true' && username) {
      setIsAuthenticated(true)
      setAdminUsername(username)
      fetchDashboardData()
    } else {
      // Redirect to admin login if not authenticated
      window.location.href = '/admin/login'
    }
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      
      // Fetch all quizzes
      const { data: quizzesData, error: quizzesError } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .order('created_at', { ascending: false })

      if (quizzesError) {
        console.error('Error fetching quizzes:', quizzesError)
        return
      }

      setQuizzes(quizzesData || [])

      // Fetch all participants
      const { data: participantsData, error: participantsError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .select('*')

      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
        return
      }

      setParticipants(participantsData || [])

      const activeQuizzes = quizzesData?.filter(q => q.status === QUIZ_STATUS.WAITING || q.status === QUIZ_STATUS.PLAYING).length || 0
      const completedQuizzes = quizzesData?.filter(q => q.status === QUIZ_STATUS.COMPLETED).length || 0
      const totalParticipants = participantsData?.length || 0

      setStats({
        activeQuizzes,
        totalParticipants,
        completedQuizzes
      })

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('adminAuthenticated')
    sessionStorage.removeItem('adminUsername')
    window.location.href = '/admin/login'
  }

  const navigateTo = (path) => {
    window.location.href = path
  }

  const handleCreateQuiz = () => {
    navigateTo('/admin/create-quiz')
  }

  const generateAccessCode = async (quizId) => {
    try {
      // Generate a random 6-digit numeric access code
      const accessCode = Math.floor(100000 + Math.random() * 900000).toString()
      
      // Update the quiz with the new access code
      const { error } = await supabase
        .from(TABLES.QUIZZES)
        .update({ access_code: accessCode })
        .eq('id', quizId)

      if (error) {
        console.error('Error generating access code:', error)
        alert('Failed to generate access code. Please try again.')
        return
      }

      alert(`Access code generated: ${accessCode}`)
      await fetchDashboardData() // Refresh the data
    } catch (error) {
      console.error('Error generating access code:', error)
      alert('Failed to generate access code. Please try again.')
    }
  }

  const viewParticipants = (quizId) => {
    const quizParticipants = participants.filter(p => p.quiz_id === quizId)
    setSelectedQuiz({ id: quizId, participants: quizParticipants })
  }



  const startQuiz = async (quizId) => {
    try {
      console.log('AdminDashboard - Starting quiz with ID:', quizId)
      
      // Get the quiz data first
      const { data: quizData, error: fetchError } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('id', quizId)
        .single()

      if (fetchError) {
        console.error('Error fetching quiz:', fetchError)
        return
      }

      console.log('AdminDashboard - Quiz data before update:', quizData)

      // Update quiz status to PLAYING
      console.log('AdminDashboard - Updating quiz status to:', QUIZ_STATUS.PLAYING)
      const { error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .update({ 
          status: QUIZ_STATUS.PLAYING,
          current_question_index: 0
        })
        .eq('id', quizId)

      if (quizError) {
        console.error('Error starting quiz:', quizError)
        alert('Failed to start quiz. Please try again.')
        return
      }

      console.log('AdminDashboard - Quiz status updated successfully')

      // Update all participants in this quiz to PLAYING status
      const { error: participantsError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .update({ status: PARTICIPANT_STATUS.PLAYING })
        .eq('quiz_id', quizId)

      if (participantsError) {
        console.error('Error updating participants:', participantsError)
        // Don't return here as the quiz was already started
      }

      // Get updated quiz data and store in session storage
      const { data: updatedQuizData, error: fetchUpdatedError } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('id', quizId)
        .single()

      if (fetchUpdatedError) {
        console.error('Error fetching updated quiz:', fetchUpdatedError)
      } else {
        sessionStorage.setItem('currentQuiz', JSON.stringify(updatedQuizData))
      }

      // Refresh dashboard data
      await fetchDashboardData()
      
      alert('Quiz started successfully! Redirecting to admin control panel...')
      
                    // Redirect to admin quiz control panel
        window.location.href = '/admin/quiz'
      
    } catch (error) {
      console.error('Error starting quiz:', error)
      alert('Failed to start quiz. Please try again.')
    }
  }

     const joinQuiz = (quiz) => {
     sessionStorage.setItem('currentQuiz', JSON.stringify(quiz))
     window.location.href = '/join-quiz'
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
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 flex items-center justify-center">
                <img src={logo} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome back, {adminUsername}!</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="btn-secondary"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Admin Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create Quiz */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={handleCreateQuiz}>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Create Quiz</h3>
              <p className="text-gray-600 text-sm">Create a new quiz with questions and answers</p>
            </div>
          </div>

          {/* Manage Quiz */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => navigateTo('/admin/manage-quiz')}>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Manage Quiz</h3>
              <p className="text-gray-600 text-sm">Edit, delete, or view existing quizzes</p>
            </div>
          </div>

          

          {/* Quiz Results */}
          <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
               onClick={() => navigateTo('/admin/quiz-results')}>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Quiz Results</h3>
              <p className="text-gray-600 text-sm">View detailed results and analytics</p>
            </div>
          </div>

          
        </div>

        {/* Quick Stats */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">{stats.activeQuizzes}</div>
              <div className="text-gray-600">Active Quizzes</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{stats.totalParticipants}</div>
              <div className="text-gray-600">Total Participants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{stats.completedQuizzes}</div>
              <div className="text-gray-600">Completed Quizzes</div>
            </div>
          </div>
        </div>

        {/* Recent Quizzes */}
        {quizzes.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Quizzes</h2>
            <div className="space-y-4">
              {quizzes.slice(0, 5).map((quiz) => (
                <div key={quiz.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    <p className="text-sm text-gray-600">
                      Access Code: {quiz.access_code || 'Not generated'}
                    </p>
                    <p className="text-xs text-gray-500">Created: {new Date(quiz.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      quiz.status === QUIZ_STATUS.WAITING ? 'bg-yellow-100 text-yellow-800' :
                      quiz.status === QUIZ_STATUS.PLAYING ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {quiz.status}
                    </span>
                    
                    {/* Generate Access Code Button */}
                    {!quiz.access_code && (
                      <button
                        onClick={() => generateAccessCode(quiz.id)}
                        className="btn-outline text-sm bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                      >
                        Generate Code
                      </button>
                    )}
                    
                    {/* View Participants Button */}
                    <button
                      onClick={() => viewParticipants(quiz.id)}
                      className="btn-outline text-sm bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                    >
                      View Participants
                    </button>
                    
                    {/* Start Quiz Button */}
                    {quiz.status === QUIZ_STATUS.WAITING && quiz.access_code && (
                      <button
                        onClick={() => startQuiz(quiz.id)}
                        className="btn-outline text-sm bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                      >
                        Start Quiz
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Participants Modal */}
        {selectedQuiz && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full max-h-96 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Participants</h3>
                <button
                  onClick={() => setSelectedQuiz(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {selectedQuiz.participants.length > 0 ? (
                <div className="space-y-2">
                  {selectedQuiz.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{participant.name}</div>
                        <div className="text-sm text-gray-500">
                          Joined: {new Date(participant.created_at).toLocaleString()}
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        participant.status === 'waiting' ? 'bg-yellow-100 text-yellow-800' :
                        participant.status === 'playing' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {participant.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p>No participants have joined yet.</p>
                  <p className="text-sm mt-2">Share the access code to invite participants.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <button 
            className="btn-secondary"
            onClick={() => window.location.href = '/'}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
