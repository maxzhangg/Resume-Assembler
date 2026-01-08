import React, { useEffect, useState } from 'react';
import EditorColumn from './components/EditorColumn';
import PreviewColumn from './components/PreviewColumn';
import ToolsColumn from './components/ToolsColumn';
import { fileSystem } from './services/fileSystem';
import { parseMasterTex, assembleLatex } from './services/parser';
import { generatePrompt, safeMergeAIOutput } from './services/aiService';
import { AppState, ResumeSection } from './types';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    workspacePath: null,
    masterContent: '',
    sections: [],
    jobDescription: '',
    isCompiling: false,
    compileLog: 'Ready.',
    lastCompileSuccess: false,
    statusMessage: 'Ready'
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Initial Load (Simulating opening a workspace)
  useEffect(() => {
    // Optional: Load last workspace from local storage if needed
  }, []);

  // Handle Master Content Change (Manual Edit - In Memory)
  const handleEditorChange = (newContent: string) => {
      setState(prev => ({ ...prev, masterContent: newContent }));
  };

  // Handle Save to Disk
  const handleSaveMaster = async () => {
      if (!state.workspacePath) return;
      try {
        await fileSystem.writeFile(`${state.workspacePath}/master.tex`, state.masterContent);
        setState(prev => ({ ...prev, statusMessage: 'Saved master.tex successfully.' }));
      } catch (e: any) {
        setState(prev => ({ ...prev, statusMessage: `Error saving: ${e.message}` }));
      }
  };

  // Re-parse sections when masterContent changes
  useEffect(() => {
      const handler = setTimeout(() => {
          const sections = parseMasterTex(state.masterContent);
          setState(prev => {
              const mergedSections = sections.map(newSec => {
                  const oldSec = prev.sections.find(s => s.title === newSec.title);
                  if (oldSec) {
                      newSec.items = newSec.items.map(newItem => {
                          const oldItem = oldSec.items.find(i => i.content === newItem.content);
                          if (oldItem) newItem.isChecked = oldItem.isChecked;
                          return newItem;
                      });
                  }
                  return newSec;
              });
              return { ...prev, sections: mergedSections };
          });
      }, 1000);
      return () => clearTimeout(handler);
  }, [state.masterContent]);

  const handleToggleItem = (sectionId: string, itemId: string) => {
      setState(prev => ({
          ...prev,
          sections: prev.sections.map(sec => {
              if (sec.id !== sectionId) return sec;
              return {
                  ...sec,
                  items: sec.items.map(item => {
                      if (item.id !== itemId) return item;
                      return { ...item, isChecked: !item.isChecked };
                  })
              };
          })
      }));
  };

  const handleCompile = async () => {
      if (!state.workspacePath) return;

      setState(prev => ({ ...prev, isCompiling: true, statusMessage: 'Generating compiled.tex from current editor state...' }));
      setPdfUrl(null); // Clear previous PDF while compiling

      try {
          // 1. Assemble from In-Memory State (not disk)
          // This respects the "Compiled is temp tex" requirement
          const compiledTex = assembleLatex(state.masterContent, state.sections);
          
          // 2. Write compiled.tex to disk (Temporary build artifact)
          await fileSystem.writeFile(`${state.workspacePath}/compiled.tex`, compiledTex);
          
          // Ensure build directory exists for output
          await fileSystem.createDirectory(`${state.workspacePath}/build`);

          // 3. Run Command
          setState(prev => ({ ...prev, statusMessage: 'Running LaTeX Compiler...' }));
          const result = await fileSystem.runCompileCommand(state.workspacePath);
          
          if (result.success) {
              // 4. Load PDF for Preview
              setState(prev => ({ ...prev, statusMessage: 'Reading PDF...' }));
              try {
                // PDF is output to build/output.pdf because we use -outdir=build
                const pdfBase64 = await fileSystem.readBuffer(`${state.workspacePath}/build/compiled.pdf`);
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
                    statusMessage: 'Compilation successful, but build/compiled.pdf is missing.',
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
          setState(prev => ({ ...prev, isCompiling: false, statusMessage: `Error: ${e.message}` }));
      }
  };

  const handleGeneratePrompt = () => {
      const prompt = generatePrompt(state.jobDescription, state.sections);
      navigator.clipboard.writeText(prompt);
      alert("Prompt copied to clipboard! Paste it into ChatGPT/Claude.");
  };

  const handleAiMerge = async (aiOutput: string) => {
      // 1. Backup before merge
      if (state.workspacePath) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          await fileSystem.createDirectory(`${state.workspacePath}/backups`);
          await fileSystem.writeFile(`${state.workspacePath}/backups/master-${timestamp}.tex`, state.masterContent);
          await fileSystem.createDirectory(`${state.workspacePath}/patches`);
          await fileSystem.writeFile(`${state.workspacePath}/patches/patch-${timestamp}.txt`, aiOutput);
      }

      // 2. Safe Merge (Memory)
      const result = safeMergeAIOutput(state.masterContent, aiOutput);

      if (result.success) {
          // Update Memory
          setState(prev => ({ ...prev, masterContent: result.newContent, statusMessage: 'AI Merge Successful. Master saved automatically.' }));
          
          // 3. Save to Disk (AI Merge implies a commit to master)
          if (state.workspacePath) {
              await fileSystem.writeFile(`${state.workspacePath}/master.tex`, result.newContent);
          }
          
          // Optionally auto-compile
          setTimeout(handleCompile, 500);
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
          
          // "Open workspace should find existing tex... use as template"
          if (!exists) {
              const { SAMPLE_MASTER_TEX } = await import('./types');
              await fileSystem.writeFile(masterPath, SAMPLE_MASTER_TEX);
          }

          const content = await fileSystem.readFile(masterPath);
          const sections = parseMasterTex(content);
          
          setState(prev => ({ 
              ...prev, 
              workspacePath: dir, 
              masterContent: content, 
              sections,
              statusMessage: 'Workspace Loaded'
          }));
      }
  };

  return (
    <div className="h-screen w-full flex flex-col overflow-hidden">
      {/* Header */}
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

      {/* 3-Column Grid */}
      <div className="flex-1 grid grid-cols-12 min-h-0">
        <div className="col-span-4 h-full overflow-hidden">
            <EditorColumn 
                content={state.masterContent} 
                onChange={handleEditorChange} 
                onSave={handleSaveMaster}
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
            />
        </div>
      </div>
    </div>
  );
};

export default App;