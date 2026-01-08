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
  title: string; // The extracted role or project name
  content: string; // The full LaTeX block
  isChecked: boolean;
}

export interface ResumeSection {
  id: string;
  title: string; // e.g., "Experience"
  rawContent: string; // The full content including header
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

export const SAMPLE_MASTER_TEX = `\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}

\\pagestyle{fancy}
\\fancyhf{} 
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}

\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Sections formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

% Custom commands
\\newcommand{\\resumeItem}[2]{
  \\item\\small{
    \\textbf{#1}{: #2 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-5pt}
}

\\newcommand{\\resumeProject}[3]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
    \\end{tabular*}
    \\textit{\\small #3} \\vspace{-5pt}
}


\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=*,label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
%%%%%%%%%%%%%%%%%%%%%%%%%%%%  CV STARTS HERE  %%%%%%%%%%%%%%%%%%%%%%%%%%%%

\\begin{document}

%----------HEADING-----------------
\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}r}
  \\textbf{\\href{http://sourabhbajaj.com/}{\\Large Jane Doe}} & Email : jane@doe.com\\\\
  \\href{http://sourabhbajaj.com/}{http://www.janedoe.com} & Mobile : +1-123-456-7890 \\\\
\\end{tabular*}

%-----------EDUCATION-----------------
\\section{\\textbf{Education}}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Georgia Institute of Technology}{Atlanta, GA}
      {Master of Science in Computer Science}{Aug. 2012 -- Dec. 2013}
    \\resumeSubheading
      {Birla Institute of Technology and Science}{Pilani, India}
      {Bachelor of Engineering in Electrical and Electronics}{Aug. 2008 -- July 2012}
  \\resumeSubHeadingListEnd

%-----------EXPERIENCE-----------------
\\section{\\textbf{Experience}}
  \\resumeSubHeadingListStart

    \\resumeSubheading
      {Senior Software Engineer}{San Jose, CA}
      {Google}{Oct 2016 - Present}
      \\resumeItemListStart
        \\item{Designed the distributed system for global search.}
        \\item{Optimized latency by 30\\% using Rust.}
      \\resumeItemListEnd

    \\resumeSubheading
      {Software Engineer}{Seattle, WA}
      {Amazon}{Jan 2014 - Oct 2016}
      \\resumeItemListStart
        \\item{Built the checkout page front-end using React.}
        \\item{Migrated legacy monolithic services to microservices.}
      \\resumeItemListEnd

  \\resumeSubHeadingListEnd

%-----------PROJECTS-----------------
\\section{\\textbf{Projects}}
  \\resumeSubHeadingListStart
    \\resumeProject
      {Resume Assembler}{React, Electron, LaTeX}{2023}
      \\resumeItemListStart
        \\item{A tool to modularize LaTeX resumes.}
        \\item{Integrated with local compilation chain.}
      \\resumeItemListEnd

    \\resumeProject
      {Autonomous Drone}{Python, C++, OpenCV}{2022}
      \\resumeItemListStart
         \\item{Developed computer vision algorithms for obstacle avoidance.}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

%-----------SKILLS-----------------
\\section{\\textbf{Skills}}
  \\resumeSubHeadingListStart
    \\item{
      \\textbf{Languages}{: Scala, Python, Javascript, C++, SQL, Java}
      \\hfill
      \\textbf{Technologies}{: AWS, Play, React, Kafka, GCE}
    }
  \\resumeSubHeadingListEnd

\\end{document}
`;
