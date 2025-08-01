/**
 * Code formatter utilities
 */

interface FormatOptions {
  parser: 'typescript' | 'babel';
  tabWidth?: number;
  semi?: boolean;
  singleQuote?: boolean;
  trailingComma?: 'all' | 'es5' | 'none';
}

/**
 * Mock prettier implementation for code formatting
 * In a real implementation, this would use the actual prettier library
 */
export const prettier = {
  async format(code: string, options: FormatOptions): Promise<string> {
    // Basic formatting implementation
    // In production, you would use the actual prettier library
    return formatCode(code, options);
  }
};

function formatCode(code: string, options: FormatOptions): string {
  const tabWidth = options.tabWidth || 2;
  const spaces = ' '.repeat(tabWidth);
  let formatted = code;
  let indentLevel = 0;

  // Split into lines and process each line
  const lines = formatted.split('\n');
  const formattedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    if (!line) {
      formattedLines.push('');
      continue;
    }

    // Handle closing braces/brackets
    if (line.startsWith('}') || line.startsWith(']') || line.startsWith(')')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }

    // Add indentation
    const indentedLine = spaces.repeat(indentLevel) + line;
    formattedLines.push(indentedLine);

    // Handle opening braces/brackets
    if (line.endsWith('{') || line.endsWith('[') || line.endsWith('(')) {
      indentLevel++;
    }

    // Handle JSX self-closing tags and opening tags
    if (line.includes('<') && !line.includes('</') && !line.endsWith('/>')) {
      if (line.includes('>')) {
        // Opening tag that closes on same line, check if it's self-closing
        if (!line.endsWith('/>')) {
          indentLevel++;
        }
      }
    }

    // Handle JSX closing tags
    if (line.includes('</')) {
      indentLevel = Math.max(0, indentLevel - 1);
    }
  }

  return formattedLines.join('\n');
}

/**
 * Format JSX elements
 */
export function formatJSX(jsx: string): string {
  // Basic JSX formatting
  return jsx
    .replace(/>\s*</g, '>\n<') // Add newlines between tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Format import statements
 */
export function formatImports(imports: string[]): string {
  return imports
    .sort((a, b) => {
      // React imports first
      if (a.includes('react') && !b.includes('react')) return -1;
      if (!a.includes('react') && b.includes('react')) return 1;
      
      // Third-party imports
      if (!a.startsWith('./') && !a.startsWith('../') && 
          (b.startsWith('./') || b.startsWith('../'))) return -1;
      if ((a.startsWith('./') || a.startsWith('../')) && 
          !b.startsWith('./') && !b.startsWith('../')) return 1;
      
      // Alphabetical
      return a.localeCompare(b);
    })
    .join('\n');
}

/**
 * Format TypeScript interfaces
 */
export function formatInterface(name: string, props: Record<string, string>): string {
  const lines = [`interface ${name} {`];
  
  Object.entries(props).forEach(([key, type]) => {
    lines.push(`  ${key}: ${type};`);
  });
  
  lines.push('}');
  
  return lines.join('\n');
}

/**
 * Format component props object
 */
export function formatProps(props: Record<string, any>): string {
  const entries = Object.entries(props);
  
  if (entries.length === 0) return '';
  if (entries.length === 1) {
    const [key, value] = entries[0];
    return ` ${key}={${JSON.stringify(value)}}`;
  }

  const formattedProps = entries.map(([key, value]) => {
    if (typeof value === 'string') {
      return `  ${key}="${value}"`;
    } else {
      return `  ${key}={${JSON.stringify(value)}}`;
    }
  });

  return '\n' + formattedProps.join('\n') + '\n';
}