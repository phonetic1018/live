import React, { useState, useEffect } from 'react'
import { supabase, TABLES, PARTICIPANT_STATUS, QUIZ_STATUS } from '../utils/supabaseClient'
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
    
    if (!quizData || !participantData) {
      window.location.href = '/'
      return
    }

    const quizObj = JSON.parse(quizData)
    const participantObj = JSON.parse(participantData)
    
    setQuiz(quizObj)
    setParticipant(participantObj)

    // Fetch all participants for this quiz
    fetchParticipants(quizObj.id)

    // Subscribe to real-time updates for participants
    const participantsSubscription = supabase
      .channel('participants')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.PARTICIPANTS,
          filter: `quiz_id=eq.${quizObj.id}`
        }, 
        (payload) => {
          console.log('Participant change:', payload)
          fetchParticipants(quizObj.id)
        }
      )
      .subscribe()

    // Subscribe to real-time updates for quiz status
    const quizSubscription = supabase
      .channel('quiz-status')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: TABLES.QUIZZES,
          filter: `id=eq.${quizObj.id}`
        }, 
        (payload) => {
          console.log('Quiz status change:', payload)
          if (payload.new && payload.new.status === QUIZ_STATUS.PLAYING) {
            // Quiz has started! Redirect to quiz questions
            console.log('Quiz started! Redirecting to quiz questions...')
            window.location.href = '/quiz'
          }
        }
      )
      .subscribe()

    // Also check current quiz status immediately
    checkQuizStatus(quizObj.id)

    setLoading(false)

    // Cleanup subscriptions
    return () => {
      participantsSubscription.unsubscribe()
      quizSubscription.unsubscribe()
    }
  }, [])

  const checkQuizStatus = async (quizId) => {
    try {
      const { data, error } = await supabase
        .from(TABLES.QUIZZES)
        .select('status')
        .eq('id', quizId)
        .single()

      if (error) {
        console.error('Error checking quiz status:', error)
        return
      }

      if (data && data.status === QUIZ_STATUS.PLAYING) {
        // Quiz is already playing, redirect immediately
        console.log('Quiz is already playing! Redirecting to quiz questions...')
        window.location.href = '/quiz'
      }
    } catch (error) {
      console.error('Error in checkQuizStatus:', error)
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
        setError('Failed to load participants')
        return
      }

      setParticipants(data || [])
    } catch (error) {
      console.error('Error in fetchParticipants:', error)
      setError('Failed to load participants')
    }
  }

  const handleLeaveLobby = async () => {
    try {
      // Remove participant from database
      if (participant) {
        await supabase
          .from(TABLES.PARTICIPANTS)
          .delete()
          .eq('id', participant.id)
      }
    } catch (error) {
      console.error('Error removing participant:', error)
    }

    // Clear session storage
    sessionStorage.removeItem('currentQuiz')
    sessionStorage.removeItem('currentParticipant')
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        {/* Logo Section */}
        <div className="mb-6">
          <div className="w-32 h-32 mx-auto mb-3 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Waiting for Admin</h1>
        <p className="text-gray-600 mb-6">You're in the lobby waiting for the admin to start the quiz</p>
        
        {/* Quiz Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Quiz</p>
          <p className="font-semibold text-blue-800 text-lg">{quiz?.title}</p>
          <p className="text-sm text-gray-600 mb-2 mt-3">Access Code</p>
          <p className="font-mono font-bold text-blue-600 text-lg">{quiz?.access_code}</p>
        </div>

        {/* Participant Info */}
        {participant && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 mb-2">Your Name</p>
            <p className="font-semibold text-green-800 text-lg">{participant.name}</p>
          </div>
        )}

        {/* Participants List */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-3">Participants ({participants.length})</p>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span className={`font-medium ${
                  p.id === participant?.id ? 'text-blue-600' : 'text-gray-700'
                }`}>
                  {p.name}
                  {p.id === participant?.id && ' (You)'}
                </span>
                <span className={`px-2 py-1 rounded text-xs ${
                  p.status === PARTICIPANT_STATUS.WAITING ? 'bg-yellow-100 text-yellow-800' :
                  p.status === PARTICIPANT_STATUS.PLAYING ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Loading Animation */}
        <div className="flex justify-center mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>

        <p className="text-gray-500 text-sm mb-6">Please wait while the admin prepares the quiz...</p>

        {error && (
          <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        <button 
          className="btn-secondary w-full"
          onClick={handleLeaveLobby}
        >
          Leave Lobby
        </button>
      </div>
    </div>
  )
}

export default Lobby
