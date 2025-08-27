import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import AccessCodeInput from './pages/AccessCodeInput'
import EnterName from './pages/EnterName'
import Lobby from './pages/Lobby'
import Quiz from './pages/Quiz'
import Results from './pages/Results'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import CreateQuiz from './pages/CreateQuiz'
import ManageQuiz from './pages/ManageQuiz'
import QuizResults from './pages/QuizResults'
import SupabaseTest from './components/SupabaseTest'
import TestPage from './pages/TestPage'
import EnvTest from './components/EnvTest'

// Add error boundary
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-4">Please check the console for more details.</p>
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  console.log('App component rendering...')
  console.log('Environment variables:', {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'
  })

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* User Routes */}
          <Route path="/" element={<AccessCodeInput />} />
          <Route path="/enter-name" element={<EnterName />} />
          <Route path="/lobby" element={<Lobby />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/results" element={<Results />} />
          
          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/create-quiz" element={<CreateQuiz />} />
          <Route path="/admin/manage-quiz" element={<ManageQuiz />} />
          <Route path="/admin/quiz-results" element={<QuizResults />} />
          
          {/* Test Routes */}
          <Route path="/test" element={<SupabaseTest />} />
          <Route path="/test-page" element={<TestPage />} />
          <Route path="/env-test" element={<EnvTest />} />
          
          {/* Default redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  )
}

export default App
