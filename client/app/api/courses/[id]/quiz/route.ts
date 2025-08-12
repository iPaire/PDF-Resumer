import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authOptions';
import prisma from '@/lib/prisma';

type QuizQuestion = {
  question: string;
  options: string[];
  correct: number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  topic: string;
};

// POST - Generează quiz pentru curs
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // Obține datele utilizatorului pentru a verifica abonamentul
    const userData = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscription: true }
    });

    if (!userData) {
      return NextResponse.json({ error: 'Utilizatorul nu a fost găsit' }, { status: 404 });
    }

    const isPremium = userData.subscription === 'premium';

    // Obține cursul cu toate rezumatele
    const course = await prisma.course.findUnique({
      where: { 
        id: courseId,
        userId: userId 
      },
      include: { 
        summaries: {
          include: {
            summary: {
              select: {
                id: true,
                title: true,
                content: true
              }
            }
          },
          orderBy: {
            addedAt: 'asc'
          }
        } 
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Cursul nu a fost găsit' }, { status: 404 });
    }

    if (course.summaries.length === 0) {
      return NextResponse.json({ error: 'Cursul nu conține rezumate' }, { status: 400 });
    }

    // Combină toate rezumatele
    const combinedContent = course.summaries
      .map(cs => `## ${cs.summary.title}\n\n${cs.summary.content}`)
      .join('\n\n---\n\n');

    // Generează quiz-ul cu statusul premium
    const quizData = await generateQuiz(course.title, combinedContent, isPremium);

    // Verifică dacă există deja un quiz pentru acest curs
    const existingQuiz = await prisma.quiz.findFirst({
      where: { courseId: courseId }
    });

    let savedQuiz;
    if (existingQuiz) {
      // Actualizează quiz-ul existent
      savedQuiz = await prisma.quiz.update({
        where: { id: existingQuiz.id },
        data: { questions: quizData }
      });
    } else {
      // Creează un quiz nou
      savedQuiz = await prisma.quiz.create({
        data: {
          questions: quizData,
          course: {
            connect: { id: courseId }
          },
          user: {
            connect: { id: userId }
          }
        }
      });
    }

    return NextResponse.json({ 
      success: true,
      quiz: {
        id: savedQuiz.id,
        content: savedQuiz.questions,
        createdAt: savedQuiz.createdAt
      },
      questionCount: Array.isArray(savedQuiz.questions) ? (savedQuiz.questions as any[]).length : 0,
      isPremium: isPremium
    });

  } catch (error) {
    console.error('Error generating quiz:', error);
    return NextResponse.json({ 
      error: 'Eroare la generarea testului' 
    }, { status: 500 });
  }
}

// GET - Obține quiz-ul existent
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    // Verifică dacă cursul aparține utilizatorului
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        userId: userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Cursul nu a fost găsit' }, { status: 404 });
    }

    // Găsește toate quiz-urile pentru acest curs
    const quizzes = await prisma.quiz.findMany({
      where: { courseId: courseId },
      orderBy: { createdAt: 'desc' }
    });

    if (!quizzes || quizzes.length === 0) {
      return NextResponse.json({ 
        quizzes: [],
        courseTitle: course.title
      });
    }

    // Formatează quiz-urile pentru afișare
    const formattedQuizzes = quizzes.map(quiz => ({
      id: quiz.id,
      content: quiz.questions,
      createdAt: quiz.createdAt
    }));

    return NextResponse.json({
      quizzes: formattedQuizzes,
      courseTitle: course.title
    });

  } catch (error) {
    console.error('Error fetching quizzes:', error);
    return NextResponse.json({ error: 'Eroare server' }, { status: 500 });
  }
}

// DELETE - Șterge un quiz
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { quizId } = body;

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID este necesar' }, { status: 400 });
    }

    // Verifică dacă cursul aparține utilizatorului
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        userId: userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Cursul nu a fost găsit' }, { status: 404 });
    }

    // Verifică dacă quiz-ul aparține cursului
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        courseId: courseId
      }
    });

    if (!quiz) {
      return NextResponse.json({ error: 'Quiz-ul nu a fost găsit' }, { status: 404 });
    }

    // Șterge quiz-ul
    await prisma.quiz.delete({
      where: { id: quizId }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Quiz șters cu succes'
    });

  } catch (error) {
    console.error('Error deleting quiz:', error);
    return NextResponse.json({ error: 'Eroare la ștergerea quiz-ului' }, { status: 500 });
  }
}

