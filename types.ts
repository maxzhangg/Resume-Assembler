export interface FileSystemAPI {
  readFile: (path: string) => Promise<string>;
  readBuffer: (path: string) => Promise<string>; // Returns base64 string
  writeFile: (path: string, content: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  runCompileCommand: (cwd: string) => Promise<{ stdout: string; stderr: string; success: boolean }>;
  selectDirectory: () => Promise<string | null>;
  openExternal: (path: string) => Promise<void>;
  getCompilerEngine: () => Promise<'tectonic' | 'pdflatex' | 'none'>;
}

declare global {
  interface Window {
    electron?: FileSystemAPI;
  }
}

export interface ResumeItem {
  id: string;
  type: 'subheading' | 'project' | 'text';
  title: string; 
  content: string; 
  isChecked: boolean;
  startIndex: number; // Absolute index in master string
  endIndex: number;   // Absolute index in master string
}

export interface ResumeSection {
  id: string;
  title: string; 
  rawContent: string;
  startIndex: number;
  endIndex: number;
  items: ResumeItem[];
}

export interface AppState {
  workspacePath: string | null;
  masterContent: string; // The immutable template from disk
  workingContent: string; // The mutable editor content (in-memory)
  sections: ResumeSection[];
  jobDescription: string;
  isCompiling: boolean;
  compileLog: string;
  lastCompileSuccess: boolean;
  statusMessage: string;
  compilerEngine: 'tectonic' | 'pdflatex' | 'none' | 'checking';
}

// SIMPLIFIED TEMPLATE: Removed tcolorbox to ensure stability across different TeX environments
export const SAMPLE_MASTER_TEX: string = `%-------------------------
% Resume in Latex
% Author
% License : MIT
%------------------------

%---- Required Packages and Functions ----

\\documentclass[a4paper,11pt]{article}
\\usepackage{latexsym}
\\usepackage{xcolor}
\\usepackage{float}
\\usepackage{ragged2e}
\\usepackage[empty]{fullpage}
\\usepackage{wrapfig}
\\usepackage{lipsum}
\\usepackage{tabularx}
\\usepackage{titlesec}
\\usepackage{geometry}
\\usepackage{marvosym}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage{fontawesome5}
\\usepackage{multicol}
\\usepackage{graphicx}
\\usepackage[T1]{fontenc}
\\setlength{\\multicolsep}{0pt} 
\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\geometry{left=1.4cm, top=0.8cm, right=1.2cm, bottom=1cm}

\\urlstyle{same}

\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
% Replaced tcolorbox with standard clean titlesec formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-7pt}]

%-------------------------
% Custom commands
\\newcommand{\\resumeItem}[2]{
  \\item{
    \\textbf{#1}{\\hspace{0.5mm}#2 \\vspace{-0.5mm}}
  }
}

\\newcommand{\\resumePOR}[3]{
\\vspace{0.5mm}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
        \\textbf{#1}\\hspace{0.3mm}#2 & \\textit{\\small{#3}} 
    \\end{tabular*}
    \\vspace{-2mm}
}

\\newcommand{\\resumeSubheading}[4]{
\\vspace{0.5mm}\\item
    \\begin{tabular*}{0.98\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
        \\textbf{#1} & \\textit{\\footnotesize{#4}} \\\\
        \\textit{\\footnotesize{#3}} &  \\footnotesize{#2}\\\\
    \\end{tabular*}
    \\vspace{-2.4mm}
}

\\newcommand{\\resumeProject}[4]{
\\vspace{0.5mm}\\item
    \\begin{tabular*}{0.98\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
        \\textbf{#1} & \\textit{\\footnotesize{#3}} \\\\
        \\footnotesize{\\textit{#2}} & \\footnotesize{#4}
    \\end{tabular*}
    \\vspace{-2.4mm}
}

\\newcommand{\\resumeSubItem}[2]{\\resumeItem{#1}{#2}\\vspace{-4pt}}
\\renewcommand{\\labelitemi}{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=*,labelsep=0mm]}
\\newcommand{\\resumeHeadingSkillStart}{\\begin{itemize}[leftmargin=*,itemsep=1.7mm, rightmargin=2ex]}
\\newcommand{\\resumeItemListStart}{\\begin{justify}\\begin{itemize}[leftmargin=3ex, rightmargin=2ex, noitemsep,labelsep=1.2mm,itemsep=0mm]\\small}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}\\vspace{2mm}}
\\newcommand{\\resumeHeadingSkillEnd}{\\end{itemize}\\vspace{-2mm}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\end{justify}\\vspace{-2mm}}

% Alias cvsection to section for compatibility
\\newcommand{\\cvsection}[1]{\\section{#1}}

\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}%
\\newcolumntype{R}{>{\\raggedleft\\arraybackslash}X}%
\\newcolumntype{C}{>{\\centering\\arraybackslash}X}%
%---- End of Packages and Functions ------

%-------------------------------------------
%%%%%%  CV STARTS HERE  %%%%%%%%%%%
%%%%%% DEFINE ELEMENTS HERE %%%%%%%
\\newcommand{\\name}{Your Name} % Your Name
\\newcommand{\\course}{Computer Science} % Your Program
\\newcommand{\\phone}{123-456-7890} % Your Phone Number
\\newcommand{\\emaila}{email@example.com} %Email 1

\\begin{document}
\\fontfamily{cmr}\\selectfont
%----------HEADING-----------------

{
\\begin{tabularx}{\\linewidth}{L r} \\\\
  \\textbf{\\Large \\name} & \\href{mailto:\\emaila}{\\raisebox{0.0\\height}{\\footnotesize \\faEnvelope}\\ {Email}}\\\\
  {Location } &  \\href{https://github.com/}{\\raisebox{0.0\\height}{\\footnotesize \\faHome}\\ {Portfolio}}\\\\
  Degree & \\href{https://github.com/}{\\raisebox{0.0\\height}{\\footnotesize \\faGithub}\\ {GitHub}} \\\\  
  {University Name} & \\href{https://linkedin.com/}{\\raisebox{0.0\\height}{\\footnotesize \\faLinkedin}\\ {LinkedIn}}
\\end{tabularx}
}
\\vspace{-4mm}
%-----------Technical skills-----------------
\\section{Technical Skills}
\\begin{itemize}[leftmargin=0.05in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: Python, JavaScript, TypeScript, Java} \\\\  
     \\textbf{Web}{: React, Node.js, HTML, CSS} \\\\  
    }}
\\end{itemize}
\\vspace{-20pt}

%-----------EXPERIENCE-----------------
\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Software Engineer}{City}
      {Company Name}{Jan 2023 - Present}
      \\vspace{-2.0mm}
     \\resumeItemListStart
\\item Developed features using React and TypeScript.
\\item Optimized database queries reducing load time by 20\\%.
\\resumeItemListEnd
  \\resumeSubHeadingListEnd
\\vspace{-5.5mm}

%-----------PROJECTS-----------------
\\section{Projects}
\\vspace{-2mm}
\\resumeSubHeadingListStart
\\resumeProject
  {Project Name}
  {Description of the project.}
  {2023}
\\resumeItemListStart
\\item Built using Electron and React.
\\resumeItemListEnd
\\resumeSubHeadingListEnd
\\vspace{-6mm}

%-------------------------------------------
\\end{document}`;