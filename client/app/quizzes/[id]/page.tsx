'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { FileText, ArrowLeft, CheckCircle, XCircle } from 'react-feather';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function QuizPage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [quiz, setQuiz] = useState<QuizQuestion[]>([]);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (session) {
      fetchQuiz();
    }
  }, [session, params.id]);

  const fetchQuiz = async () => {
    try {
      const response = await fetch(`/api/quizzes/${params.id}`);
      const data = await response.json();
      
      if (response.ok) {
        setQuiz(data.quiz);
        setFileName(data.fileName);
      } else {
        console.error('Error fetching quiz:', data.error);
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex: number, optionIndex: number) => {
    if (!submitted) {
      const newSelectedOptions = [...selectedOptions];
      newSelectedOptions[questionIndex] = optionIndex;
      setSelectedOptions(newSelectedOptions);
    }
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.forEach((question, index) => {
      if (selectedOptions[index] === question.correctAnswer) {
        correct++;
      }
    });
    setScore(correct);
    setSubmitted(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Se încarcă testul...</p>
        </div>
      </div>
    );
  }

  if (quiz.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow">
          <div className="text-red-500 font-medium mb-4">Testul nu a fost găsit</div>
          <button
            onClick={() => router.push('/quizzes')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Înapoi la teste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link 
            href="/quizzes" 
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="mr-2 h-5 w-5" />
            Înapoi la teste
          </Link>
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Test: {fileName}</h1>
              <p className="mt-1 text-gray-600">
                {quiz.length} întrebări • Completează testul pentru a-ți verifica cunoștințele
              </p>
            </div>
            
            {submitted && (
              <div className="bg-blue-50 px-4 py-2 rounded-lg">
                <span className="font-semibold text-blue-800">
                  Scor: {score}/{quiz.length} ({Math.round((score / quiz.length) * 100)}%)
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          {quiz.map((question, qIndex) => (
            <div 
              key={qIndex} 
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-start">
                  <span className="bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                    {qIndex + 1}
                  </span>
                  {question.question}
                </h2>
                
                <div className="space-y-3 ml-11">
                  {question.options.map((option, oIndex) => {
                    const isSelected = selectedOptions[qIndex] === oIndex;
                    const isCorrect = oIndex === question.correctAnswer;
                    const showFeedback = submitted && (isSelected || isCorrect);
                    
                    return (
                      <div
                        key={oIndex}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          !submitted && isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        } ${
                          showFeedback ? 
                            isCorrect ? 
                              'border-green-500 bg-green-50' : 
                              (isSelected ? 'border-red-500 bg-red-50' : 'border-gray-200') 
                            : ''
                        } ${!submitted ? 'hover:border-blue-300' : ''}`}
                        onClick={() => handleOptionSelect(qIndex, oIndex)}
                      >
                        <div className="flex items-center">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center mr-3 ${
                            isSelected ? 
                              (submitted && !isCorrect ? 'border-red-500' : 'border-blue-500') : 
                              'border-gray-300'
                          }`}>
                            {isSelected && (
                              <div className={`w-3 h-3 rounded-full ${
                                submitted && !isCorrect ? 'bg-red-500' : 'bg-blue-500'
                              }`}></div>
                            )}
                          </div>
                          <span>{option}</span>
                          
                          {showFeedback && (
                            <span className="ml-auto">
                              {isCorrect ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : isSelected ? (
                                <XCircle className="h-5 w-5 text-red-500" />
                              ) : null}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!submitted ? (
          <div className="mt-8 text-center">
            <button
              onClick={calculateScore}
              disabled={selectedOptions.length !== quiz.length}
              className={`px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-lg shadow-lg hover:bg-blue-700 transition ${
                selectedOptions.length !== quiz.length ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              Verifică răspunsurile
            </button>
            <p className="mt-3 text-gray-500">
              {selectedOptions.length} din {quiz.length} întrebări completate
            </p>
          </div>
        ) : (
          <div className="mt-8 bg-white rounded-xl shadow-md p-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Rezultatul tău: {score}/{quiz.length}
            </h2>
            <p className="text-lg text-gray-600 mb-6">
              Ai răspuns corect la {Math.round((score / quiz.length) * 100)}% din întrebări
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Refă testul
              </button>
              <Link
                href="/quizzes"
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300"
              >
                Alte teste
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}