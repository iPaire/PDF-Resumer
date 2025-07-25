// app/courses/[id]/page.tsx
'use client'
import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function CoursePage() {
  const { id } = useParams()
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [fullSummary, setFullSummary] = useState('')
  const [cheatSheet, setCheatSheet] = useState('')
  const [quiz, setQuiz] = useState<any[]>([])
  const [generating, setGenerating] = useState({
    summary: false,
    cheatSheet: false,
    quiz: false
  })

  useEffect(() => {
    const fetchCourse = async () => {
      const res = await fetch(`/api/courses/${id}`)
      if (res.ok) {
        const data = await res.json()
        setCourse(data)
        
        // Fetch existing generated content if available
        if (data.fullSummary) setFullSummary(data.fullSummary)
        if (data.cheatSheet) setCheatSheet(data.cheatSheet)
        if (data.quiz) setQuiz(data.quiz)
      }
      setLoading(false)
    }
    fetchCourse()
  }, [id])

  const generateSummary = async () => {
    setGenerating(prev => ({...prev, summary: true}))
    try {
      const res = await fetch(`/api/courses/${id}/summarize`, { 
        method: 'POST' 
      })
      
      if (res.ok) {
        const data = await res.json()
        setFullSummary(data.summary)
        // Update course state with new summary
        setCourse((prev: any) => ({...prev, fullSummary: data.summary}))
      }
    } catch (error) {
      console.error('Error generating summary:', error)
    } finally {
      setGenerating(prev => ({...prev, summary: false}))
    }
  }

  const generateCheatSheet = async () => {
    setGenerating(prev => ({...prev, cheatSheet: true}))
    try {
      const res = await fetch(`/api/courses/${id}/cheatsheet`, { 
        method: 'POST' 
      })
      
      if (res.ok) {
        const data = await res.json()
        setCheatSheet(data.cheatSheet)
        // Update course state with new cheat sheet
        setCourse((prev: any) => ({...prev, cheatSheet: data.cheatSheet}))
      }
    } catch (error) {
      console.error('Error generating cheat sheet:', error)
    } finally {
      setGenerating(prev => ({...prev, cheatSheet: false}))
    }
  }

  const generateQuiz = async () => {
    setGenerating(prev => ({...prev, quiz: true}))
    try {
      const res = await fetch(`/api/courses/${id}/quiz`, { 
        method: 'POST' 
      })
      
      if (res.ok) {
        const data = await res.json()
        setQuiz(data.quiz)
        // Update course state with new quiz
        setCourse((prev: any) => ({...prev, quiz: data.quiz}))
      }
    } catch (error) {
      console.error('Error generating quiz:', error)
    } finally {
      setGenerating(prev => ({...prev, quiz: false}))
    }
  }

  if (loading) return <div>Loading...</div>
  if (!course) return <div>Course not found</div>

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">{course.title}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button 
          onClick={generateSummary}
          disabled={generating.summary}
          className={`p-4 rounded-lg flex flex-col items-center ${
            generating.summary 
              ? 'bg-gray-200 cursor-not-allowed' 
              : 'bg-blue-100 hover:bg-blue-200'
          }`}
        >
          <span className="font-medium mb-1">Generate Full Summary</span>
          {generating.summary && <span className="text-sm">Generating...</span>}
        </button>
        
        <button 
          onClick={generateCheatSheet}
          disabled={generating.cheatSheet}
          className={`p-4 rounded-lg flex flex-col items-center ${
            generating.cheatSheet 
              ? 'bg-gray-200 cursor-not-allowed' 
              : 'bg-green-100 hover:bg-green-200'
          }`}
        >
          <span className="font-medium mb-1">Generate Cheat Sheet</span>
          {generating.cheatSheet && <span className="text-sm">Generating...</span>}
        </button>
        
        <button 
          onClick={generateQuiz}
          disabled={generating.quiz}
          className={`p-4 rounded-lg flex flex-col items-center ${
            generating.quiz 
              ? 'bg-gray-200 cursor-not-allowed' 
              : 'bg-purple-100 hover:bg-purple-200'
          }`}
        >
          <span className="font-medium mb-1">Generate Quiz</span>
          {generating.quiz && <span className="text-sm">Generating...</span>}
        </button>
      </div>

      {/* Course Summaries */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Course Summaries</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {course.summaries?.map((summary: any) => (
            <div key={summary.id} className="border rounded-lg p-4 bg-white">
              <h3 className="font-medium mb-2">{summary.name}</h3>
              <p className="text-sm text-gray-600 line-clamp-3">
                {summary.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Generated Content Sections */}
      {fullSummary && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Full Course Summary</h2>
          <div className="bg-white border rounded-lg p-4">
            <p className="whitespace-pre-line">{fullSummary}</p>
          </div>
        </div>
      )}

      {cheatSheet && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Course Cheat Sheet</h2>
          <div className="bg-white border rounded-lg p-4">
            <p className="whitespace-pre-line">{cheatSheet}</p>
          </div>
        </div>
      )}

      {quiz.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Course Quiz</h2>
          <div className="bg-white border rounded-lg p-4">
            {quiz.map((q, index) => (
              <div key={index} className="mb-6">
                <h3 className="font-medium mb-2">{index + 1}. {q.question}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {q.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-start">
                      <input 
                        type="radio" 
                        id={`q${index}-opt${optIndex}`}
                        name={`question-${index}`} 
                        className="mt-1 mr-2"
                      />
                      <label htmlFor={`q${index}-opt${optIndex}`} className="text-sm">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">
              Submit Answers
            </button>
          </div>
        </div>
      )}
    </div>
  )
}