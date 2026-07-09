'use client';

// Renders a plain-text string that may contain inline LaTeX between single
// dollar signs ($f_c$) - used where full markdown rendering is overkill
// (quiz questions/options, flashcards, concept definitions).
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

export default function MathText({ text }: { text: string }) {
  if (!text || !text.includes('$')) return <>{text}</>;

  const parts = text.split(/(\$[^$\n]+\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
          return (
            <InlineMath
              key={i}
              math={part.slice(1, -1)}
              renderError={() => <span>{part}</span>}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