// PUT - Evaluează răspunsurile utilizatorului
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Neautorizat' }, { status: 401 });
  }

  const courseId = params.id;
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { answers, quizId } = body;

    if (!quizId) {
      return NextResponse.json({ error: 'Quiz ID este necesar' }, { status: 400 });
    }

    // Verifică cursul și obține quiz-ul
    const course = await prisma.course.findUnique({
      where: {
        id: courseId,
        userId: userId
      }
    });

    if (!course) {
      return NextResponse.json({ error: 'Cursul nu a fost găsit' }, { status: 404 });
    }

    const quiz = await prisma.quiz.findFirst({
      where: { 
        id: quizId,
        courseId: courseId 
      }
    });

    if (!quiz || !quiz.questions) {
      return NextResponse.json({ error: 'Quiz-ul nu a fost găsit' }, { status: 404 });
    }

    const questions = quiz.questions as QuizQuestion[];
    
    // Evaluează răspunsurile
    const results = questions.map((question, index) => {
      const userAnswer = answers[index];
      const isCorrect = userAnswer === question.correct;
      
      return {
        questionIndex: index,
        question: question.question,
        userAnswer: userAnswer,
        correctAnswer: question.correct,
        isCorrect: isCorrect,
        explanation: question.explanation || '',
        difficulty: question.difficulty
      };
    });

    const correctAnswers = results.filter(r => r.isCorrect).length;
    const totalQuestions = questions.length;
    const percentage = Math.round((correctAnswers / totalQuestions) * 100);

    // Determină nota și feedback-ul
    const grade = calculateGrade(percentage);
    const feedback = generateFeedback(percentage, correctAnswers, totalQuestions);

    return NextResponse.json({
      results: results,
      summary: {
        correctAnswers: correctAnswers,
        totalQuestions: totalQuestions,
        percentage: percentage,
        grade: grade,
        feedback: feedback
      }
    });

  } catch (error) {
    console.error('Error evaluating quiz:', error);
    return NextResponse.json({ error: 'Eroare la evaluarea testului' }, { status: 500 });
  }
}

// Funcție principală pentru generarea quiz-ului
async function generateQuiz(
  courseTitle: string, 
  combinedContent: string,
  isPremium: boolean
): Promise<QuizQuestion[]> {
  const questions: QuizQuestion[] = [];
  
  // Extrage concepte și informații pentru întrebări
  const concepts = extractConcepts(combinedContent);
  const formulas = extractFormulasForQuiz(combinedContent);
  const definitions = extractDefinitionsForQuiz(combinedContent);
  const procedures = extractProcedures(combinedContent);
  
  // Setează numărul de întrebări pe categorii în funcție de statusul premium
  const defCount = isPremium ? 5 : 3;
  const formCount = isPremium ? 4 : 2;
  const concCount = isPremium ? 4 : 3;
  const appCount = isPremium ? 2 : 2;
  
  // 1. Întrebări despre definiții
  const definitionQuestions = generateDefinitionQuestions(definitions);
  questions.push(...definitionQuestions.slice(0, defCount));
  
  // 2. Întrebări despre formule
  const formulaQuestions = generateFormulaQuestions(formulas);
  questions.push(...formulaQuestions.slice(0, formCount));
  
  // 3. Întrebări despre concepte
  const conceptQuestions = generateConceptQuestions(concepts);
  questions.push(...conceptQuestions.slice(0, concCount));
  
  // 4. Întrebări despre aplicații
  const applicationQuestions = generateApplicationQuestions(procedures, concepts);
  questions.push(...applicationQuestions.slice(0, appCount));
  
  // Amestecă întrebările și limitează la numărul corespunzător
  const totalQuestions = isPremium ? 15 : 10;
  return shuffleArray(questions).slice(0, totalQuestions);
}

