import { ResumeSection } from '../types';

export const generatePrompt = (jd: string, sections: ResumeSection[]): string => {
  // Extract current LaTeX for context
  // User headers: Technical Skills, Experience, Projects
  const experienceSection = sections.find(s => s.title.toLowerCase().includes('experience'));
  const projectSection = sections.find(s => s.title.toLowerCase().includes('projects'));
  const skillSection = sections.find(s => s.title.toLowerCase().includes('skills'));

  const expLatex = experienceSection?.rawContent || "(No Experience Section Found)";
  const projLatex = projectSection?.rawContent || "(No Project Section Found)";
  const skillLatex = skillSection?.rawContent || "(No Skills Section Found)";

  return `
I need you to tailor my resume LaTeX code for the following Job Description (JD).

JOB DESCRIPTION:
${jd}

CURRENT RESUME SECTIONS (LaTeX):

--- BEGIN SKILLS ---
${skillLatex}
--- END SKILLS ---

--- BEGIN EXPERIENCE ---
${expLatex}
--- END EXPERIENCE ---

--- BEGIN PROJECTS ---
${projLatex}
--- END PROJECTS ---

INSTRUCTIONS:
1. Analyze the JD keywords.
2. Rewrite the bullet points in Experience and Projects to highlight relevance to the JD. 
3. Reorder skills or add relevant keywords from the JD *only if* they are synonymous with my existing skills.
4. **DO NOT** invent numbers, companies, or projects. Only rephrase.
5. **CRITICAL**: Return the content such that it can be directly replaced into the \\section block.
6. **STRICT OUTPUT FORMAT**: You must return exactly three blocks. Do not add explanations.

%%%BEGIN_SKILLS%%%
(Put the full modified Technical Skills section content here. Do NOT include the \\section{...} header, just the \\begin{itemize}...)
%%%END_SKILLS%%%

%%%BEGIN_EXPERIENCE%%%
(Put the full modified Experience section content here. Do NOT include the \\section{...} header, just the \\resumeSubHeadingListStart...)
%%%END_EXPERIENCE%%%

%%%BEGIN_PROJECTS%%%
(Put the full modified Projects section content here. Do NOT include the \\section{...} header, just the \\resumeSubHeadingListStart...)
%%%END_PROJECTS%%%
`;
};

export const safeMergeAIOutput = (originalMaster: string, aiOutput: string): { success: boolean; newContent: string; error?: string } => {
  
  // 1. Safety Check
  const blackList = [
    /\\documentclass/,
    /\\usepackage/,
    /\\begin\{document\}/,
    /\\end\{document\}/,
    /\\newcommand/,
    /\\renewcommand/,
    /\\input/,
    /\\include/,
    /\\includepdf/
  ];

  for (const regex of blackList) {
    if (regex.test(aiOutput)) {
      return { success: false, newContent: originalMaster, error: `Security Alert: AI output contains forbidden command matching ${regex}` };
    }
  }

  let mergedContent = originalMaster;

  // 2. Extract Blocks
  const blocks = [
    { name: 'SKILLS', regex: /%%%BEGIN_SKILLS%%%([\s\S]*?)%%%END_SKILLS%%%/ },
    { name: 'EXPERIENCE', regex: /%%%BEGIN_EXPERIENCE%%%([\s\S]*?)%%%END_EXPERIENCE%%%/ },
    { name: 'PROJECTS', regex: /%%%BEGIN_PROJECTS%%%([\s\S]*?)%%%END_PROJECTS%%%/ },
  ];

  blocks.forEach(block => {
    const match = aiOutput.match(block.regex);
    if (match && match[1]) {
      const newSectionContent = match[1].trim();
      
      // 3. Locate and Replace in Master
      // We look for the section header, then replace everything until the next section.
      
      let sectionTitleKeyword = "";
      if (block.name === 'SKILLS') sectionTitleKeyword = "Technical Skills"; // Matches user's tex
      else if (block.name === 'EXPERIENCE') sectionTitleKeyword = "Experience";
      else if (block.name === 'PROJECTS') sectionTitleKeyword = "Projects";

      // Regex to find \section{\textbf{Technical Skills}}
      const headerRegex = new RegExp(`\\\\section\\{\\\\textbf\\{${sectionTitleKeyword}\\}\\}`);
      const headerMatch = mergedContent.match(headerRegex);
      
      if (headerMatch && headerMatch.index !== undefined) {
          const headerEndIndex = headerMatch.index + headerMatch[0].length;
          
          // Find the end of this section (Next section or document end)
          const remaining = mergedContent.substring(headerEndIndex);
          const nextSectionMatch = remaining.match(/(\\section\{|\\end\{document\})/);
          
          if (nextSectionMatch && nextSectionMatch.index !== undefined) {
              const bodyEndIndex = headerEndIndex + nextSectionMatch.index;
              
              // Construct new content
              // We keep the header, insert new body, then the rest.
              mergedContent = 
                  mergedContent.substring(0, headerEndIndex) + 
                  "\n" + newSectionContent + "\n" + 
                  mergedContent.substring(bodyEndIndex);
          }
      }
    }
  });

  return { success: true, newContent: mergedContent };
};
