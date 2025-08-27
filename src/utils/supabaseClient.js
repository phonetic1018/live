import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const supabaseUrl = 'https://qpqqcoxgzknhvrkphvap.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwcXFjb3hnemtuaHZya3BodmFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYyMjkzMTgsImV4cCI6MjA3MTgwNTMxOH0.NCZLItizudRiSI-Dk8DzGxUr5PXrSfdN1EoszaQfF1Q'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public'
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// Table names constants
export const TABLES = {
  QUIZZES: 'quizzes',
  QUESTIONS: 'questions',
  PARTICIPANTS: 'participants',
  ANSWERS: 'answers'
}

// Quiz status constants
export const QUIZ_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed'
}

// Participant status constants
export const PARTICIPANT_STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  COMPLETED: 'completed'
}

// Question types constants
export const QUESTION_TYPES = {
  MCQ: 'mcq',
  TRUE_FALSE: 'true_false',
  SHORT_ANSWER: 'short_answer'
}



export default supabase
