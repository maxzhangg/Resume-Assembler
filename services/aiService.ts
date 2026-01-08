import { ResumeSection } from '../types';

export const generatePrompt = (jd: string, sections: ResumeSection[]): string => {
  // Extract current LaTeX for context
  const experienceSection = sections.find(s => s.title.toLowerCase().includes('experience'));
  const projectSection = sections.find(s => s.title.toLowerCase().includes('project'));
  const skillSection = sections.find(s => s.title.toLowerCase().includes('skill'));

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
3. Reorder skills or add relevant keywords from the JD *only if* they are synonymous with my existing skills (e.g. if I have "React", adding "React.js" is okay, but do not add "Java" if I don't have it).
4. **DO NOT** invent numbers, companies, or projects. Only rephrase.
5. **STRICT OUTPUT FORMAT**: You must return exactly three blocks. Do not add explanations.

%%%BEGIN_SKILLS%%%
(Put the full modified Skills \\section content here or just the itemize block)
%%%END_SKILLS%%%

%%%BEGIN_EXPERIENCE%%%
(Put the full modified Experience \\section content here)
%%%END_EXPERIENCE%%%

%%%BEGIN_PROJECTS%%%
(Put the full modified Projects \\section content here)
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
      // This requires the master to have standard section headers like \section{\textbf{Experience}}
      // We will replace everything from the header down to the next section start.
      
      let sectionName = "";
      if (block.name === 'SKILLS') sectionName = "Skills";
      else if (block.name === 'EXPERIENCE') sectionName = "Experience";
      else if (block.name === 'PROJECTS') sectionName = "Projects";

      const sectionStartRegex = new RegExp(`(\\\\section\\{\\\\textbf\\{${sectionName}\\}\\})`);
      const splitBySection = mergedContent.split(sectionStartRegex);
      
      if (splitBySection.length >= 3) {
          // splitBySection[0] = before header
          // splitBySection[1] = header
          // splitBySection[2] = body + rest of doc
          
          const rest = splitBySection[2];
          const nextSectionRegex = /(\\section\{|\\end\{document\})/;
          const nextMatch = rest.match(nextSectionRegex);
          
          if (nextMatch && nextMatch.index !== undefined) {
              const contentToReplace = rest.substring(0, nextMatch.index);
              const afterContent = rest.substring(nextMatch.index);
              
              // Only replace if the AI returned content looks like it contains items or lists
              if (newSectionContent.includes('\\item')) {
                   // Verify if AI included the \section header in the block. Ideally prompt asks for content.
                   // If AI included \section{}, strip it.
                   let cleanNewContent = newSectionContent;
                   if (cleanNewContent.startsWith('\\section')) {
                       // remove the first line
                       cleanNewContent = cleanNewContent.replace(/^\\section\{.*?\}/, '');
                   }
                   
                   mergedContent = splitBySection[0] + splitBySection[1] + "\n" + cleanNewContent + "\n" + afterContent;
              }
          }
      }
    }
  });

  return { success: true, newContent: mergedContent };
};