// Generează întrebări despre definiții
function generateDefinitionQuestions(definitions: Array<{term: string, definition: string}>): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  definitions.forEach(def => {
    if (def.term && def.definition && def.term.length > 2 && def.definition.length > 10) {
      // Creează răspunsuri greșite plausibile
      const wrongAnswers = [
        `Un tip de ${def.term.toLowerCase()} folosit în alte domenii`,
        `Procesul invers al ${def.term.toLowerCase()}`,
        `O metodă de calculare a ${def.term.toLowerCase()}`
      ];
      
      const options = shuffleArray([def.definition, ...wrongAnswers]).slice(0, 4);
      const correctIndex = options.indexOf(def.definition);
      
      if (correctIndex !== -1) {
        questions.push({
          question: `Care este definiția corectă pentru "${def.term}"?`,
          options: options,
          correct: correctIndex,
          explanation: `${def.term} se definește ca: ${def.definition}`,
          difficulty: 'easy',
          topic: 'definiții'
        });
      }
    }
  });
  
  return questions;
}

// Generează întrebări despre formule
function generateFormulaQuestions(formulas: string[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  formulas.forEach(formula => {
    if (formula.includes('=') && formula.length > 5) {
      const [left, right] = formula.split('=').map(s => s.trim());
      
      if (left && right) {
        // Creează variante greșite
        const wrongOptions = [
          `${left} = ${modifyFormula(right, 'add')}`,
          `${left} = ${modifyFormula(right, 'change_sign')}`,
          `${modifyVariable(left)} = ${right}`
        ].filter(opt => opt !== formula);
        
        const options = shuffleArray([formula, ...wrongOptions]).slice(0, 4);
        const correctIndex = options.indexOf(formula);
        
        if (correctIndex !== -1) {
          questions.push({
            question: `Care este formula corectă pentru calculul lui ${left}?`,
            options: options,
            correct: correctIndex,
            explanation: `Formula corectă este: ${formula}`,
            difficulty: 'medium',
            topic: 'formule'
          });
        }
      }
    }
  });
  
  return questions;
}

// Generează întrebări despre concepte
function generateConceptQuestions(concepts: string[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  concepts.forEach(concept => {
    if (concept && concept.length > 3) {
      const cleanConcept = concept.trim();
      const wrongAnswers = [
        `${cleanConcept} nu este relevant în acest context`,
        `${cleanConcept} se aplică doar în situații speciale`,
        `${cleanConcept} este o metodă depășită`
      ];
      
      const correctAnswer = `${cleanConcept} este un concept fundamental`;
      const options = shuffleArray([correctAnswer, ...wrongAnswers]).slice(0, 4);
      const correctIndex = options.indexOf(correctAnswer);
      
      if (correctIndex !== -1) {
        questions.push({
          question: `Ce se poate spune despre ${cleanConcept}?`,
          options: options,
          correct: correctIndex,
          explanation: `${cleanConcept} reprezintă unul din conceptele de bază ale cursului.`,
          difficulty: 'medium',
          topic: 'concepte'
        });
      }
    }
  });
  
  return questions;
}

// Generează întrebări despre aplicații
function generateApplicationQuestions(procedures: string[], concepts: string[]): QuizQuestion[] {
  const questions: QuizQuestion[] = [];
  
  if (procedures.length > 0) {
    const wrongAnswers = [
      "Se ignoră toți parametrii inițiali",
      "Se aplică formula în sens invers", 
      "Se folosesc doar valorile aproximative"
    ];
    
    const correctAnswer = "Se urmează pașii specificați în procedură";
    const options = shuffleArray([correctAnswer, ...wrongAnswers]);
    const correctIndex = options.indexOf(correctAnswer);
    
    questions.push({
      question: `Când aplicăm procedurile menționate în curs, ce este important să facem?`,
      options: options,
      correct: correctIndex,
      explanation: `Este esențial să urmărim cu atenție toți pașii procedurii pentru a obține rezultate corecte.`,
      difficulty: 'hard',
      topic: 'aplicații'
    });
  }
  
  return questions;
}

// Funcții helper pentru extragerea informațiilor
function extractConcepts(text: string): string[] {
  const concepts = new Set<string>();
  const conceptPatterns = [
    /conceptul\s+de\s+([^.,!?\n]{5,30})/gi,
    /principiul\s+([^.,!?\n]{5,30})/gi,
    /teoria\s+([^.,!?\n]{5,30})/gi,
    /legea\s+([^.,!?\n]{5,30})/gi,
    /metoda\s+([^.,!?\n]{5,30})/gi
  ];
  
  conceptPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const concept = match[1].trim();
      if (concept.length > 3 && concept.length < 50) {
        concepts.add(concept);
      }
    }
  });
  
  return Array.from(concepts).slice(0, 8);
}

