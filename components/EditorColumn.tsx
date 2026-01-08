import React, { useEffect } from 'react';

interface Props {
  content: string;
  onChange: (val: string) => void;
  onReset: () => void;
  isDirty: boolean;
  disabled?: boolean;
}

const EditorColumn: React.FC<Props> = ({ content, onChange, onReset, isDirty, disabled }) => {
  
  return (
    <div className="flex flex-col h-full border-r border-gray-300 bg-white">
      <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700 flex justify-between items-center">
        <div className="flex items-center gap-2">
            <span>Workbench</span>
            <span className="text-xs text-gray-400 font-normal">
              {isDirty ? "(Modified)" : "(Clean)"}
            </span>
        </div>
        <div className="flex gap-1">
          <button 
              onClick={onReset}
              disabled={!isDirty}
              title="Reset to Master Template (Discard Changes)"
              className={`text-xs px-2 py-1 rounded flex items-center gap-1 border ${!isDirty ? 'text-gray-300 border-transparent' : 'text-red-600 border-red-200 hover:bg-red-50 bg-white'}`}
          >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
              Reset
          </button>
        </div>
      </div>
      <textarea
        className="flex-1 w-full p-4 font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={content}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        spellCheck={false}
        placeholder="Working copy is empty. Open a workspace to load master.tex."
      />
    </div>
  );
};

export default EditorColumn;