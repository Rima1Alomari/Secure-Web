import { useState } from 'react'
import { FaRobot, FaSpinner, FaFileAlt, FaTimes } from 'react-icons/fa'
import { Modal } from './common'

interface AIDocumentSummaryProps {
  fileName: string
  fileType: string
  content?: string
  onClose: () => void
}

export default function AIDocumentSummary({ fileName, fileType, content, onClose }: AIDocumentSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateSummary = async () => {
    if (!content) {
      setError('No content available to summarize')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const API_URL = (import.meta as any).env.VITE_API_URL || '/api'
      const token = localStorage.getItem('token') || 'mock-token-for-testing'

      const response = await fetch(`${API_URL}/ai/summarize-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fileName,
          fileType,
          content: content.substring(0, 8000), // Limit content size
          maxLength: 200
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSummary(data.summary)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to generate summary')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="AI Document Summary" size="lg">
      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-2">
            <FaFileAlt className="text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">{fileName}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{fileType}</p>
            </div>
          </div>
        </div>

        {!summary && !loading && !error && (
          <div className="text-center py-8">
            <FaRobot className="text-4xl mx-auto mb-4 text-blue-600 dark:text-blue-400 opacity-50" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Generate an AI-powered summary of this document
            </p>
            <button
              onClick={generateSummary}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <FaRobot />
              Generate Summary
            </button>
          </div>
        )}

        {loading && (
          <div className="text-center py-8">
            <FaSpinner className="text-4xl mx-auto mb-4 text-blue-600 dark:text-blue-400 animate-spin" />
            <p className="text-gray-600 dark:text-gray-400">
              Analyzing document and generating summary...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={generateSummary}
              className="mt-3 btn-secondary text-sm"
            >
              Try Again
            </button>
          </div>
        )}

        {summary && (
          <div className="space-y-4">
            <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-3">
                <FaRobot className="text-green-600 dark:text-green-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">AI Summary</h3>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {summary}
              </p>
            </div>
            <button
              onClick={generateSummary}
              className="btn-secondary w-full text-sm"
            >
              Regenerate Summary
            </button>
          </div>
        )}
      </div>
    </Modal>
  )
}

