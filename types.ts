export interface FileSystemAPI {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createDirectory: (path: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
  runCompileCommand: (cwd: string) => Promise<{ stdout: string; stderr: string; success: boolean }>;
  selectDirectory: () => Promise<string | null>;
  openExternal: (path: string) => Promise<void>;
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
  masterContent: string;
  sections: ResumeSection[];
  jobDescription: string;
  isCompiling: boolean;
  compileLog: string;
  lastCompileSuccess: boolean;
  statusMessage: string;
}

export const SAMPLE_MASTER_TEX: string = `%-------------------------
% Resume in Latex
% Author
% License : MIT
%------------------------

%---- Required Packages and Functions ----

\\documentclass[a4paper,11pt]{article}
\\usepackage{latexsym}
\\usepackage{pdfpages}
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
\\usepackage{cfr-lm}
\\usepackage[T1]{fontenc}
\\setlength{\\multicolsep}{0pt} 
\\pagestyle{fancy}
\\fancyhf{} % clear all header and footer fields
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}
\\geometry{left=1.4cm, top=0.8cm, right=1.2cm, bottom=1cm}
% Adjust margins
%\\addtolength{\\oddsidemargin}{-0.5in}
%\\addtolength{\\evensidemargin}{-0.5in}
%\\addtolength{\\textwidth}{1in}
\\usepackage[most]{tcolorbox}
\\tcbset{
	frame code={}
	center title,
	left=0pt,
	right=0pt,
	top=0pt,
	bottom=0pt,
	colback=gray!20,
	colframe=white,
	width=\\dimexpr\\textwidth\\relax,
	enlarge left by=-2mm,
	boxsep=4pt,
	arc=0pt,outer arc=0pt,
}

\\urlstyle{same}

\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
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
% \\renewcommand{\\labelitemii}{$\\circ$}
\\renewcommand{\\labelitemi}{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=*,labelsep=0mm]}
\\newcommand{\\resumeHeadingSkillStart}{\\begin{itemize}[leftmargin=*,itemsep=1.7mm, rightmargin=2ex]}
\\newcommand{\\resumeItemListStart}{\\begin{justify}\\begin{itemize}[leftmargin=3ex, rightmargin=2ex, noitemsep,labelsep=1.2mm,itemsep=0mm]\\small}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}\\vspace{2mm}}
\\newcommand{\\resumeHeadingSkillEnd}{\\end{itemize}\\vspace{-2mm}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\end{justify}\\vspace{-2mm}}
\\newcommand{\\cvsection}[1]{%
\\vspace{2mm}
\\begin{tcolorbox}
    \\textbf{\\large #1}
\\end{tcolorbox}
    \\vspace{-4mm}
}
\\newcolumntype{L}{>{\\raggedright\\arraybackslash}X}%
\\newcolumntype{R}{>{\\raggedleft\\arraybackslash}X}%
\\newcolumntype{C}{>{\\centering\\arraybackslash}X}%
%---- End of Packages and Functions ------

%-------------------------------------------
%%%%%%  CV STARTS HERE  %%%%%%%%%%%
%%%%%% DEFINE ELEMENTS HERE %%%%%%%
\\newcommand{\\name}{Max Zhang} % Your Name
\\newcommand{\\course}{Computer Science and Engineering} % Your Program
%\\newcommand{\\roll}{xxxxxxx} % Your Roll No.
\\newcommand{\\phone}{3433681577} % Your Phone Number
\\newcommand{\\emaila}{maxzhangggg@gmail.com} %Email 1

\\begin{document}
\\fontfamily{cmr}\\selectfont
%----------HEADING-----------------

{
\\begin{tabularx}{\\linewidth}{L r} \\\\
  \\textbf{\\Large \\name} & \\href{mailto:\\emaila}{\\raisebox{0.0\\height}{\\footnotesize \\faEnvelope}\\ {Email}}\\\\
  {(She/Her) } &  \\href{https://maxzhangg.github.io/portfolio/\\#/resume}{\\raisebox{0.0\\height}{\\footnotesize \\faHome}\\ {Portfolio}}\\\\
  Master of Engineering & \\href{https://github.com/maxzhangg}{\\raisebox{0.0\\height}{\\footnotesize \\faGithub}\\ {GitHub}} \\\\  
  {University of Ottawa Ottawa, ON} & \\href{https://www.linkedin.com/in/maxzhang0/}{\\raisebox{0.0\\height}{\\footnotesize \\faLinkedin}\\ {LinkedIn}}
\\end{tabularx}
}
\\vspace{-4mm}
%-----------Technical skills-----------------
\\section{\\textbf{Technical Skills}}
\\begin{itemize}[leftmargin=0.05in, label={}]
    \\small{\\item{
     \\textbf{Data \\& Analytics}{: SQL, Python (Pandas, NumPy, Matplotlib), Excel} \\\\  
     \\textbf{Programming \\& Scripting}{: Python, Java, TCL, JavaScript, Bash, Linux, Git} \\\\  
     \\textbf{Machine Learning}{: Scikit-learn, XGBoost, Keras (model evaluation and experimentation)} \\\\  
     \\textbf{Web \\& Visualization}{: React, HTML, Tailwind CSS, JSON} \\\\  
     \\textbf{Networking \\& Systems}{: Ethernet, Optical Networks, TCP/IP, Linux-based systems} \\\\  
     \\textbf{Testing \\& Automation}{: Pytest, Selenium, Appium, JUnit} \\\\  
     \\textbf{Tools}{: JIRA, GitHub, Agile/Scrum} \\\\  
     \\textbf{Languages}{: English (fluent, professional working proficiency)} \\\\  
    }}
\\end{itemize}


 \\vspace{-20pt}

%-----------EDUCATION-----------
\\section{\\textbf{Education}}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Master of Engineering in Electrical and Computer Engineering}{GPA:9.22/10}
      {University of Ottawa}{2023-2025}
    \\resumeSubheading
      {Bachelor of Engineering in Electrical Engineering and Automation}{GPA:87.2/100}
      {Northeast Electric Power University}{2019-2023}
  \\resumeSubHeadingListEnd
\\vspace{-5.5mm}
%


%-----------EXPERIENCE-----------------
\\section{\\textbf{Experience}}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Service Router Test Platform Dev Student}{Ottawa}
      {Nokia}{Apr 2024 - Dec 2024}
      \\vspace{-2.0mm}
     \\resumeItemListStart
\\item Analyzed large-scale regression and validation datasets in a \\textbf{Linux-based environment}, identifying failure patterns and stability risks across hardware and software versions.
\\item Executed \\textbf{1,078+ structured test runs} on QSFP28 (4x25G / 100G PSM4) optical transceivers; summarized pass/fail metrics and trend insights to support release decisions.
\\item Designed and validated test scenarios for optical modules and Media Dependent Adapters, improving feature-level verification coverage.
\\item Investigated and reported \\textbf{7 critical embedded software defects}, collaborating with developers to validate \\textbf{8 fixes across 3 software images}.
\\item Optimized internal test scripts (GASH/TCL) to reduce repetitive execution effort and improve data reliability for downstream analysis.
\\resumeItemListEnd

    
  %  \\vspace{-3.0mm}
\\vspace{-4mm}





%-----------PROJECTS-----------------
\\section{\\textbf{Projects}}
\\vspace{-2mm}
\\resumeSubHeadingListStart
\\resumeProject
  {Relationship K-Line (AI-Powered Astrology Visualization Tool)}
  {Built a dual-language BaZi + Gen-AI web app to quantify and visualize romantic compatibility over a 10--20 year period.}
  {2025.01}

\\resumeItemListStart
\\item Developed a client-side-only web app with \\textbf{React 19}, \\textbf{TypeScript}, \\textbf{Vite}, and \\textbf{Tailwind CSS}; deployed to \\textbf{GitHub Pages}.
\\item Implemented \\textbf{dual-language localization} (English/Simplified Chinese) with automatic browser language detection using \\textbf{Context API}.
\\item Calculated \\textbf{True Solar Time} using longitude/latitude and performed high-precision BaZi conversions (JieQi, GanZhi) via \\textbf{lunar-javascript} for accurate Hour Pillar computation.
\\item Integrated \\textbf{Google Gemini} (via \\textbf{@google/genai}) to generate structured year-by-year reasoning, highlighting relationship ``Golden Years'' and ``Risk Years'' based on metaphysics interactions.
\\item Built interactive visual analytics with \\textbf{Recharts}, including custom \\textbf{Candlestick (Love K-Line)} charts, \\textbf{dual life-line} comparisons, and \\textbf{radar charts} for multi-dimensional compatibility scoring.
\\resumeItemListEnd
  \\vspace{-1mm}

    \\resumeProject
  {Style Max - Fashion Recommendation Platform} % Project Name
  {Prototyped a fashion assistant using React and DeepSeek API, featuring multi-page UI and chatbot integration.} % Project Description
  {2025.05 -- 2025.07} % Event Dates

  \\resumeItemListStart
    \\item Developed a multi-page \\textbf{React} front-end with \\textbf{Tailwind CSS}for routes like Home, Chat, Wardrobe, and Uniqlo assistant.
    \\item Integrated \\textbf{DeepSeek API} for AI chat; enabled GitHub Pages deployment via \\textbf{HashRouter} and multi-entry \\textbf{Vite} builds.
  \\resumeItemListEnd
  \\vspace{-1mm}
\\resumeProject
    {Automated Test Generation with Gen-AI under Pytest} % Project Name
  {Generated Pytest test cases for Python programs using gen-ai.} % Project Description
  {2025.04} % Event Dates

  \\resumeItemListStart
    \\item This project provides a full suite of \\textbf{Pytest} test cases for the classic sorting algorithms.
    \\item The tests were automatically generated and evaluated by human to ensure correctness, structural coverage, and robustness.
  \\resumeItemListEnd
    \\vspace{-1mm}
    \\resumeProject
      {MCU-Based Solar Street Light Controller Design} %Project Name
      { Developed a solar-powered \\textbf{LED street lighting system} based on \\textbf{ATmega8 MCU}} %Project Name, Location Name
      {2023.03 - 2023.06} %Event Dates

      \\resumeItemListStart
    \\item Designed \\textbf{DC-DC circuit} using \\textbf{pulse width modulation} for optimized charging.
    \\item Implemented protection features such as \\textbf{short circuit, overload, and automatic recovery mechanisms}.
    \\resumeItemListEnd
    \\vspace{0mm}

   
}
    \\resumeItemListEnd
      
  \\resumeSubHeadingListEnd
\\vspace{-6mm}

%-----------Additional Information-----------------
%\\section{\\textbf{Additional Information}}
%\\begin{itemize}[leftmargin=0.05in, label={}]
 %   \\small{\\item{
  %   Full G driver's license. Valid PGWP.
   % }}
%\\end{itemize}
 %\\vspace{-16pt}

\\includepdf[pages=1]{transcript_maxzhang.pdf}
%\\includepdf[pages=1]{transcript_neepu.pdf}

%-------------------------------------------
\\end{document}`;