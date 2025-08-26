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

function App() {
  return (
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
        
        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
