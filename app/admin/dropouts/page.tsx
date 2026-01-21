'use client'

import { useState, useEffect } from 'react'

interface Dropout {
  id: string
  session_id: string
  user_agent: string
  ip_address: string
  question_id: number | null
  question_text: string | null
  current_question_index: number
  total_questions: number
  completed_questions: number
  time_spent_seconds: number
  created_at: string
  timestamp: string
}

interface UserLog {
  id: string
  question_id: number
  question_text: string
  answer: string
  thinking_time_seconds: number
  timestamp: string
}

export default function DropoutsPage() {
  const [dropouts, setDropouts] = useState<Dropout[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDropouts()
  }, [])

  const fetchDropouts = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/results?type=dropouts')
      
      if (!response.ok) {
        throw new Error('Failed to fetch dropouts')
      }

      const data = await response.json()
      setDropouts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    return `${seconds.toFixed(2)}s`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR')
  }

  const getCompletionRate = (completed: number, total: number) => {
    return ((completed / total) * 100).toFixed(1)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading dropouts...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={fetchDropouts}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Dropout Analytics</h1>
              <p className="text-gray-600">Total dropouts: {dropouts.length}</p>
            </div>
            <div className="flex gap-4">
              <a
                href="/admin"
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back to Results
              </a>
              <button
                onClick={fetchDropouts}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        {dropouts.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Average Completion</div>
              <div className="text-2xl font-bold text-gray-800">
                {getCompletionRate(
                  dropouts.reduce((sum, d) => sum + d.completed_questions, 0) / dropouts.length,
                  dropouts[0]?.total_questions || 12
                )}%
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Average Time Spent</div>
              <div className="text-2xl font-bold text-gray-800">
                {formatTime(
                  dropouts.reduce((sum, d) => sum + d.time_spent_seconds, 0) / dropouts.length
                )}
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Most Common Dropout Q</div>
              <div className="text-2xl font-bold text-gray-800">
                Q{
                  dropouts
                    .filter(d => d.question_id !== null)
                    .reduce((acc, d) => {
                      acc[d.question_id!] = (acc[d.question_id!] || 0) + 1
                      return acc
                    }, {} as Record<number, number>)
                  ? Object.entries(
                      dropouts
                        .filter(d => d.question_id !== null)
                        .reduce((acc, d) => {
                          acc[d.question_id!] = (acc[d.question_id!] || 0) + 1
                          return acc
                        }, {} as Record<number, number>)
                    ).sort((a, b) => b[1] - a[1])[0]?.[0] || '-'
                }
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-4">
              <div className="text-sm text-gray-600 mb-1">Total Dropouts</div>
              <div className="text-2xl font-bold text-gray-800">{dropouts.length}</div>
            </div>
          </div>
        )}

        {/* Dropouts List */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">All Dropouts</h2>
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {dropouts.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No dropouts found</p>
            ) : (
              dropouts.map((dropout) => (
                <div
                  key={dropout.id}
                  className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 mb-2">
                        Session: {dropout.session_id.substring(0, 30)}...
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-gray-600">Question:</div>
                          <div className="font-semibold text-gray-800">
                            {dropout.question_id ? `Q${dropout.question_id}` : 'N/A'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Progress:</div>
                          <div className="font-semibold text-gray-800">
                            {dropout.completed_questions} / {dropout.total_questions} ({getCompletionRate(dropout.completed_questions, dropout.total_questions)}%)
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">Time Spent:</div>
                          <div className="font-semibold text-gray-800">
                            {formatTime(dropout.time_spent_seconds)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-600">IP Address:</div>
                          <div className="font-semibold text-gray-800">{dropout.ip_address}</div>
                        </div>
                      </div>
                      {dropout.question_text && (
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-semibold">Question:</span> {dropout.question_text}
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 ml-4">
                      {formatDate(dropout.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
