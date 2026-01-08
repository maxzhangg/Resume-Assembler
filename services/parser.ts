import { ResumeItem, ResumeSection } from '../types';

/**
 * Parses the Master LaTeX file into sections and items.
 * Uses Regex strategies tailored to the prompt's specific LaTeX format.
 */
export const parseMasterTex = (content: string): ResumeSection[] => {
  const sections: ResumeSection[] = [];
  
  // 1. Split by \section command
  // Regex: matches \section{...} and captures the rest until the next \section
  const sectionSplitRegex = /(\\section\{.*?\})/g;
  
  // We need to keep the delimiters, so we use split and filter
  const parts = content.split(sectionSplitRegex);

  // The first part is usually the preamble (imports, etc)
  // For the purpose of the Assembler, we only care about "selectable" sections.
  // However, the Preamble is implicitly always "checked" in the final rebuild, 
  // but here we just want to extract structure for the UI.

  let currentSection: ResumeSection | null = null;

  parts.forEach((part) => {
    if (!part.trim()) return;

    if (part.startsWith('\\section')) {
      // New Section Start
      const titleMatch = part.match(/\\textbf\{(.*?)\}/);
      const title = titleMatch ? titleMatch[1] : 'Unknown Section';
      
      currentSection = {
        id: `sec-${Date.now()}-${Math.random()}`,
        title,
        rawContent: part, // NOTE: In a more complex parser, we'd store the header separately
        items: []
      };
      sections.push(currentSection);
    } else if (currentSection) {
      // This is the content body of the section
      currentSection.rawContent += part;
      
      // 2. Parse Items within the section body
      const parsedItems = parseItems(part, currentSection.id);
      currentSection.items = parsedItems;
    }
  });

  return sections;
};

const parseItems = (sectionContent: string, sectionId: string): ResumeItem[] => {
  const items: ResumeItem[] = [];
  
  // Strategy: Find anchors (\resumeSubheading, \resumeProject) 
  // and the subsequent \resumeItemListStart ... End
  
  // We will iterate through the string to find blocks
  // This is a simplified state-machine approach
  
  const blocks = sectionContent.split(/(\\(?:resumeSubheading|resumeProject|item))/g);
  
  // This split is a bit aggressive, we need to reconstruct usable blocks.
  // Better strategy: Use regex exec to find start indices
  
  const itemRegex = /(\\(?:resumeSubheading|resumeProject)(?:\{[^{}]*\}){2,4}[\s\S]*?(?:\\resumeItemListEnd|\\resumeSubHeadingListEnd))/g;
  
  let match;
  let remainingContent = sectionContent;

  while ((match = itemRegex.exec(sectionContent)) !== null) {
    const fullBlock = match[0];
    const isSubheading = fullBlock.startsWith('\\resumeSubheading');
    const isProject = fullBlock.startsWith('\\resumeProject');
    
    // Extract Title
    let title = "Item";
    if (isSubheading) {
        // \resumeSubheading{Role}{Location}{Company}{Dates}
        // Match 1st brace: Role, 3rd brace: Company
        const argMatch = fullBlock.match(/\\resumeSubheading\s*\{([^}]*)\}\s*\{[^}]*\}\s*\{([^}]*)\}/);
        if (argMatch) title = `${argMatch[1]} @ ${argMatch[2]}`;
    } else if (isProject) {
        // \resumeProject{Name}{Desc}{Dates}
        const argMatch = fullBlock.match(/\\resumeProject\s*\{([^}]*)\}/);
        if (argMatch) title = argMatch[1];
    }

    items.push({
      id: `${sectionId}-item-${items.length}`,
      type: isSubheading ? 'subheading' : 'project',
      title: title,
      content: fullBlock,
      isChecked: true
    });
  }

  // MVP: If no structured items found (like Skills), treat the whole thing as one item if it has content
  if (items.length === 0 && sectionContent.trim().length > 0) {
     // Check if it's just empty space or commands
     if (sectionContent.includes('\\item')) {
         items.push({
             id: `${sectionId}-text-block`,
             type: 'text',
             title: 'Content Block (Skills/Misc)',
             content: sectionContent,
             isChecked: true
         });
     }
  }

  return items;
};

