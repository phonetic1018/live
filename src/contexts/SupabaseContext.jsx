import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'

const SupabaseContext = createContext()

export const useSupabase = () => {
  const context = useContext(SupabaseContext)
  if (!context) {
    throw new Error('useSupabase must be used within a SupabaseProvider')
  }
  return context
}

export const SupabaseProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseKey || 
        supabaseUrl === 'your_supabase_project_url_here' || 
        supabaseKey === 'your_supabase_anon_key_here') {
      setError('Supabase configuration is missing. Please check your .env file.')
      setLoading(false)
      return
    }

    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
        setLoading(false)
      } catch (err) {
        console.error('Error getting session:', err)
        setError('Failed to connect to Supabase. Please check your configuration.')
        setLoading(false)
      }
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      console.error('Sign in error:', err)
      return { data: null, error: { message: 'Failed to sign in' } }
    }
  }

  const signUp = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })
      return { data, error }
    } catch (err) {
      console.error('Sign up error:', err)
      return { data: null, error: { message: 'Failed to sign up' } }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      return { error }
    } catch (err) {
      console.error('Sign out error:', err)
      return { error: { message: 'Failed to sign out' } }
    }
  }

  const value = {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    supabase,
  }

  // Show error message if Supabase is not configured
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2 text-sm text-gray-500">
            <p>Please update your <code className="bg-gray-100 px-1 rounded">.env</code> file with:</p>
            <div className="bg-gray-100 p-3 rounded text-left">
              <p>VITE_SUPABASE_URL=your_actual_url</p>
              <p>VITE_SUPABASE_ANON_KEY=your_actual_key</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary mt-4"
          >
            Reload After Configuration
          </button>
        </div>
      </div>
    )
  }

  return (
    <SupabaseContext.Provider value={value}>
      {children}
    </SupabaseContext.Provider>
  )
}
