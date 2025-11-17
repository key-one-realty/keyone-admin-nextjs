"use client";
import React, { useCallback, useRef, useState } from 'react';

interface TagInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  error?: boolean;
  errorMessage?: string;
}

const TagInput: React.FC<TagInputProps> = ({ value, onChange, placeholder, disabled, maxTags, error, errorMessage }) => {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commitInput = useCallback(() => {
    const raw = input.split(',').map(t => t.trim()).filter(Boolean);
    if (!raw.length) { setInput(''); return; }
    const next = [...value];
    raw.forEach(r => {
      if (!r) return;
      if (maxTags && next.length >= maxTags) return;
      // allow duplicates? currently avoid duplicates
      if (!next.includes(r)) next.push(r);
    });
    onChange(next);
    setInput('');
  }, [input, value, onChange, maxTags]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' ) {
      e.preventDefault();
      commitInput();
    } else if (e.key === 'Backspace' && !input && value.length) {
      // remove last tag
      const next = value.slice(0, -1);
      onChange(next);
    }
  };

  const removeTag = (tag: string) => {
    onChange(value.filter(v => v !== tag));
  };

  return (
    <div className="w-full">
      <div className={`min-h-11 w-full rounded-lg border ${error ? 'border-error-500 focus-within:border-error-500 focus-within:ring-error-500/10' : 'border-gray-300 focus-within:border-brand-300 focus-within:ring-brand-500/10'} bg-transparent px-2 py-1 flex flex-wrap items-center gap-1 dark:border-gray-700 dark:bg-gray-900`}>
      {value.map(tag => (
        <span key={tag} className="group flex items-center gap-1 rounded-md bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="text-blue-500 hover:text-blue-700 dark:text-blue-300 dark:hover:text-blue-100"
            aria-label={`Remove ${tag}`}
          >×</button>
        </span>
      ))}
  {(!maxTags || value.length < maxTags) && (
        <input
          ref={inputRef}
          type="text"
          className="flex-1 min-w-[120px] bg-transparent border-0 focus:outline-none focus:ring-0 text-sm text-gray-800 dark:text-white/90 placeholder:text-gray-400"
          placeholder={value.length ? '' : placeholder}
          value={input}
          disabled={disabled}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={commitInput}
        />
      )}
      </div>
      {error && errorMessage && (
        <p className="mt-1 text-xs text-error-500">{errorMessage}</p>
      )}
    </div>
  );
};

export default TagInput;
