import React from 'react'
import logo from '../assets/logo.png'

const ManageQuiz = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
        {/* Logo Section */}
        <div className="mb-6">
          <div className="w-32 h-32 mx-auto mb-3 flex items-center justify-center">
            <img src={logo} alt="Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Manage Quiz</h1>
        <p className="text-gray-600 mb-6">Control quiz flow and monitor participants</p>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-600 mb-2">Status</p>
          <p className="font-semibold text-blue-600">Coming Soon</p>
        </div>

        <p className="text-gray-500 text-sm mb-6">Quiz management requires Supabase setup</p>

        <button 
          className="btn-secondary w-full"
          onClick={() => window.location.href = '/'}
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}

export default ManageQuiz
