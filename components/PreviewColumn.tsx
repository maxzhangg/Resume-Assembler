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
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {isCompiling && (
          <div className="absolute inset-0 bg-white/80 z-10 flex flex-col items-center justify-center">
             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
             <p className="text-blue-600 font-semibold">Compiling LaTeX...</p>
          </div>
        )}

        {pdfUrl ? (
          <div className="w-full h-full bg-white shadow-lg flex flex-col items-center justify-center">
              {/* In a real web app, we might use <iframe src={pdfUrl} /> or PDF.js */}
              {/* For this mock/demo, we simulate a PDF viewer */}
              <div className="text-center p-8">
                  <div className="text-6xl text-red-500 mb-4">PDF</div>
                  <h3 className="text-xl font-bold text-gray-800">output.pdf</h3>
                  <p className="text-gray-500 mt-2">Generated Successfully</p>
                  <p className="text-xs text-gray-400 mt-8">
                      (In the real Desktop App, this would be an embedded PDF.js viewer <br/>
                      or an iframe pointing to the local file blob)
                  </p>
                  <button onClick={() => alert("Opening system PDF viewer...")} className="mt-6 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700">
                      Open in External Viewer
                  </button>
              </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p className="mb-2 text-4xl">📄</p>
            <p>No PDF generated yet.</p>
            <p className="text-sm mt-2">{statusMessage}</p>
          </div>
        )}
      </div>
      <div className="bg-gray-800 text-green-400 font-mono text-xs p-2 h-32 overflow-y-auto">
        <div className="font-bold text-gray-500 mb-1">BUILD LOG:</div>
        <pre className="whitespace-pre-wrap">{statusMessage}</pre>
      </div>
    </div>
  );
};

export default PreviewColumn;
