
import React, { useState, useEffect } from 'react';

interface TerminalTextProps {
  text: string;
  speed?: number;
  className?: string;
  delay?: number;
}

export const TerminalText: React.FC<TerminalTextProps> = ({ 
  text, 
  speed = 30, 
  className = "",
  delay = 0 
}) => {
  const [displayedText, setDisplayedText] = useState("");
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setDisplayedText("");
    setIndex(0);
  }, [text]);

  useEffect(() => {
    const startTimeout = setTimeout(() => {
      if (index < text.length) {
        const timeout = setTimeout(() => {
          setDisplayedText((prev) => prev + text.charAt(index));
          setIndex((prev) => prev + 1);
        }, speed);
        return () => clearTimeout(timeout);
      }
    }, delay);
    return () => clearTimeout(startTimeout);
  }, [index, text, speed, delay]);

  return (
    <div className={`font-mono leading-relaxed ${className}`}>
      {displayedText}
      {index < text.length && <span className="inline-block w-2 h-4 ml-1 bg-emerald-500 animate-pulse align-middle" />}
    </div>
  );
};