/**
 * Reconstructs the LaTeX file based on checked items.
 */
export const assembleLatex = (masterContent: string, sections: ResumeSection[]): string => {
  // Strategy: We can't simply concatenate sections because we need to preserve the Preamble 
  // and Document structure (\begin{document} ... \end{document}).
  
  // Simplest robust approach for MVP:
  // 1. Identify where sections are in the master string.
  // 2. Replace the content of those sections with the "filtered" content.
  
  let newContent = masterContent;

  // We need to match the sections in the master content again to replace them safely.
  // However, since we parsed sections sequentially, we can try to locate them.
  
  sections.forEach(sec => {
    // Locate the section in the *current* version of newContent (it might have shifted if we edited previous parts? 
    // No, if we replace distinct blocks it should be fine, but replacing string by value is risky if duplicates exist).
    
    // Better Approach: Rebuild the `document` body entirely?
    // Risk: Losing content *between* sections that wasn't captured.
    
    // Hybrid Approach:
    // Generate the "Active Content" for this section
    let activeContent = "";
    
    // Re-add the section header (found in rawContent usually before items)
    // This is tricky. Let's look at rawContent again.
    // rawContent in our parser was: " \resumeSubHeadingListStart ... items ... \resumeSubHeadingListEnd"
    
    // If the section type is structured (Experience/Project), we rebuild the list
    const hasStructuredItems = sec.items.some(i => i.type !== 'text');
    
    if (hasStructuredItems) {
        // We assume the section wrapper is standard: 
        // \section{...} \resumeSubHeadingListStart [ITEMS] \resumeSubHeadingListEnd
        
        // Let's strip the original items from the rawContent and inject checked ones.
        // This is complex regex surgery.
        
        // ALTERNATIVE: Since we have the full text of items.
        // We construct the section body by concatenating Checked Items.
        // But we need the wrapper (\resumeSubHeadingListStart/End).
        
        const listStart = "\\resumeSubHeadingListStart";
        const listEnd = "\\resumeSubHeadingListEnd";
        
        const activeItems = sec.items.filter(i => i.isChecked).map(i => i.content).join('\n');
        
        // We need to replace the *body* of the section in the master file.
        // We find the section header
        const secHeaderRegex = new RegExp(`\\\\section\\{\\\\textbf\\{${escapeRegExp(sec.title)}\\}\\}`);
        
        // Find where this section starts
        const match = newContent.match(secHeaderRegex);
        if (match && match.index !== undefined) {
             // Find the next \section or \end{document} to delimit the end of this section
             const restOfString = newContent.substring(match.index + match[0].length);
             const nextDelimRegex = /(\\section\{|\\end\{document\})/;
             const nextMatch = restOfString.match(nextDelimRegex);
             
             if (nextMatch && nextMatch.index !== undefined) {
                 const originalBody = restOfString.substring(0, nextMatch.index);
                 
                 // Construct new body
                 // We preserve anything before the first list start if it exists? 
                 // For now, assume strict template: Section -> ListStart -> Items -> ListEnd
                 
                 const newBody = `\n  ${listStart}\n${activeItems}\n  ${listEnd}\n`;
                 
                 // Replace
                 newContent = newContent.replace(match[0] + originalBody, match[0] + newBody);
             }
        }
        
    } else {
        // Text block (Skills)
        // If unchecked, we might want to hide the whole section?
        // Current requirement: "modules". If Skills has 1 item and it's unchecked, remove section?
        
        const allUnchecked = sec.items.every(i => !i.isChecked);
        if (allUnchecked) {
             // Remove the section entirely
             const secHeaderRegex = new RegExp(`\\\\section\\{\\\\textbf\\{${escapeRegExp(sec.title)}\\}\\}[\\s\\S]*?(?=(\\\\section|\\\\end\\{document\\}))`);
             newContent = newContent.replace(secHeaderRegex, '');
        }
    }
  });

  return newContent;
};

function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}
