import { createClient } from '@supabase/supabase-js'

// Direct Supabase credentials
const supabaseUrl = 'https://qpqqcoxgzknhvrkphvap.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcXFjb3hnemtuaHZya3BodmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjkzMTgsImV4cCI6MjA3MTgwNTMxOH0.NCZLItizudRiSI-Dk8DzGxUr5PXrSfdN1EoszaQfF1Q'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Database table names
export const TABLES = {
  QUIZZES: 'quizzes',
  QUESTIONS: 'questions',
  PARTICIPANTS: 'participants',
  ANSWERS: 'answers',
}

// Quiz status constants
export const QUIZ_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed',
}

// Participant status constants
export const PARTICIPANT_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed',
}

// Question types
export const QUESTION_TYPES = {
  MCQ: 'mcq',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer',
}

// Utility function to test Supabase connection
export const testSupabaseConnection = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.QUIZZES)
      .select('count')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection test failed:', error)
      return { success: false, error }
    }
    
    console.log('Supabase connection successful!')
    return { success: true, data }
  } catch (error) {
    console.error('Supabase connection test error:', error)
    return { success: false, error }
  }
}

// Utility function to create a test quiz
export const createTestQuiz = async () => {
  try {
    const { data, error } = await supabase
      .from(TABLES.QUIZZES)
      .insert([
        {
          title: 'Test Quiz',
          access_code: 'TEST123',
          status: QUIZ_STATUS.WAITING
        }
      ])
      .select()
    
    if (error) {
      console.error('Failed to create test quiz:', error)
      return { success: false, error }
    }
    
    console.log('Test quiz created successfully:', data)
    return { success: true, data }
  } catch (error) {
    console.error('Error creating test quiz:', error)
    return { success: false, error }
  }
}
