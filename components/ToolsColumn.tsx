import React, { useState } from 'react';
import { ResumeSection } from '../types';

interface Props {
  sections: ResumeSection[];
  onToggleItem: (sectionId: string, itemId: string) => void;
  jd: string;
  onJdChange: (val: string) => void;
  onGeneratePrompt: () => void;
  onCompile: () => void;
  isCompiling: boolean;
  onAiMerge: (output: string) => void;
}

const ToolsColumn: React.FC<Props> = ({ 
  sections, onToggleItem, jd, onJdChange, onGeneratePrompt, onCompile, isCompiling, onAiMerge
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'ai'>('modules');
  const [aiInput, setAiInput] = useState('');

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Tabs */}
      <div className="flex border-b border-gray-300">
        <button 
          onClick={() => setActiveTab('modules')}
          className={`flex-1 p-3 text-sm font-semibold ${activeTab === 'modules' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Modules
        </button>
        <button 
          onClick={() => setActiveTab('ai')}
          className={`flex-1 p-3 text-sm font-semibold ${activeTab === 'ai' ? 'text-purple-600 border-b-2 border-purple-600' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          AI Assistant
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'modules' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-700">Resume Sections</h3>
                <button 
                    onClick={onCompile}
                    disabled={isCompiling}
                    className={`px-4 py-2 rounded text-white text-sm font-bold shadow ${isCompiling ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                >
                    {isCompiling ? 'Compiling...' : 'Compile PDF'}
                </button>
            </div>

            {sections.length === 0 && <p className="text-gray-400 text-sm">No sections parsed. Check master.tex syntax.</p>}

            {sections.map(sec => (
              <div key={sec.id} className="border rounded-lg p-3 bg-gray-50">
                <h4 className="font-semibold text-sm mb-2 text-gray-800 border-b pb-1">{sec.title}</h4>
                <div className="space-y-2">
                  {sec.items.map(item => (
                    <label key={item.id} className="flex items-start gap-2 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={item.isChecked} 
                        onChange={() => onToggleItem(sec.id, item.id)}
                        className="mt-1"
                      />
                      <div className="text-xs text-gray-600 group-hover:text-gray-900 break-words w-full">
                        {item.title}
                      </div>
                    </label>
                  ))}
                  {sec.items.length === 0 && <span className="text-xs text-gray-400 italic">No toggleable items found</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* JD Input */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Job Description (JD)</label>
              <textarea 
                className="w-full border rounded p-2 text-xs h-32 focus:ring-2 focus:ring-purple-400 outline-none"
                placeholder="Paste JD here..."
                value={jd}
                onChange={(e) => onJdChange(e.target.value)}
              />
              <button 
                onClick={onGeneratePrompt}
                className="w-full mt-2 bg-purple-100 text-purple-700 py-2 rounded text-xs font-bold hover:bg-purple-200 border border-purple-300"
              >
                Generate Prompt (Copy to Clipboard)
              </button>
            </div>

            <hr />

            {/* AI Output Paste */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Paste AI Output Here</label>
              <div className="text-[10px] text-gray-500 mb-2">
                Expected format: %%%BEGIN_SECTION%%% ... %%%END_SECTION%%%
              </div>
              <textarea 
                className="w-full border rounded p-2 text-xs h-32 focus:ring-2 focus:ring-green-400 outline-none font-mono"
                placeholder="Paste the result from ChatGPT/Claude..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
              />
              <button 
                onClick={() => {
                    onAiMerge(aiInput);
                    setAiInput('');
                }}
                disabled={!aiInput.trim()}
                className="w-full mt-2 bg-green-600 text-white py-2 rounded text-xs font-bold hover:bg-green-700 disabled:bg-gray-300"
              >
                Safe Merge & Recompile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ToolsColumn;
