import React, { useState } from 'react'
import logo from '../assets/logo.png'

const AdminLogin = () => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Temporary admin credentials
  const TEMP_ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123'
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!credentials.username.trim() || !credentials.password.trim()) {
      setError('Please enter both username and password')
      setLoading(false)
      return
    }

    // Check against temporary credentials
    if (credentials.username === TEMP_ADMIN_CREDENTIALS.username && 
        credentials.password === TEMP_ADMIN_CREDENTIALS.password) {
      // Store admin session
      sessionStorage.setItem('adminAuthenticated', 'true')
      sessionStorage.setItem('adminUsername', credentials.username)
      
      // Navigate to admin dashboard
      window.location.href = '/admin/dashboard'
    } else {
      setError('Invalid username or password')
    }
    
    setLoading(false)
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
        
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Admin Login</h1>
        <p className="text-gray-600 mb-6">Access the admin dashboard</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <input
              type="text"
              name="username"
              value={credentials.username}
              onChange={handleInputChange}
              placeholder="Username"
              className="input-field"
              required
            />
          </div>

          <div>
            <input
              type="password"
              name="password"
              value={credentials.password}
              onChange={handleInputChange}
              placeholder="Password"
              className="input-field"
              required
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div className="mt-6">
          <button 
            className="btn-secondary w-full"
            onClick={() => window.location.href = '/'}
          >
            Back to Home
          </button>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
