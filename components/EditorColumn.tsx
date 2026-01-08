import React, { useEffect } from 'react';

interface Props {
  content: string;
  onChange: (val: string) => void;
  onSave: () => void;
  disabled?: boolean;
}

const EditorColumn: React.FC<Props> = ({ content, onChange, onSave, disabled }) => {
  
  // Handle Ctrl+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave]);

  return (
    <div className="flex flex-col h-full border-r border-gray-300 bg-white">
      <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span>Master.tex</span>
            <span className="text-xs text-gray-400 font-normal">Editor</span>
        </div>
        <button 
            onClick={onSave}
            title="Save to Disk (Ctrl+S)"
            className="text-gray-600 hover:text-blue-600 transition-colors"
        >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
            </svg>
        </button>
      </div>
      <textarea
        className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
      />
    </div>
  );
};

export default EditorColumn;