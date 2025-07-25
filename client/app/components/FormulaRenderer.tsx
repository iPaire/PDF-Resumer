import 'katex/dist/katex.min.css';
import { BlockMath, InlineMath } from 'react-katex';

interface FormulaRendererProps {
  content: string;
}

export default function FormulaRenderer({ content }: FormulaRendererProps) {
  // Split content by LaTeX formulas
  const parts = content.split(/(\$\$.*?\$\$|\$.*?\$)/g);

  return (
    <div>
      {parts.map((part, index) => {
        if (part.startsWith('$$') && part.endsWith('$$')) {
          return <BlockMath key={index} math={part.slice(2, -2)} />;
        } else if (part.startsWith('$') && part.endsWith('$')) {
          return <InlineMath key={index} math={part.slice(1, -1)} />;
        } else {
          return <span key={index}>{part}</span>;
        }
      })}
    </div>
  );
}