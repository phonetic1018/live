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
          console.log('Lobby - Quiz status change:', payload)
          if (payload.new && payload.new.status === 'playing') {
            console.log('Lobby - Quiz started, redirecting to quiz page')
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 max-w-md w-full text-center">
        {/* Welcome Message */}
        <h1 className="text-2xl font-bold text-blue-900 mb-4">
          Welcome, {participant.name}!
        </h1>
        
        <p className="text-blue-700 mb-6">
          You're now in the quiz lobby. The instructor will start the quiz soon.
        </p>
        
        {/* Loading Spinner */}
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        
        {/* Waiting Message */}
        <p className="text-blue-600">Waiting for instructor...</p>
      </div>
    </div>
  )
}

export default Lobby
