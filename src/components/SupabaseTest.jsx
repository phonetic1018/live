import React, { useState } from 'react'
import { testSupabaseConnection, createTestQuiz } from '../utils/supabaseClient'

const SupabaseTest = () => {
  const [testResult, setTestResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleTestConnection = async () => {
    setLoading(true)
    const result = await testSupabaseConnection()
    setTestResult(result)
    setLoading(false)
  }

  const handleCreateTestQuiz = async () => {
    setLoading(true)
    const result = await createTestQuiz()
    setTestResult(result)
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Supabase Connection Test</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleTestConnection}
          disabled={loading}
          className="btn-primary w-full"
        >
          {loading ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          onClick={handleCreateTestQuiz}
          disabled={loading}
          className="btn-secondary w-full"
        >
          {loading ? 'Creating...' : 'Create Test Quiz'}
        </button>

        {testResult && (
          <div className={`p-4 rounded-lg ${
            testResult.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <h3 className={`font-semibold mb-2 ${
              testResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {testResult.success ? 'Success!' : 'Error'}
            </h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(testResult, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupabaseTest
