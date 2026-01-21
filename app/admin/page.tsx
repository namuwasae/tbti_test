'use client'

import { useState, useEffect } from 'react'

interface UserLog {
  id: string
  question_id: number
  question_text: string
  answer: string
  thinking_time_seconds: number
  timestamp: string
}

interface TestResult {
  id: string
  session_id: string
  user_agent: string
  ip_address: string
  gender?: string
  age_group?: string
  region?: string
  email?: string
  created_at: string
  completed_at: string
  answers: any[]
  logs: UserLog[]
}

export default function AdminPage() {
  const [results, setResults] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedResult, setSelectedResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchResults()
  }, [])

  const fetchResults = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/results')
      
      if (!response.ok) {
        throw new Error('Failed to fetch results')
      }

      const data = await response.json()
      setResults(data)
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
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
            onClick={fetchResults}
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
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Test Results Dashboard</h1>
              <p className="text-gray-600">Total responses: {results.length}</p>
            </div>
            <div className="flex gap-4">
              <a
                href="/admin/dropouts"
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                View Dropouts
              </a>
              <button
                onClick={fetchResults}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Results List */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">All Responses</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {results.length === 0 ? (
                <p className="text-gray-500">No results found</p>
              ) : (
                results.map((result) => (
                  <div
                    key={result.id}
                    onClick={() => setSelectedResult(result)}
                    className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                      selectedResult?.id === result.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold text-gray-800">
                          Session: {result.session_id.substring(0, 20)}...
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(result.created_at)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-600">
                      IP: {result.ip_address} | Logs: {result.logs.length}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Detail View */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Response Details</h2>
            {selectedResult ? (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                <div className="border-b pb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="font-semibold text-gray-700">Session ID:</div>
                      <div className="text-gray-600 break-all">{selectedResult.session_id}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">IP Address:</div>
                      <div className="text-gray-600">{selectedResult.ip_address}</div>
                    </div>
                    {selectedResult.email && (
                      <div>
                        <div className="font-semibold text-gray-700">Email:</div>
                        <div className="text-gray-600">{selectedResult.email}</div>
                      </div>
                    )}
                    {(selectedResult.gender || selectedResult.age_group || selectedResult.region) && (
                      <div>
                        <div className="font-semibold text-gray-700">Demographics:</div>
                        <div className="text-gray-600">
                          {[selectedResult.gender, selectedResult.age_group, selectedResult.region]
                            .filter(Boolean)
                            .join(' / ')}
                        </div>
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-gray-700">Started:</div>
                      <div className="text-gray-600">{formatDate(selectedResult.created_at)}</div>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-700">Completed:</div>
                      <div className="text-gray-600">{formatDate(selectedResult.completed_at)}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Question Responses</h3>
                  <div className="space-y-3">
                    {selectedResult.logs.map((log, index) => (
                      <div key={log.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-semibold text-gray-700">
                            Q{log.question_id}: {log.question_text}
                          </div>
                          <div className="text-sm font-semibold text-indigo-600">
                            {formatTime(log.thinking_time_seconds)}
                          </div>
                        </div>
                        <div className="text-gray-600 mb-2">
                          Answer: {log.answer}
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(log.timestamp)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="font-semibold text-gray-700 mb-2">Statistics</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600">Total Questions:</div>
                      <div className="font-semibold">
                        {new Set(selectedResult.logs.map(log => log.question_id)).size}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Total Answers:</div>
                      <div className="font-semibold">{selectedResult.logs.length}</div>
                    </div>
                    <div>
                      <div className="text-gray-600">Average Thinking Time:</div>
                      <div className="font-semibold">
                        {formatTime(
                          selectedResult.logs.reduce((sum, log, index, arr) => {
                            // 같은 질문의 첫 번째 로그만 시간 합산 (중복 제거)
                            const isFirstForQuestion = arr.findIndex(l => l.question_id === log.question_id) === index
                            return sum + (isFirstForQuestion ? log.thinking_time_seconds : 0)
                          }, 0) / new Set(selectedResult.logs.map(log => log.question_id)).size
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">Longest Question:</div>
                      <div className="font-semibold">
                        Q{selectedResult.logs.reduce((max, log) => 
                          log.thinking_time_seconds > max.thinking_time_seconds ? log : max,
                          selectedResult.logs[0]
                        ).question_id} ({formatTime(Math.max(...selectedResult.logs.map(l => l.thinking_time_seconds)))})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a response from the list to view details
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
