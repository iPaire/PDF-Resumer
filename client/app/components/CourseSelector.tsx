'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CourseSelector({ onSelect }: { onSelect: (courseId: string) => void }) {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchCourses = async () => {
      const res = await fetch('/api/courses')
      if (res.ok) {
        const data = await res.json()
        setCourses(data)
      }
      setLoading(false)
    }
    fetchCourses()
  }, [])

  const createCourse = async () => {
    const title = prompt('Enter course title:')
    if (!title) return
    
    const res = await fetch('/api/courses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    
    if (res.ok) {
      const newCourse = await res.json()
      setCourses([...courses, newCourse])
      onSelect(newCourse.id)
    }
  }

  if (loading) return <div>Loading courses...</div>

  return (
    <div className="mb-6">
      <label className="block mb-2 font-medium">Select Course:</label>
      <div className="flex gap-2">
        <select 
          onChange={(e) => onSelect(e.target.value)} 
          className="flex-1 p-2 border rounded"
        >
          <option value="">-- Select Course --</option>
          {courses.map(course => (
            <option key={course.id} value={course.id}>
              {course.title}
            </option>
          ))}
        </select>
        <button 
          onClick={createCourse}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          New Course
        </button>
      </div>
    </div>
  )
}