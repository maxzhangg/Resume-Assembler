import { ResumeItem, ResumeSection } from '../types';

/**
 * Helper to find the matching closing brace index for a command starting at `startIndex`.
 * Assumes `content[startIndex]` is '{'.
 */
const findBalancedEnd = (content: string, startIndex: number): number => {
  let depth = 0;
  for (let i = startIndex; i < content.length; i++) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;

    if (depth === 0) return i + 1; // Return index after the closing brace
  }
  return -1; // Not found
};

/**
 * Parses the Master LaTeX file into sections and items using absolute indices.
 */
export const parseMasterTex = (content: string): ResumeSection[] => {
  const sections: ResumeSection[] = [];
  
  // We search for \section{ or \cvsection{
  const sectionCommandRegex = /\\(section|cvsection)\s*\{/g;
  
  let match;
  const sectionMatches: { start: number; end: number; title: string; fullMatch: string }[] = [];
  
  while ((match = sectionCommandRegex.exec(content)) !== null) {
      const commandStart = match.index;
      // match[0] ends at the opening brace of the title
      const braceStart = commandStart + match[0].length - 1; 
      
      const commandEnd = findBalancedEnd(content, braceStart);
      
      if (commandEnd !== -1) {
          const fullMatch = content.substring(commandStart, commandEnd);
          // Extract title text roughly (remove basic latex commands)
          // Inner text is between braceStart+1 and commandEnd-1
          const rawTitle = content.substring(braceStart + 1, commandEnd - 1);
          // Simple cleanup: remove \textbf{...}, \large, etc.
          const cleanTitle = rawTitle.replace(/\\[a-zA-Z]+\{?|\}/g, '').trim();

          sectionMatches.push({
              start: commandStart,
              end: commandEnd,
              title: cleanTitle || 'Untitled Section',
              fullMatch
          });
      }
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
  
  // Detect structure
  const hasSubheading = sectionBody.includes('\\resumeSubheading');
  const hasProject = sectionBody.includes('\\resumeProject');
  
  if (hasSubheading || hasProject) {
      // Structure: \resumeSubheading{...} OR \resumeProject{...}
      const itemStartRegex = /(\\resumeSubheading|\\resumeProject)\s*\{/g;
      
      let match;
      const itemStarts: { index: number; type: 'subheading' | 'project' }[] = [];
      
      while ((match = itemStartRegex.exec(sectionBody)) !== null) {
          itemStarts.push({
              index: match.index,
              type: match[1] === '\\resumeSubheading' ? 'subheading' : 'project'
          });
      }
      
      for (let i = 0; i < itemStarts.length; i++) {
          const start = itemStarts[i].index;
          
          // Determine End
          // The item ends where the next item starts
          // OR where the list ends (\resumeSubHeadingListEnd)
          // OR end of section
          
          let end = sectionBody.length;
          
          if (itemStarts[i+1]) {
              end = itemStarts[i+1].index;
          } else {
              // Last item, look for list terminator
              const listEndMatch = sectionBody.indexOf('\\resumeSubHeadingListEnd', start);
              if (listEndMatch !== -1) {
                  end = listEndMatch;
              }
          }
          
          const itemContent = sectionBody.substring(start, end);
          
          // Extract Title for UI
          let title = "Item";
          // We assume standard arguments: \cmd{arg1}{arg2}...
          // Just grab the first argument content
          const firstBrace = itemContent.indexOf('{');
          if (firstBrace !== -1) {
              const argEnd = findBalancedEnd(itemContent, firstBrace);
              if (argEnd !== -1) {
                  const rawArg = itemContent.substring(firstBrace + 1, argEnd - 1);
                  title = rawArg.replace(/\\[a-zA-Z]+\{?|\}/g, '').trim(); // Remove formatting
              }
          }
          
          items.push({
              id: `${sectionId}-item-${i}`,
              type: itemStarts[i].type,
              title: title || 'Untitled Item',
              content: itemContent,
              isChecked: true,
              startIndex: offset + start,
              endIndex: offset + end
          });
      }
      
  } else {
      // Fallback: simple \item parser for skills
      // We look for \item[...]{...} or \item{...} or just \item ...
      
      const itemStartRegex = /\\item\s*/g; 
      let match;
      const indices: number[] = [];
      while((match = itemStartRegex.exec(sectionBody)) !== null) {
          indices.push(match.index);
      }
      
      if (indices.length > 0) {
          for (let i = 0; i < indices.length; i++) {
              const start = indices[i];
              
              // End is start of next \item or \end{itemize}
              let end = indices[i+1] ? indices[i+1] : -1;
              if (end === -1) {
                  end = sectionBody.indexOf('\\end{itemize}', start);
                  if (end === -1) end = sectionBody.length;
              }
              
              const itemContent = sectionBody.substring(start, end);
              
              // Extract title from \textbf{...} if present
              const boldMatch = itemContent.match(/\\textbf\{([^}]+)\}/);
              const title = boldMatch ? boldMatch[1] : `Bullet Point ${i+1}`;

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
         // No items found? One big block
         if (sectionBody.trim().length > 5) {
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
      // Validate indices
      if (item.startIndex < 0 || item.endIndex > newContent.length) {
          console.warn(`[Assembler] Skipping invalid cut index for item ${item.title}`);
          return;
      }
      // Remove content
      newContent = newContent.slice(0, item.startIndex) + newContent.slice(item.endIndex);
  });
  
  return newContent;
};