function extractFormulasForQuiz(text: string): string[] {
  const formulas = new Set<string>();
  const formulaPatterns = [
    /([A-Z][a-z]?\s*=\s*[^.\n]{3,50})/g,
    /([a-zA-Z]+\s*=\s*[0-9][^.\n]{2,40})/g
  ];
  
  formulaPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const formula = match[1].trim();
      if (formula.length > 5 && formula.length < 60 && !formula.includes('http')) {
        formulas.add(formula);
      }
    }
  });
  
  return Array.from(formulas).slice(0, 6);
}

function extractDefinitionsForQuiz(text: string): Array<{term: string, definition: string}> {
  const definitions: Array<{term: string, definition: string}> = [];
  const sentences = text.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const definitionPatterns = [
      /^([A-Z][a-zA-Z\s]{2,25})\s+(este|reprezintă|se definește ca)\s+(.{10,80})/i,
      /([A-Z][a-zA-Z\s]{2,25})\s*:\s*(.{10,80})/i
    ];
    
    definitionPatterns.forEach(pattern => {
      const match = pattern.exec(trimmed);
      if (match) {
        const term = match[1].trim();
        const definition = (match[3] || match[2]).trim();
        
        if (term.length > 2 && definition.length > 10) {
          definitions.push({ term, definition });
        }
      }
    });
  });
  
  return definitions.slice(0, 5);
}

function extractProcedures(text: string): string[] {
  const procedures: string[] = [];
  const sentences = text.split(/[.!?]+/);
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    const indicators = ['pas', 'etap', 'procedur', 'algoritm', 'metodă'];
    
    if (indicators.some(indicator => trimmed.toLowerCase().includes(indicator)) && 
        trimmed.length > 25 && trimmed.length < 150) {
      procedures.push(trimmed);
    }
  });
  
  return procedures.slice(0, 4);
}

// Funcții utilitare
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function modifyFormula(formula: string, type: 'add' | 'change_sign'): string {
  if (type === 'add') {
    return formula.replace(/\d+/g, (match) => String(parseInt(match) + 1));
  } else if (type === 'change_sign') {
    return formula.replace(/[+\-]/g, (match) => match === '+' ? '-' : '+');
  }
  return formula;
}

function modifyVariable(variable: string): string {
  return variable.replace(/[a-zA-Z]/g, 'x');
}

function calculateGrade(percentage: number): string {
  if (percentage >= 90) return '10';
  if (percentage >= 80) return '9';
  if (percentage >= 70) return '8';
  if (percentage >= 60) return '7';
  if (percentage >= 50) return '6';
  return '5';
}

function generateFeedback(percentage: number, correct: number, total: number): string {
  if (percentage >= 90) {
    return `Excelent! Ai răspuns corect la ${correct} din ${total} întrebări. Cunoștințele tale sunt foarte solide.`;
  } else if (percentage >= 70) {
    return `Bine! Ai răspuns corect la ${correct} din ${total} întrebări. Mai ai câteva aspecte de îmbunătățit.`;
  } else if (percentage >= 50) {
    return `Satisfăcător. Ai răspuns corect la ${correct} din ${total} întrebări. Recomand să mai studiezi materialele.`;
  } else {
    return `Ai răspuns corect la doar ${correct} din ${total} întrebări. Este necesar să studiezi din nou cursul.`;
  }
}