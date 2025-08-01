/**
 * Code Validator
 * 
 * Validates generated React + TypeScript + Ant Design code for quality and correctness
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ValidationOptions {
  strict: boolean;
  checkImports: boolean;
  checkProps: boolean;
  checkAccessibility: boolean;
  checkPerformance: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  score: number; // 0-100
}

export interface ValidationError {
  type: 'syntax' | 'import' | 'prop' | 'accessibility' | 'antd-usage';
  message: string;
  line?: number;
  column?: number;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  type: 'performance' | 'best-practice' | 'style';
  message: string;
  line?: number;
  suggestion?: string;
}

export interface ValidationSuggestion {
  type: 'improvement' | 'alternative' | 'optimization';
  message: string;
  example?: string;
}

export class CodeValidator {
  private antdComponents: Set<string> = new Set();
  private validationRules: ValidationRule[] = [];

  constructor() {
    this.initializeValidationRules();
    this.loadAntdComponents();
  }

  /**
   * Validate generated code
   */
  async validate(code: string, options: Partial<ValidationOptions> = {}): Promise<ValidationResult> {
    const config: ValidationOptions = {
      strict: true,
      checkImports: true,
      checkProps: true,
      checkAccessibility: true,
      checkPerformance: true,
      ...options,
    };

    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      suggestions: [],
      score: 0,
    };

    try {
      // Parse the code
      const parsedCode = this.parseCode(code);

      // Run validation rules
      for (const rule of this.validationRules) {
        if (this.shouldApplyRule(rule, config)) {
          const ruleResult = await rule.validate(parsedCode, config);
          
          result.errors.push(...ruleResult.errors);
          result.warnings.push(...ruleResult.warnings);
          result.suggestions.push(...ruleResult.suggestions);
        }
      }

      // Calculate overall score
      result.score = this.calculateScore(result);
      result.isValid = result.errors.filter(e => e.severity === 'error').length === 0;

    } catch (error) {
      result.errors.push({
        type: 'syntax',
        message: `Failed to parse code: ${error instanceof Error ? error.message : String(error)}`,
        severity: 'error',
      });
      result.isValid = false;
      result.score = 0;
    }

    return result;
  }

  /**
   * Parse code and extract information
   */
  private parseCode(code: string): ParsedCode {
    const lines = code.split('\n');
    
    return {
      raw: code,
      lines,
      imports: this.extractImports(code),
      components: this.extractComponents(code),
      jsx: this.extractJSX(code),
      props: this.extractProps(code),
      styles: this.extractStyles(code),
    };
  }

  /**
   * Extract import statements
   */
  private extractImports(code: string): ImportInfo[] {
    const imports: ImportInfo[] = [];
    const importRegex = /import\s+(?:{([^}]+)}|\*\s+as\s+(\w+)|(\w+))\s+from\s+['"]([^'"]+)['"]/g;
    
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      const [, namedImports, namespaceImport, defaultImport, source] = match;
      
      imports.push({
        source,
        defaultImport,
        namedImports: namedImports ? namedImports.split(',').map(s => s.trim()) : [],
        namespaceImport,
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return imports;
  }

  /**
   * Extract React components
   */
  private extractComponents(code: string): ComponentInfo[] {
    const components: ComponentInfo[] = [];
    
    // Extract function components
    const funcComponentRegex = /const\s+(\w+).*?=\s*\([^)]*\)\s*=>\s*{/g;
    let match;
    
    while ((match = funcComponentRegex.exec(code)) !== null) {
      components.push({
        name: match[1],
        type: 'function',
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return components;
  }

  /**
   * Extract JSX elements
   */
  private extractJSX(code: string): JSXInfo[] {
    const jsx: JSXInfo[] = [];
    const jsxRegex = /<(\w+)(?:\s+[^>]*)?(?:\s*\/>|>[\s\S]*?<\/\1>)/g;
    
    let match;
    while ((match = jsxRegex.exec(code)) !== null) {
      jsx.push({
        tagName: match[1],
        fullMatch: match[0],
        line: code.substring(0, match.index).split('\n').length,
        isAntdComponent: this.antdComponents.has(match[1]),
      });
    }

    return jsx;
  }

  /**
   * Extract props usage
   */
  private extractProps(code: string): PropInfo[] {
    const props: PropInfo[] = [];
    const propRegex = /(\w+)=(?:{([^}]+)}|"([^"]+)")/g;
    
    let match;
    while ((match = propRegex.exec(code)) !== null) {
      const [, name, jsValue, stringValue] = match;
      
      props.push({
        name,
        value: jsValue || stringValue,
        type: jsValue ? 'expression' : 'string',
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return props;
  }

  /**
   * Extract style information
   */
  private extractStyles(code: string): StyleInfo[] {
    const styles: StyleInfo[] = [];
    
    // Extract inline styles
    const inlineStyleRegex = /style=\{([^}]+)\}/g;
    let match;
    
    while ((match = inlineStyleRegex.exec(code)) !== null) {
      styles.push({
        type: 'inline',
        content: match[1],
        line: code.substring(0, match.index).split('\n').length,
      });
    }

    return styles;
  }

  /**
   * Initialize validation rules
   */
  private initializeValidationRules(): void {
    this.validationRules = [
      new ImportValidationRule(),
      new AntdUsageValidationRule(),
      new PropValidationRule(),
      new AccessibilityValidationRule(),
      new PerformanceValidationRule(),
      new BestPracticeValidationRule(),
    ];
  }

  /**
   * Load Ant Design components list
   */
  private async loadAntdComponents(): Promise<void> {
    try {
      // Load from antd index file
      const antdIndexPath = join(__dirname, '../../antd/components/index.ts');
      const content = await readFile(antdIndexPath, 'utf-8');
      
      // Extract export statements
      const exportRegex = /export\s+.*?{\s*([^}]+)\s*}/g;
      let match;
      
      while ((match = exportRegex.exec(content)) !== null) {
        const exports = match[1].split(',').map(s => s.trim());
        exports.forEach(exp => this.antdComponents.add(exp));
      }
    } catch (error) {
      // Fallback to predefined list
      const commonComponents = [
        'Button', 'Input', 'Card', 'Typography', 'Space', 'Row', 'Col',
        'Form', 'Table', 'Modal', 'Drawer', 'Alert', 'Spin', 'Menu',
        'Dropdown', 'Tooltip', 'Popover', 'Tabs', 'Select', 'DatePicker',
        'Checkbox', 'Radio', 'Switch', 'Slider', 'Upload', 'Avatar',
        'Badge', 'Tag', 'Progress', 'Tree', 'List', 'Steps', 'Breadcrumb',
      ];
      
      commonComponents.forEach(comp => this.antdComponents.add(comp));
    }
  }

  /**
   * Check if rule should be applied
   */
  private shouldApplyRule(rule: ValidationRule, config: ValidationOptions): boolean {
    switch (rule.constructor.name) {
      case 'ImportValidationRule':
        return config.checkImports;
      case 'PropValidationRule':
        return config.checkProps;
      case 'AccessibilityValidationRule':
        return config.checkAccessibility;
      case 'PerformanceValidationRule':
        return config.checkPerformance;
      default:
        return true;
    }
  }

  /**
   * Calculate overall quality score
   */
  private calculateScore(result: ValidationResult): number {
    let score = 100;
    
    // Deduct points for errors
    score -= result.errors.filter(e => e.severity === 'error').length * 20;
    score -= result.errors.filter(e => e.severity === 'warning').length * 5;
    score -= result.warnings.length * 2;
    
    return Math.max(0, score);
  }
}

// Interfaces for parsed code structure
interface ParsedCode {
  raw: string;
  lines: string[];
  imports: ImportInfo[];
  components: ComponentInfo[];
  jsx: JSXInfo[];
  props: PropInfo[];
  styles: StyleInfo[];
}

interface ImportInfo {
  source: string;
  defaultImport?: string;
  namedImports: string[];
  namespaceImport?: string;
  line: number;
}

interface ComponentInfo {
  name: string;
  type: 'function' | 'class';
  line: number;
}

interface JSXInfo {
  tagName: string;
  fullMatch: string;
  line: number;
  isAntdComponent: boolean;
}

interface PropInfo {
  name: string;
  value: string;
  type: 'string' | 'expression';
  line: number;
}

interface StyleInfo {
  type: 'inline' | 'external';
  content: string;
  line: number;
}

// Validation rule interface
abstract class ValidationRule {
  abstract validate(code: ParsedCode, config: ValidationOptions): Promise<{
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: ValidationSuggestion[];
  }>;
}

// Import validation rule
class ImportValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check for missing React import
    const hasReactImport = code.imports.some(imp => imp.source === 'react');
    if (!hasReactImport && code.jsx.length > 0) {
      errors.push({
        type: 'import',
        message: 'Missing React import',
        severity: 'error',
      });
    }

    // Check for unused imports
    code.imports.forEach(imp => {
      if (imp.source === 'antd') {
        imp.namedImports.forEach(namedImport => {
          const isUsed = code.jsx.some(jsx => jsx.tagName === namedImport);
          if (!isUsed) {
            warnings.push({
              type: 'best-practice',
              message: `Unused import: ${namedImport} from antd`,
              suggestion: 'Remove unused imports to reduce bundle size',
            });
          }
        });
      }
    });

    return { errors, warnings, suggestions };
  }
}

