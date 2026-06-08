
import React from 'react';

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

const RichTextDisplay: React.FC<RichTextDisplayProps> = ({ content, className = "" }) => {
  // Simple parser for **bold** and newlines
  const formatText = (text: string) => {
    if (!text) return null;
    
    // Split by newlines first
    return text.split('\n').map((line, i) => {
      // Process bold tags: **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      
      const processedLine = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <b key={j} className="font-black text-gray-900">{part.slice(2, -2)}</b>;
        }
        return part;
      });

      return (
        <React.Fragment key={i}>
          {processedLine}
          {i < text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  return (
    <div className={`whitespace-pre-wrap break-words ${className}`}>
      {formatText(content)}
    </div>
  );
};

export default RichTextDisplay;
