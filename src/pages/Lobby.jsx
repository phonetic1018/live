import React, { useState, useEffect } from 'react'
import { supabase, TABLES, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const Lobby = () => {
  const [quiz, setQuiz] = useState(null)
  const [participant, setParticipant] = useState(null)
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    // Get quiz and participant info from session storage
    const quizData = sessionStorage.getItem('currentQuiz')
    const participantData = sessionStorage.getItem('currentParticipant')
    
    if (quizData && participantData) {
      setQuiz(JSON.parse(quizData))
      setParticipant(JSON.parse(participantData))
      fetchParticipants(JSON.parse(quizData).id)
    } else {
      // Redirect to access code input if no data
      window.location.href = '/'
    }
  }, [])

  // Subscribe to participant updates
  useEffect(() => {
    if (!quiz) return

    const participantsSubscription = supabase
      .channel('lobby-participants')
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

  // Subscribe to quiz status changes
  useEffect(() => {
    if (!quiz) return

    const quizSubscription = supabase
      .channel('lobby-quiz-status')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.QUIZZES,
          filter: `id=eq.${quiz.id}`
        }, 
        (payload) => {
          console.log('Quiz status change:', payload)
          if (payload.new && payload.new.status === 'playing') {
            // Quiz has started, redirect to quiz page
            window.location.href = '/quiz'
          }
        }
      )
      .subscribe()

    return () => {
      quizSubscription.unsubscribe()
    }
  }, [quiz])

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
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800'
      case 'playing': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading lobby...</p>
        </div>
      </div>
    )
  }

  if (!quiz || !participant) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p className="text-gray-600 mb-4">No quiz or participant data found</p>
          <button
            onClick={() => window.location.href = '/'}
            className="btn-primary"
          >
            Back to Access Code
          </button>
        </div>
      </div>
    )
  }

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
                <h1 className="text-2xl font-bold text-gray-900">Quiz Lobby</h1>
                <p className="text-gray-600">Waiting for the quiz to start</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Access Code</div>
              <div className="font-mono font-semibold text-lg">{quiz.access_code}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quiz Info */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Quiz Information</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-700">Title:</span>
                  <p className="text-lg font-semibold text-gray-900">{quiz.title}</p>
                </div>
                {quiz.description && (
                  <div>
                    <span className="text-sm font-medium text-gray-700">Description:</span>
                    <p className="text-gray-700">{quiz.description}</p>
                  </div>
                )}
                <div>
                  <span className="text-sm font-medium text-gray-700">Status:</span>
                  <span className={`ml-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quiz.status)}`}>
                    {quiz.status.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <h3 className="text-lg font-semibold text-green-900 mb-2">
                Welcome, {participant.name}!
              </h3>
              <p className="text-green-700">
                You're now in the quiz lobby. The instructor will start the quiz soon.
              </p>
              <div className="mt-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="text-sm text-green-600 mt-2">Waiting for instructor...</p>
              </div>
            </div>
          </div>

          {/* Participants List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Participants ({participants.length})
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <div>
                        <div className="font-medium text-gray-900">{p.name}</div>
                        {p.email && (
                          <div className="text-xs text-gray-500">{p.email}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {p.id === participant.id && (
                        <span className="text-xs text-blue-600 font-medium">(You)</span>
                      )}
                      <div className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(p.status)}`}>
                        {p.status}
                      </div>
                    </div>
                  </div>
                ))}
                {participants.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No participants yet
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mt-6 text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Back Button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => {
              // Remove from session storage
              sessionStorage.removeItem('currentQuiz')
              sessionStorage.removeItem('currentParticipant')
              window.location.href = '/'
            }}
            className="btn-secondary"
          >
            Leave Lobby
          </button>
        </div>
      </div>
    </div>
  )
}

export default Lobby
