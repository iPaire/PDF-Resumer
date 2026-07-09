'use client';

import { useState } from 'react';
import { CheckSquare, X, Check, AlertCircle, RotateCcw } from 'react-feather';

type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
};

type QuizResultItem = {
  questionIndex: number;
  question: string;
  userAnswer: number;
  correctAnswer: number;
  isCorrect: boolean;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

type QuizResultSummary = {
  correctAnswers: number;
  totalQuestions: number;
  percentage: number;
  grade: string;
  feedback: string;
};

interface QuizComponentProps {
  quiz: QuizQuestion[];
  courseId: string;
  onRetake?: () => void;
}

export default function QuizComponent({ quiz, courseId, onRetake }: QuizComponentProps) {
  const [userAnswers, setUserAnswers] = useState<number[]>(new Array(quiz.length).fill(-1));
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [results, setResults] = useState<QuizResultItem[]>([]);
  const [summary, setSummary] = useState<QuizResultSummary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    
    const newAnswers = [...userAnswers];
    newAnswers[questionIndex] = optionIndex;
    setUserAnswers(newAnswers);
  };

  const submitQuiz = async () => {
    // Verifică că toate întrebările au răspuns
    const unansweredQuestions = userAnswers.findIndex(answer => answer === -1);
    if (unansweredQuestions !== -1) {
      alert(`Te rog răspunde la întrebarea ${unansweredQuestions + 1}`);
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/courses/${courseId}/quiz`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: userAnswers })
      });

      if (!response.ok) {
        throw new Error('Eroare la evaluarea testului');
      }

      const data = await response.json();
      setResults(data.results);
      setSummary(data.summary);
      setIsSubmitted(true);
      setShowResults(true);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      alert('Eroare la trimiterea răspunsurilor. Te rog încearcă din nou.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const retakeQuiz = () => {
    setUserAnswers(new Array(quiz.length).fill(-1));
    setIsSubmitted(false);
    setResults([]);
    setSummary(null);
    setShowResults(false);
    if (onRetake) {
      onRetake();
    }
  };

  const getDifficultyColor = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      case 'hard': return 'bg-red-100 text-red-700';
      default: return 'bg-sunken text-ink-soft';
    }
  };

  const getDifficultyLabel = (difficulty: 'easy' | 'medium' | 'hard') => {
    switch (difficulty) {
      case 'easy': return 'Ușor';
      case 'medium': return 'Mediu';
      case 'hard': return 'Greu';
      default: return 'Necunoscut';
    }
  };

  if (quiz.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckSquare className="mx-auto h-12 w-12 text-ink-faint" />
        <h3 className="mt-4 text-lg font-bold text-ink">Niciun test disponibil</h3>
        <p className="mt-2 text-ink-soft">
          Nu există întrebări în acest test.
        </p>
      </div>
    );
  }

  if (showResults && summary) {
    return (
      <div>
        {/* Results Summary */}
        <div className="mb-8 bg-white rounded-2xl shadow-lg p-6">
          <div className="text-center">
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
              summary.percentage >= 70 ? 'bg-green-100' : 
              summary.percentage >= 50 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <span className={`text-2xl font-bold ${
                summary.percentage >= 70 ? 'text-green-600' : 
                summary.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {summary.grade}
              </span>
            </div>
            
            <h2 className="text-2xl font-bold text-ink mb-2">Rezultatul testului</h2>
            <p className="text-lg text-ink-soft mb-4">
              {summary.correctAnswers} din {summary.totalQuestions} răspunsuri corecte ({summary.percentage}%)
            </p>
            
            <div className="bg-sunken rounded-lg p-4 mb-6">
              <p className="text-ink-soft">{summary.feedback}</p>
            </div>

            <div className="flex justify-center gap-4">
              <button
                onClick={retakeQuiz}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Reface testul
              </button>
              <button
                onClick={() => setShowResults(false)}
                className="px-6 py-2 border border-line-strong text-ink-soft rounded-lg hover:bg-sunken"
              >
                Închide rezultatele
              </button>
            </div>
          </div>
        </div>

        {/* Detailed Results */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-ink mb-6">Rezultate detaliate</h3>
          
          <div className="space-y-6">
            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  result.isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-semibold text-ink flex items-center gap-2">
                    <span className={`rounded-full h-6 w-6 flex items-center justify-center text-sm font-bold text-white ${
                      result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {result.isCorrect ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </span>
                    Întrebarea {index + 1}
                  </h4>
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(result.difficulty)}`}>
                    {getDifficultyLabel(result.difficulty)}
                  </span>
                </div>
                
                <p className="text-ink mb-3 ml-8">{result.question}</p>
                
                <div className="ml-8 space-y-2">
                  {quiz[index].options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`p-2 rounded border ${
                        optIndex === result.correctAnswer 
                          ? 'border-green-300 bg-green-100' 
                          : optIndex === result.userAnswer && !result.isCorrect
                          ? 'border-red-300 bg-red-100'
                          : 'border-line bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-purple-600">
                          {String.fromCharCode(65 + optIndex)}.
                        </span>
                        <span>{option}</span>
                        {optIndex === result.correctAnswer && (
                          <Check className="h-4 w-4 text-green-600 ml-auto" />
                        )}
                        {optIndex === result.userAnswer && !result.isCorrect && (
                          <X className="h-4 w-4 text-red-600 ml-auto" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {result.explanation && (
                  <div className="ml-8 mt-3 p-3 bg-blue-50 border-l-4 border-blue-300 rounded">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Explicație</p>
                        <p className="text-sm text-blue-700">{result.explanation}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <CheckSquare className="h-6 w-6 text-purple-600" />
        <h3 className="text-lg font-bold text-ink">
          Test de Evaluare ({quiz.length} întrebări)
        </h3>
      </div>
      
      <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-6">
        {quiz.map((question, questionIndex) => (
          <div key={questionIndex} className="mb-8 last:mb-0">
            <h4 className="font-semibold text-lg mb-4 flex items-start">
              <span className="bg-purple-600 text-white rounded-full h-8 w-8 flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                {questionIndex + 1}
              </span>
              <div className="flex-1">
                <span className="block">{question.question}</span>
                {question.difficulty && (
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${getDifficultyColor(question.difficulty)}`}>
                    {getDifficultyLabel(question.difficulty)} • {question.topic}
                  </span>
                )}
              </div>
            </h4>
            
            <div className="grid grid-cols-1 gap-3 ml-11">
              {question.options.map((option, optionIndex) => (
                <div 
                  key={optionIndex} 
                  className={`flex items-start bg-white p-3 rounded-lg border cursor-pointer transition-colors ${
                    userAnswers[questionIndex] === optionIndex
                      ? 'border-purple-300 bg-purple-50'
                      : 'border-line hover:bg-sunken'
                  }`}
                  onClick={() => handleAnswerSelect(questionIndex, optionIndex)}
                >
                  <input 
                    type="radio" 
                    id={`q${questionIndex}-opt${optionIndex}`}
                    name={`question-${questionIndex}`}
                    checked={userAnswers[questionIndex] === optionIndex}
                    onChange={() => handleAnswerSelect(questionIndex, optionIndex)}
                    className="mt-1 mr-3 flex-shrink-0"
                    disabled={isSubmitted}
                  />
                  <label 
                    htmlFor={`q${questionIndex}-opt${optionIndex}`} 
                    className="text-ink-soft cursor-pointer flex-1"
                  >
                    <span className="font-medium text-purple-600 mr-2">
                      {String.fromCharCode(65 + optionIndex)}.
                    </span>
                    {option}
                  </label>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="mt-8 pt-6 border-t border-purple-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-ink-soft">
              Răspunsuri completate: {userAnswers.filter(a => a !== -1).length} / {quiz.length}
            </div>
            <button
              onClick={submitQuiz}
              disabled={isSubmitting || userAnswers.includes(-1)}
              className={`px-6 py-3 rounded-lg font-medium shadow-md transition-colors flex items-center gap-2 ${
                isSubmitting || userAnswers.includes(-1)
                  ? 'bg-gray-200 text-ink-faint cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin"></div>
                  Se evaluează...
                </>
              ) : (
                <>
                  <CheckSquare className="h-5 w-5" />
                  Trimite răspunsurile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}