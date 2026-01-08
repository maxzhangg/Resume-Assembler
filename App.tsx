import React, { useEffect, useState, useRef } from 'react';
import EditorColumn from './components/EditorColumn';
import PreviewColumn from './components/PreviewColumn';
import ToolsColumn from './components/ToolsColumn';
import { fileSystem } from './services/fileSystem';
import { parseMasterTex, assembleLatex } from './services/parser';
import { generatePrompt, safeMergeAIOutput } from './services/aiService';
import { AppState, SAMPLE_MASTER_TEX, ResumeSection } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    workspacePath: null,
    masterContent: '',   
    workingContent: '',  
    sections: [],
    jobDescription: '',
    isCompiling: false,
    compileLog: 'Ready.',
    lastCompileSuccess: false,
    statusMessage: 'Ready',
    compilerEngine: 'checking'
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // Ref to hold the latest section check states to survive re-parsing
  const sectionStateRef = useRef<Record<string, Record<string, boolean>>>({});

  // Helper to sync ref with current state sections
  const updateSectionStateRef = (sections: ResumeSection[]) => {
      sections.forEach(sec => {
          if (!sectionStateRef.current[sec.title]) sectionStateRef.current[sec.title] = {};
          sec.items.forEach(item => {
              sectionStateRef.current[sec.title][item.content] = item.isChecked;
          });
      });
  };

  useEffect(() => {
    // Check compiler engine on startup
    fileSystem.getCompilerEngine().then(engine => {
      setState(prev => ({ ...prev, compilerEngine: engine }));
    });
  }, []);

  const handleEditorChange = (newContent: string) => {
      setState(prev => ({ ...prev, workingContent: newContent }));
  };

  const handleResetToMaster = () => {
      if (!state.masterContent) return;
      if (window.confirm("Are you sure? This will discard all current edits and reload from master.tex.")) {
        setState(prev => ({ 
            ...prev, 
            workingContent: prev.masterContent,
            statusMessage: 'Reset working copy to Master Template.' 
        }));
      }
  };

  // Debounced parsing for UI updates
  useEffect(() => {
      const handler = setTimeout(() => {
          const freshSections = parseMasterTex(state.workingContent);
          
          setState(prev => {
              // Preserve checkboxes based on Content matching
              // This relies on the content string being the identity of the item
              const mergedSections = freshSections.map(newSec => {
                  const oldSec = prev.sections.find(s => s.title === newSec.title);
                  
                  // Also check Ref for persisted state
                  const savedState = sectionStateRef.current[newSec.title] || {};

                  if (oldSec || savedState) {
                      newSec.items = newSec.items.map(newItem => {
                          // Priority: Current State -> Saved Ref -> Default True
                          const oldItem = oldSec?.items.find(i => i.content === newItem.content);
                          if (oldItem) {
                              newItem.isChecked = oldItem.isChecked;
                          } else if (savedState[newItem.content] !== undefined) {
                              newItem.isChecked = savedState[newItem.content];
                          }
                          return newItem;
                      });
                  }
                  return newSec;
              });
              
              // Update ref with new structure
              updateSectionStateRef(mergedSections);
              
              return { ...prev, sections: mergedSections };
          });
      }, 800); 
      return () => clearTimeout(handler);
  }, [state.workingContent]);

  const handleToggleItem = (sectionId: string, itemId: string) => {
      setState(prev => {
          const newSections = prev.sections.map(sec => {
              if (sec.id !== sectionId) return sec;
              return {
                  ...sec,
                  items: sec.items.map(item => {
                      if (item.id !== itemId) return item;
                      return { ...item, isChecked: !item.isChecked };
                  })
              };
          });
          updateSectionStateRef(newSections);
          return { ...prev, sections: newSections };
      });
  };

  const handleCompile = async () => {
      if (!state.workspacePath) return;

      setState(prev => ({ ...prev, isCompiling: true, statusMessage: 'Preparing compiled.tex...' }));
      setPdfUrl(null); 

      try {
          // 1. CRITICAL: Re-parse immediately to get accurate indices for the CURRENT content
          // The state.sections might be stale if user typed recently.
          const freshSections = parseMasterTex(state.workingContent);
          
          // 2. Apply Checkbox State to Fresh Sections
          // We must map the user's choices (from state.sections/ref) onto these fresh indices
          const sectionsWithState = freshSections.map(freshSec => {
             const userSec = state.sections.find(s => s.title === freshSec.title);
             const savedState = sectionStateRef.current[freshSec.title] || {};
             
             freshSec.items = freshSec.items.map(freshItem => {
                 // Try to find matching item in user state to respect their choice
                 // Matching by Content is the safest heuristic here
                 const userItem = userSec?.items.find(i => i.content === freshItem.content);
                 if (userItem) {
                     freshItem.isChecked = userItem.isChecked;
                 } else if (savedState[freshItem.content] !== undefined) {
                     freshItem.isChecked = savedState[freshItem.content];
                 }
                 return freshItem;
             });
             return freshSec;
          });

          // 3. Assemble
          const compiledTex = assembleLatex(state.workingContent, sectionsWithState);
          
          // 4. Write & Compile
          await fileSystem.writeFile(`${state.workspacePath}/compiled.tex`, compiledTex);
          await fileSystem.createDirectory(`${state.workspacePath}/build`);

          setState(prev => ({ ...prev, statusMessage: 'Running LaTeX Compiler...' }));
          const result = await fileSystem.runCompileCommand(state.workspacePath);
          
          if (result.success) {
              setState(prev => ({ ...prev, statusMessage: 'Reading PDF...' }));
              try {
                const pdfBase64 = await fileSystem.readBuffer(`${state.workspacePath}/build/compiled.pdf`);
                // Use blob URL if possible for better performance? 
                // For now base64 is simpler with the IPC setup.
                setPdfUrl(`data:application/pdf;base64,${pdfBase64}`);
                setState(prev => ({ 
                    ...prev, 
                    isCompiling: false, 
                    compileLog: result.stdout,
                    statusMessage: 'Compilation Success',
                    lastCompileSuccess: true
                }));
              } catch (readError) {
                 setState(prev => ({ 
                    ...prev, 
                    isCompiling: false, 
                    statusMessage: 'Compilation successful, but output PDF is missing.',
                    lastCompileSuccess: false
                }));
              }
          } else {
            setState(prev => ({ 
                ...prev, 
                isCompiling: false, 
                compileLog: result.stdout + "\n" + result.stderr,
                statusMessage: 'Compilation Failed',
                lastCompileSuccess: false
            }));
          }

      } catch (e: any) {
          console.error(e);
          setState(prev => ({ ...prev, isCompiling: false, statusMessage: `Error: ${e.message}` }));
      }
  };

  const handleGeneratePrompt = () => {
      const prompt = generatePrompt(state.jobDescription, state.sections);
      navigator.clipboard.writeText(prompt);
      alert("Prompt copied to clipboard!");
  };

  const handleAiMerge = async (aiOutput: string) => {
      const result = safeMergeAIOutput(state.workingContent, aiOutput);

      if (result.success) {
          setState(prev => ({ 
              ...prev, 
              workingContent: result.newContent, 
              statusMessage: 'AI Merge Applied. Click Compile to update view.' 
          }));
      } else {
          alert(result.error);
          setState(prev => ({ ...prev, statusMessage: 'AI Merge Blocked by Safety Check' }));
      }
  };

  const handleOpenWorkspace = async () => {
      const dir = await fileSystem.selectDirectory();
      if (dir) {
          const masterPath = `${dir}/master.tex`;
          const exists = await fileSystem.exists(masterPath);
          
          if (!exists) {
              await fileSystem.writeFile(masterPath, SAMPLE_MASTER_TEX);
          }

          const content = await fileSystem.readFile(masterPath);
          const sections = parseMasterTex(content);
          
          setState(prev => ({ 
              ...prev, 
              workspacePath: dir, 
              masterContent: content,  
              workingContent: content, 
              sections,
              statusMessage: 'Workspace Loaded'
          }));
          updateSectionStateRef(sections);
      }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      <div className="h-12 bg-gray-900 text-white flex items-center px-4 justify-between shrink-0">
        <div className="font-bold text-lg flex items-center gap-2">
            <span>📝 Resume Assembler</span>
            <span className="text-xs font-normal text-gray-400 bg-gray-800 px-2 py-1 rounded">
                {state.workspacePath || "No Workspace Selected"}
            </span>
        </div>
        <div className="flex gap-2">
            <button onClick={handleOpenWorkspace} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
                Open Workspace
            </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 min-h-0">
        <div className="col-span-4 h-full overflow-hidden">
            <EditorColumn 
                content={state.workingContent} 
                onChange={handleEditorChange} 
                onReset={handleResetToMaster}
                isDirty={state.workingContent !== state.masterContent}
            />
        </div>
        <div className="col-span-5 h-full overflow-hidden">
            <PreviewColumn 
                isCompiling={state.isCompiling} 
                statusMessage={state.compileLog}
                pdfUrl={pdfUrl}
            />
        </div>
        <div className="col-span-3 h-full overflow-hidden border-l border-gray-300">
            <ToolsColumn 
                sections={state.sections}
                onToggleItem={handleToggleItem}
                jd={state.jobDescription}
                onJdChange={(val) => setState(prev => ({...prev, jobDescription: val}))}
                onGeneratePrompt={handleGeneratePrompt}
                onCompile={handleCompile}
                isCompiling={state.isCompiling}
                onAiMerge={handleAiMerge}
                compilerEngine={state.compilerEngine}
            />
        </div>
      </div>
    </div>
  );
};

export default App;