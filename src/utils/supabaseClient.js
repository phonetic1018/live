import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

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
