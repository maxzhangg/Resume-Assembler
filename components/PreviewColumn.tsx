import React from 'react';

interface Props {
  isCompiling: boolean;
  statusMessage: string;
  pdfUrl?: string | null;
}

const PreviewColumn: React.FC<Props> = ({ isCompiling, statusMessage, pdfUrl }) => {
  return (
    <div className="flex flex-col h-full bg-gray-200 border-r border-gray-300">
      <div className="p-3 bg-gray-50 border-b font-semibold text-gray-700">
        Preview
      </div>
      <div className="flex-1 flex flex-col items-center justify-center relative bg-gray-300 overflow-hidden">
        {isCompiling && (
          <div className="absolute inset-0 bg-white/80 z-20 flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-blue-600 font-semibold">Compiling LaTeX...</p>
          </div>
        )}

        {pdfUrl ? (
          <div className="w-full h-full flex flex-col">
              <embed 
                src={pdfUrl} 
                type="application/pdf" 
                className="w-full h-full" 
              />
          </div>
        ) : (
          <div className="text-center text-gray-500 p-8">
            <p className="mb-2 text-4xl">📄</p>
            <p>No PDF generated yet.</p>
            <p className="text-sm mt-2 max-w-xs mx-auto opacity-70">
                Click "Open Workspace" then "Compile PDF" to render your resume.
            </p>
          </div>
        )}
      </div>
      
      {/* Mini Console Log Area */}
      {statusMessage && (
        <div className="bg-gray-900 text-green-400 font-mono text-[10px] p-2 h-24 overflow-y-auto shrink-0 border-t border-gray-700">
            <div className="font-bold text-gray-500 mb-1 uppercase tracking-wider">System Log:</div>
            <pre className="whitespace-pre-wrap">{statusMessage}</pre>
        </div>
      )}
    </div>
  );
};

export default PreviewColumn;