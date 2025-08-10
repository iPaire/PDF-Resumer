// components/CheatSheetGenerator.tsx
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, RefreshCw } from 'lucide-react';

interface CheatSheetGeneratorProps {
  courseId: string;
}

export function CheatSheetGenerator({ courseId }: CheatSheetGeneratorProps) {
  const [cheatSheet, setCheatSheet] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasExistingCheatSheet, setHasExistingCheatSheet] = useState(false);

  // Verifică dacă există deja o copiuță pentru acest curs
  useEffect(() => {
    checkExistingCheatSheet();
  }, [courseId]);

  const checkExistingCheatSheet = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}/cheat-sheet`);
      if (response.ok) {
        const data = await response.json();
        setCheatSheet(data.cheatSheet);
        setCourseTitle(data.courseTitle);
        setHasExistingCheatSheet(true);
      } else if (response.status !== 404) {
        console.error('Error checking existing cheat sheet');
      }
    } catch (err) {
      console.error('Error checking existing cheat sheet:', err);
    }
  };

  const generateCheatSheet = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/courses/${courseId}/cheat-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Eroare la generare');
      }
      
      const data = await response.json();
      setCheatSheet(data.cheatSheet);
      setCourseTitle(data.courseTitle || '');
      setHasExistingCheatSheet(true);
    } catch (err: any) {
      setError(err.message || 'Nu am putut genera copiuța');
      console.error('Cheat sheet generation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Creează o nouă fereastră pentru print
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Copiuță - ${courseTitle}</title>
        <style>
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            font-family: 'Times New Roman', serif;
            font-size: 10px;
            line-height: 1.2;
            margin: 0;
            padding: 0;
          }
          .cheat-sheet {
            max-width: 210mm;
            margin: 0 auto;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${cheatSheet}
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Așteaptă să se încarce conținutul apoi printează
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  const downloadHTML = () => {
    if (!cheatSheet) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="ro">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Copiuță - ${courseTitle}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 10px;
      line-height: 1.2;
      margin: 0;
      padding: 0;
      background: white;
    }
    .cheat-sheet {
      max-width: 210mm;
      margin: 0 auto;
      padding: 5mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  ${cheatSheet}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copiuta-${courseTitle.toLowerCase().replace(/\s+/g, '-')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="border rounded-lg p-6 bg-white">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Copiuță Printabilă
          </h2>
          {courseTitle && (
            <p className="text-sm text-gray-600 mt-1">Pentru cursul: {courseTitle}</p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {hasExistingCheatSheet && (
            <Button 
              variant="outline" 
              onClick={generateCheatSheet} 
              disabled={loading}
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerează
            </Button>
          )}
          
          <Button 
            onClick={generateCheatSheet} 
            disabled={loading}
            variant={hasExistingCheatSheet ? "outline" : "default"}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Se generează...
              </>
            ) : hasExistingCheatSheet ? (
              'Generează din nou'
            ) : (
              'Generează Copiuța'
            )}
          </Button>
          
          {cheatSheet && (
            <>
              <Button variant="secondary" onClick={handlePrint} size="sm">
                Printează
              </Button>
              <Button variant="outline" onClick={downloadHTML} size="sm">
                <Download className="mr-2 h-4 w-4" />
                Descarcă
              </Button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="text-red-600 mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <strong>Eroare:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-8 bg-gray-50 rounded border">
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600 mb-2" />
            <p className="text-gray-600">Se generează copiuța...</p>
            <p className="text-xs text-gray-500 mt-1">Acest proces poate dura câteva secunde</p>
          </div>
        </div>
      )}

      {cheatSheet && !loading ? (
        <div className="space-y-4">
          {/* Preview container cu scroll */}
          <div 
            id="cheat-sheet-preview"
            className="cheat-sheet-preview border rounded-lg p-4 bg-gray-50 max-h-96 overflow-y-auto"
            style={{ fontSize: '12px' }} // Slightly larger for preview
          >
            <div 
              dangerouslySetInnerHTML={{ __html: cheatSheet }} 
              className="prose prose-sm max-w-none"
            />
          </div>

          {/* Info footer */}
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded border">
            <div className="flex items-center justify-between">
              <span>✅ Copiuța a fost generată cu succes</span>
              <span>Optimizată pentru format A4</span>
            </div>
          </div>
        </div>
      ) : !loading && (
        <div className="text-center py-12 bg-gray-50 rounded border border-dashed border-gray-300">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nicio copiuță generată
          </h3>
          <p className="text-gray-500 mb-4">
            Apasă "Generează Copiuța" pentru a crea o foaie de formule printabilă cu toate conceptele importante din curs.
          </p>
          <ul className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
            <li>• Formule și constante matematice</li>
            <li>• Definiții și termeni cheie</li>
            <li>• Proceduri și algoritmi</li>
            <li>• Optimizată pentru printare</li>
          </ul>
        </div>
      )}

      {/* CSS pentru print și preview */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container, 
          .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 0;
            margin: 0;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }

        .cheat-sheet