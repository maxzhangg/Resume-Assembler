import { ResumeItem, ResumeSection } from '../types';

/**
 * Parses the Master LaTeX file into sections and items using absolute indices.
 */
export const parseMasterTex = (content: string): ResumeSection[] => {
  const sections: ResumeSection[] = [];
  
  // Regex to find \section{...}
  // The user's format: \section{\textbf{Title}}
  // We use [\s\S] to capture newlines if necessary, though section headers are usually one line.
  const sectionRegex = /\\section\{.*?\}/g;
  
  let match;
  let lastIndex = 0;
  
  // 1. First Pass: Identify Sections
  // We treat the text BEFORE the first section as Preamble (not a section).
  // The text between sections is the body of the previous section.
  
  const sectionMatches: { start: number; end: number; title: string; fullMatch: string }[] = [];
  
  while ((match = sectionRegex.exec(content)) !== null) {
      const fullMatch = match[0];
      // Extract title: \section{\textbf{Experience}} -> Experience
      const titleMatch = fullMatch.match(/\\textbf\{(.*?)\}/);
      const title = titleMatch ? titleMatch[1] : 'Unknown';
      
      sectionMatches.push({
          start: match.index,
          end: match.index + fullMatch.length,
          title,
          fullMatch
      });
  }
  
  // 2. Build Section Objects with Ranges
  for (let i = 0; i < sectionMatches.length; i++) {
      const current = sectionMatches[i];
      const next = sectionMatches[i + 1];
      
      const bodyStart = current.end;
      const bodyEnd = next ? next.start : content.lastIndexOf('\\end{document}');
      
      // If no \end{document}, go to end of string
      const finalEnd = bodyEnd === -1 ? content.length : bodyEnd;
      
      const rawContent = content.substring(current.start, finalEnd);
      const bodyContent = content.substring(bodyStart, finalEnd);
      
      const sectionId = `sec-${i}`;
      
      // 3. Parse Items within this range
      const items = parseItems(bodyContent, bodyStart, sectionId);
      
      sections.push({
          id: sectionId,
          title: current.title,
          rawContent,
          startIndex: current.start,
          endIndex: finalEnd,
          items
      });
  }
  
  return sections;
};

