// components/CheatSheetGenerator.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

export function CheatSheetGenerator({ courseId }: { courseId: string }) {
  const [cheatSheet, setCheatSheet] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generateCheatSheet = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/courses/${courseId}/cheat-sheet`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Eroare la generare');
      }
      
      const data = await response.json();
      setCheatSheet(data.cheatSheet);
      setCourseTitle(data.courseTitle || '');
    } catch (err) {
      setError('Nu am putut genera copiuța');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Copiuță Printabilă</h2>
        <div className="space-x-2">
          <Button 
            onClick={generateCheatSheet} 
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Se generează...</>
            ) : 'Generează Copiuța'}
          </Button>
          
          {cheatSheet && (
            <Button variant="secondary" onClick={handlePrint}>
              Printează
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-500 mb-4 p-3 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      {cheatSheet ? (
        <div className="print-container border p-4 rounded bg-gray-50">
          <header className="text-center mb-6 print:mb-2">
            <h1 className="text-2xl font-bold">Copiuță - {courseTitle}</h1>
            <div className="text-xs text-gray-500 mt-1">
              Generat la {new Date().toLocaleDateString('ro-RO')}
            </div>
          </header>
          
          <div 
            dangerouslySetInnerHTML={{ __html: cheatSheet.replace(/\n/g, '<br/>') }} 
            className="prose prose-sm max-w-none print:prose-print"
          />
          
          <footer className="mt-8 text-center text-xs text-gray-500 print:mt-4">
            © {new Date().getFullYear()} - Aplicația Mea
          </footer>
        </div>
      ) : (
        <div className="text-center py-10 bg-gray-50 rounded border">
          <p className="text-gray-500">
            Apasă "Generează Copiuța" pentru a crea o foaie de formulare printabilă
          </p>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 15px;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}