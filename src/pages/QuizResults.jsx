import React, { useState, useEffect } from 'react'
import { supabase, TABLES, QUIZ_STATUS, PARTICIPANT_STATUS } from '../utils/supabaseClient'
import logo from '../assets/logo.png'

const QuizResults = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [quizzes, setQuizzes] = useState([])
  const [selectedQuiz, setSelectedQuiz] = useState(null)
  const [quizResults, setQuizResults] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          participants:participants(count),
          questions:questions(count)
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

  const fetchQuizResults = async (quizId) => {
    try {
      setLoading(true)
      
      // Fetch quiz details
      const { data: quiz, error: quizError } = await supabase
        .from(TABLES.QUIZZES)
        .select('*')
        .eq('id', quizId)
        .single()

      if (quizError) {
        console.error('Error fetching quiz:', quizError)
        setError('Failed to load quiz details')
        return
      }

      // Fetch participants with their answers
      const { data: participants, error: participantsError } = await supabase
        .from(TABLES.PARTICIPANTS)
        .select(`
          *,
          answers:answers(
            *,
            question:questions(*)
          )
        `)
        .eq('quiz_id', quizId)
        .order('completed_at', { ascending: false })

      if (participantsError) {
        console.error('Error fetching participants:', participantsError)
        setError('Failed to load participant data')
        return
      }

      // Fetch questions
      const { data: questions, error: questionsError } = await supabase
        .from(TABLES.QUESTIONS)
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true })

      if (questionsError) {
        console.error('Error fetching questions:', questionsError)
        setError('Failed to load questions')
        return
      }

      // Calculate results
      const results = participants.map(participant => {
        const participantAnswers = participant.answers || []
        const correctAnswers = participantAnswers.filter(answer => answer.is_correct).length
        const totalQuestions = questions.length
        const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0
        
        // Calculate time used
        let timeUsed = null
        if (participant.started_at && participant.completed_at) {
          const startTime = new Date(participant.started_at)
          const endTime = new Date(participant.completed_at)
          timeUsed = Math.floor((endTime - startTime) / 1000) // in seconds
        }

        return {
          ...participant,
          score,
          correctAnswers,
          totalQuestions,
          timeUsed,
          answers: participantAnswers
        }
      }).sort((a, b) => b.score - a.score) // Sort by score descending

      // Calculate average time
      const participantsWithTime = results.filter(p => p.timeUsed !== null)
      const averageTime = participantsWithTime.length > 0 
        ? Math.round(participantsWithTime.reduce((sum, p) => sum + p.timeUsed, 0) / participantsWithTime.length)
        : null

      setQuizResults({
        quiz,
        participants: results,
        questions,
        totalParticipants: results.length,
        averageScore: results.length > 0 ? Math.round(results.reduce((sum, p) => sum + p.score, 0) / results.length) : 0,
        highestScore: results.length > 0 ? Math.max(...results.map(p => p.score)) : 0,
        lowestScore: results.length > 0 ? Math.min(...results.map(p => p.score)) : 0,
        averageTime
      })

    } catch (error) {
      console.error('Error in fetchQuizResults:', error)
      setError('Failed to load quiz results')
    } finally {
      setLoading(false)
    }
  }

  const handleQuizSelect = (quiz) => {
    setSelectedQuiz(quiz)
    fetchQuizResults(quiz.id)
  }

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadge = (score) => {
    if (score >= 80) return 'bg-green-100 text-green-800'
    if (score >= 60) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
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
                <h1 className="text-3xl font-bold text-gray-900">Quiz Results</h1>
                <p className="text-gray-600">View detailed results and analytics</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Quiz Selection */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Select Quiz</h2>
            {quizzes.length === 0 ? (
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {quizzes.map((quiz) => (
                  <div
                    key={quiz.id}
                    onClick={() => handleQuizSelect(quiz)}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedQuiz?.id === quiz.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-900">{quiz.title}</h3>
                    <p className="text-sm text-gray-600">Code: {quiz.access_code}</p>
                    <p className="text-sm text-gray-600">
                      Participants: {quiz.participants?.[0]?.count || 0}
                    </p>
                    <p className="text-sm text-gray-600">
                      Questions: {quiz.questions?.[0]?.count || 0}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      quiz.status === QUIZ_STATUS.WAITING ? 'bg-yellow-100 text-yellow-800' :
                      quiz.status === QUIZ_STATUS.PLAYING ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {quiz.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quiz Results */}
          {selectedQuiz && quizResults && (
            <div className="space-y-8">
              {/* Quiz Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {selectedQuiz.title} - Results Summary
                </h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{quizResults.totalParticipants}</div>
                    <div className="text-sm text-gray-600">Total Participants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{quizResults.averageScore}%</div>
                    <div className="text-sm text-gray-600">Average Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{quizResults.highestScore}%</div>
                    <div className="text-sm text-gray-600">Highest Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-600">{quizResults.lowestScore}%</div>
                    <div className="text-sm text-gray-600">Lowest Score</div>
                  </div>
                </div>
                
                {/* Timer Information */}
                {selectedQuiz.total_timer_minutes && (
                  <div className="mt-4 pt-4 border-t border-blue-200">
                    <div className="flex items-center justify-center space-x-4">
                      <div className="text-center">
                        <div className="text-lg font-bold text-blue-600">{selectedQuiz.total_timer_minutes} min</div>
                        <div className="text-sm text-gray-600">Total Time Limit</div>
                      </div>
                      {quizResults.averageTime && (
                        <div className="text-center">
                          <div className="text-lg font-bold text-green-600">{Math.round(quizResults.averageTime / 60)} min</div>
                          <div className="text-sm text-gray-600">Average Time Used</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Participant Results */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Participant Results</h3>
                {quizResults.participants.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No participants have taken this quiz yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizResults.participants.map((participant, index) => (
                      <div key={participant.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              index === 0 ? 'bg-yellow-100 text-yellow-800' :
                              index === 1 ? 'bg-gray-100 text-gray-800' :
                              index === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {index + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-900">{participant.name}</h4>
                              <p className="text-sm text-gray-600">
                                {participant.correctAnswers} / {participant.totalQuestions} correct
                              </p>
                              {participant.timeUsed && (
                                <p className="text-xs text-gray-500">
                                  Time: {Math.round(participant.timeUsed / 60)} min {participant.timeUsed % 60} sec
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getScoreColor(participant.score)}`}>
                              {participant.score}%
                            </div>
                            <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getScoreBadge(participant.score)}`}>
                              {participant.score >= 80 ? 'Excellent' :
                               participant.score >= 60 ? 'Good' :
                               participant.score >= 40 ? 'Fair' : 'Poor'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Question Analysis */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Question Analysis</h3>
                <div className="space-y-4">
                  {quizResults.questions.map((question, index) => {
                    const questionAnswers = quizResults.participants.flatMap(p => 
                      p.answers.filter(a => a.question_id === question.id)
                    )
                    const correctCount = questionAnswers.filter(a => a.is_correct).length
                    const totalAnswers = questionAnswers.length
                    const successRate = totalAnswers > 0 ? Math.round((correctCount / totalAnswers) * 100) : 0

                    return (
                      <div key={question.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">
                              Question {index + 1}: {question.text}
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                              <strong>Correct Answer:</strong> {question.correct_answer}
                            </p>
                            {question.type === 'mcq' && question.options && (
                              <div className="mt-2">
                                <p className="text-sm text-gray-600"><strong>Options:</strong></p>
                                <ul className="text-sm text-gray-600 ml-4">
                                  {question.options.map((option, optIndex) => (
                                    <li key={optIndex}>{option}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className={`text-lg font-bold ${getScoreColor(successRate)}`}>
                              {successRate}%
                            </div>
                            <div className="text-sm text-gray-600">
                              {correctCount}/{totalAnswers} correct
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex space-x-4">
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

export default QuizResults
