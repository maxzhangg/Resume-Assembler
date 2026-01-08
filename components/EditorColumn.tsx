import React from 'react';

interface Props {
  content: string;
  onChange: (val: string) => void;
  disabled?: boolean;
}

const EditorColumn: React.FC<Props> = ({ content, onChange, disabled }) => {
  return (
    <div className="flex flex-col h-full border-r border-gray-300 bg-white">
      <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700 flex justify-between items-center">
        <span>Master.tex</span>
        <span className="text-xs text-gray-400">Editor</span>
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