const parseItems = (sectionBody: string, offset: number, sectionId: string): ResumeItem[] => {
  const items: ResumeItem[] = [];
  
  // Patterns for Items:
  // 1. \resumeSubheading{...}{...}{...}{...} followed by optional \resumeItemListStart...End
  // 2. \resumeProject{...}{...}{...} followed by optional \resumeItemListStart...End
  // 3. \item inside a generic itemize (for Skills)
  
  // We scan the sectionBody for these patterns.
  
  // Helper to find balanced braces to determine end of arguments
  // This is complex in Regex. We will use a simpler approximation:
  // Assuming arguments don't contain nested braces for the most part, or are on single lines.
  // The User's file uses structured indentation, which helps.
  
  // Strategy: Find the START of a main item, and find the START of the NEXT main item.
  // Everything in between belongs to the first item.
  
  // Detect what kind of items are in this section.
  const hasSubheading = sectionBody.includes('\\resumeSubheading');
  const hasProject = sectionBody.includes('\\resumeProject');
  
  if (hasSubheading || hasProject) {
      // It's a structured section (Experience / Projects)
      // Regex for the START of an item
      const itemStartRegex = /(\\resumeSubheading|\\resumeProject)/g;
      
      let match;
      const itemStarts: { index: number; type: 'subheading' | 'project' }[] = [];
      
      while ((match = itemStartRegex.exec(sectionBody)) !== null) {
          itemStarts.push({
              index: match.index,
              type: match[0] === '\\resumeSubheading' ? 'subheading' : 'project'
          });
      }
      
      for (let i = 0; i < itemStarts.length; i++) {
          const start = itemStarts[i].index;
          // The end is the start of the next item, OR the end of the list environment.
          // In the user's file, items are inside \resumeSubHeadingListStart ... \resumeSubHeadingListEnd
          // We can just assume the item goes until the next item start or the end of the string (section body).
          // Refinement: If there is a \resumeSubHeadingListEnd, that's a hard stop.
          
          let end = itemStarts[i+1] ? itemStarts[i+1].index : sectionBody.length;
          
          // Check if there is a list ending between this start and the theoretical end
          // If so, the item ends before that list ending.
          // Actually, usually the list end comes after the last item.
          // So for the last item, we should search for \resumeSubHeadingListEnd
          
          if (!itemStarts[i+1]) {
             const listEndMatch = sectionBody.indexOf('\\resumeSubHeadingListEnd', start);
             if (listEndMatch !== -1) {
                 end = listEndMatch;
             }
          }
          
          const itemContent = sectionBody.substring(start, end);
          const absoluteStart = offset + start;
          const absoluteEnd = offset + end;
          
          // Extract Title
          let title = "Item";
          // We can just regex the first line or first few braces
          if (itemStarts[i].type === 'subheading') {
              // \resumeSubheading{Role}{...}{Company}{...}
              // Note: Regex might be multi-line
              const argsMatch = itemContent.match(/\\resumeSubheading\s*\{([^}]*)\}\s*\{[^}]*\}\s*\{([^}]*)\}/);
              if (argsMatch) {
                  title = `${argsMatch[1]} @ ${argsMatch[3]}`;
              }
          } else {
              // \resumeProject{Name}{Desc}{Date}
              const argsMatch = itemContent.match(/\\resumeProject\s*\{([^}]*)\}/);
              if (argsMatch) {
                  title = argsMatch[1];
              }
          }
          
          items.push({
              id: `${sectionId}-item-${i}`,
              type: itemStarts[i].type,
              title: title.replace(/\\textbf\{|\}/g, ''), // Clean up latex formatting in title
              content: itemContent, // Used for debug/display if needed, but we use indices for assembly
              isChecked: true,
              startIndex: absoluteStart,
              endIndex: absoluteEnd
          });
      }
      
  } else {
      // Fallback for Skills (generic itemize) or Text
      // Look for \item inside \begin{itemize} ... \end{itemize}
      // The parser needs to be careful not to pick up \item inside sub-lists if we want block granularity.
      
      // For MVP as requested: "Skills: Ordinary itemize (MVP treat entire section as one module)"
      // But let's try to support granular if possible.
      // Skills usually: \item{ \textbf{Lang}: ... }
      
      const itemStartRegex = /\\item\{/g; 
      let match;
      const indices: number[] = [];
      while((match = itemStartRegex.exec(sectionBody)) !== null) {
          indices.push(match.index);
      }
      
      if (indices.length > 0) {
          for (let i = 0; i < indices.length; i++) {
              const start = indices[i];
              let end = indices[i+1] ? indices[i+1] : sectionBody.lastIndexOf('\\end{itemize}');
              if (end === -1) end = sectionBody.length;
              
              const itemContent = sectionBody.substring(start, end);
              
               // Extract "Languages" or "Technologies" from \textbf{...}
              const titleMatch = itemContent.match(/\\textbf\{([^}]*)\}/);
              const title = titleMatch ? titleMatch[1] : `Skill Group ${i+1}`;

              items.push({
                  id: `${sectionId}-skill-${i}`,
                  type: 'text',
                  title: title,
                  content: itemContent,
                  isChecked: true,
                  startIndex: offset + start,
                  endIndex: offset + end
              });
          }
      } else {
         // No items found? Just 1 big block?
         if (sectionBody.trim().length > 10) {
             items.push({
                 id: `${sectionId}-full-block`,
                 type: 'text',
                 title: 'Full Section Content',
                 content: sectionBody,
                 isChecked: true,
                 startIndex: offset,
                 endIndex: offset + sectionBody.length
             });
         }
      }
  }

  return items;
};

/**
 * Reconstructs the LaTeX file by removing unchecked items.
 * Uses the index-based slicing strategy.
 */
export const assembleLatex = (masterContent: string, sections: ResumeSection[]): string => {
  // Collect all unchecked items across all sections
  const uncheckedItems: ResumeItem[] = [];
  sections.forEach(sec => {
      sec.items.forEach(item => {
          if (!item.isChecked) {
              uncheckedItems.push(item);
          }
      });
  });
  
  // Sort by start index descending so we can cut from end to start without affecting indices
  uncheckedItems.sort((a, b) => b.startIndex - a.startIndex);
  
  let newContent = masterContent;
  
  uncheckedItems.forEach(item => {
      // Remove content
      newContent = newContent.slice(0, item.startIndex) + newContent.slice(item.endIndex);
      
      // Optional: Clean up empty lines left behind? 
      // The item slice usually includes the commands, but might leave \vspace or surrounding glue.
      // For now, raw deletion is safest to avoid syntax errors.
  });
  
  return newContent;
};
