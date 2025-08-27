import React from 'react'

const EnvTest = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-md p-8 max-w-2xl w-full">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Environment Variables Test</h1>
        
        <div className="space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">VITE_SUPABASE_URL:</h3>
            <p className="text-sm font-mono bg-white p-2 rounded border">
              {supabaseUrl || 'NOT SET'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Status: {supabaseUrl ? '✅ SET' : '❌ NOT SET'}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">VITE_SUPABASE_ANON_KEY:</h3>
            <p className="text-sm font-mono bg-white p-2 rounded border break-all">
              {supabaseKey ? `${supabaseKey.substring(0, 50)}...` : 'NOT SET'}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Status: {supabaseKey ? '✅ SET' : '❌ NOT SET'}
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">All Environment Variables:</h3>
            <pre className="text-xs bg-white p-2 rounded border overflow-auto">
              {JSON.stringify(import.meta.env, null, 2)}
            </pre>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary"
            >
              Reload Page
            </button>
            <button
              onClick={() => window.location.href = '/test'}
              className="btn-secondary"
            >
              Test Supabase Connection
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="btn-outline"
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnvTest
