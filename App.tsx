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
    const init = async () => {
        // In real app, check if workspace was previously open
        const path = 'C:/Work/Resume/master.tex';
        if (await fileSystem.exists(path)) {
            const content = await fileSystem.readFile(path);
            const sections = parseMasterTex(content);
            setState(prev => ({ ...prev, workspacePath: 'C:/Work/Resume', masterContent: content, sections }));
        }
    };
    init();
  }, []);

  // Handle Master Content Change (Manual Edit)
  const handleEditorChange = (newContent: string) => {
      // Re-parse on significant changes or debounce (omitted for brevity)
      // For now, just update text, parser runs on specific triggers or effects?
      // Better: Update text, but only re-parse structure if user clicks "Refresh" or saves.
      // To keep UI responsive, we update content state immediately.
      setState(prev => ({ ...prev, masterContent: newContent }));
  };

  // Re-parse sections when masterContent changes (Debounced ideally)
  useEffect(() => {
      const handler = setTimeout(() => {
          const sections = parseMasterTex(state.masterContent);
          // We need to preserve checked state if IDs match
          setState(prev => {
              const mergedSections = sections.map(newSec => {
                  const oldSec = prev.sections.find(s => s.title === newSec.title); // Simple matching by title
                  if (oldSec) {
                      newSec.items = newSec.items.map(newItem => {
                          const oldItem = oldSec.items.find(i => i.content === newItem.content); // Match by content
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

      setState(prev => ({ ...prev, isCompiling: true, statusMessage: 'Generating compiled.tex...' }));

      try {
          // 1. Assemble
          const compiledTex = assembleLatex(state.masterContent, state.sections);
          
          // 2. Write to build folder
          await fileSystem.createDirectory(`${state.workspacePath}/build`);
          await fileSystem.writeFile(`${state.workspacePath}/build/compiled.tex`, compiledTex);
          
          // 3. Run Command
          setState(prev => ({ ...prev, statusMessage: 'Running Latexmk...' }));
          const result = await fileSystem.runCompileCommand(state.workspacePath);
          
          setState(prev => ({ 
              ...prev, 
              isCompiling: false, 
              compileLog: result.stdout || result.stderr,
              statusMessage: result.success ? 'Compilation Success' : 'Compilation Failed',
              lastCompileSuccess: result.success
          }));

          if (result.success) {
              setPdfUrl('dummy-url-trigger'); // In real app, this is a file:// url or blob
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
      // 1. Backup
      if (state.workspacePath) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          await fileSystem.createDirectory(`${state.workspacePath}/backups`);
          await fileSystem.writeFile(`${state.workspacePath}/backups/master-${timestamp}.tex`, state.masterContent);
          await fileSystem.createDirectory(`${state.workspacePath}/patches`);
          await fileSystem.writeFile(`${state.workspacePath}/patches/patch-${timestamp}.txt`, aiOutput);
      }

      // 2. Safe Merge
      const result = safeMergeAIOutput(state.masterContent, aiOutput);

      if (result.success) {
          setState(prev => ({ ...prev, masterContent: result.newContent, statusMessage: 'AI Merge Successful. Saved backup.' }));
          // Trigger save
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
          setState(prev => ({ ...prev, workspacePath: dir }));
          // Load logic would go here
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
            <button className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded">
                Settings
            </button>
        </div>
      </div>

      {/* 3-Column Grid */}
      <div className="flex-1 grid grid-cols-12 min-h-0">
        <div className="col-span-4 h-full overflow-hidden">
            <EditorColumn 
                content={state.masterContent} 
                onChange={handleEditorChange} 
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