// Ant Design usage validation rule
class AntdUsageValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    code.jsx.forEach(jsx => {
      if (jsx.isAntdComponent) {
        // Check for common Ant Design mistakes
        if (jsx.tagName === 'Form.Item' && !code.jsx.some(j => j.tagName === 'Form')) {
          errors.push({
            type: 'antd-usage',
            message: 'Form.Item must be inside a Form component',
            line: jsx.line,
            severity: 'error',
          });
        }
      }
    });

    return { errors, warnings, suggestions };
  }
}

// Prop validation rule
class PropValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check for invalid prop values
    code.props.forEach(prop => {
      if (prop.name === 'size' && !['small', 'middle', 'large'].includes(prop.value)) {
        warnings.push({
          type: 'best-practice',
          message: `Invalid size prop value: ${prop.value}`,
          line: prop.line,
          suggestion: 'Use "small", "middle", or "large"',
        });
      }
    });

    return { errors, warnings, suggestions };
  }
}

// Accessibility validation rule
class AccessibilityValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    code.jsx.forEach(jsx => {
      // Check for missing alt text on images
      if (jsx.tagName === 'img' && !jsx.fullMatch.includes('alt=')) {
        warnings.push({
          type: 'best-practice',
          message: 'Image missing alt text',
          line: jsx.line,
          suggestion: 'Add alt attribute for accessibility',
        });
      }

      // Check for buttons without accessible labels
      if (jsx.tagName === 'Button' && !jsx.fullMatch.includes('aria-label') && 
          !jsx.fullMatch.includes('>')) {
        warnings.push({
          type: 'best-practice',
          message: 'Button without accessible label',
          line: jsx.line,
          suggestion: 'Add aria-label or text content',
        });
      }
    });

    return { errors, warnings, suggestions };
  }
}

// Performance validation rule
class PerformanceValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check for inline functions in render
    code.lines.forEach((line, index) => {
      if (line.includes('() =>') && line.includes('onClick')) {
        warnings.push({
          type: 'performance',
          message: 'Inline function in event handler',
          line: index + 1,
          suggestion: 'Move function outside render or use useCallback',
        });
      }
    });

    return { errors, warnings, suggestions };
  }
}

// Best practice validation rule
class BestPracticeValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    // Check for proper component naming
    code.components.forEach(comp => {
      if (!/^[A-Z]/.test(comp.name)) {
        warnings.push({
          type: 'best-practice',
          message: `Component name should start with uppercase: ${comp.name}`,
          line: comp.line,
        });
      }
    });

    // Suggest improvements
    if (code.jsx.length > 10) {
      suggestions.push({
        type: 'improvement',
        message: 'Consider breaking down large components into smaller ones',
        example: 'Extract repeated patterns into reusable components',
      });
    }

    return { errors, warnings, suggestions };
  }
}