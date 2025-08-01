/**
 * Ant Design Component Analyzer
 * 
 * Analyzes Ant Design components, their properties, and usage patterns
 */

import { readFile, readdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { AntdComponent, ComponentProp, ComponentUsage, ComponentExample, ComponentCategory } from '../types/antd.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class AntdAnalyzer {
  private antdPath: string;
  private componentsCache: Map<string, AntdComponent> = new Map();

  constructor() {
    // Path to the Ant Design submodule
    this.antdPath = join(__dirname, '../../antd');
  }

  /**
   * Analyze specified Ant Design components
   */
  async analyzeComponents(componentNames: string[], includeExamples: boolean = true): Promise<AntdComponent[]> {
    const results: AntdComponent[] = [];

    for (const componentName of componentNames) {
      try {
        const component = await this.analyzeComponent(componentName, includeExamples);
        if (component) {
          results.push(component);
        }
      } catch (error) {
        console.error(`Failed to analyze component ${componentName}:`, error);
        // Continue with other components
      }
    }

    return results;
  }

  /**
   * Analyze a single Ant Design component
   */
  async analyzeComponent(componentName: string, includeExamples: boolean = true): Promise<AntdComponent | null> {
    // Check cache first
    const cacheKey = `${componentName}-${includeExamples}`;
    if (this.componentsCache.has(cacheKey)) {
      return this.componentsCache.get(cacheKey)!;
    }

    try {
      const componentPath = join(this.antdPath, 'components', componentName.toLowerCase());
      
      // Check if component directory exists
      try {
        await access(componentPath);
      } catch {
        console.warn(`Component directory not found: ${componentPath}`);
        return null;
      }

      const component: AntdComponent = {
        name: componentName,
        displayName: this.formatDisplayName(componentName),
        category: await this.determineCategory(componentName),
        props: await this.extractProps(componentPath),
        usage: await this.extractUsage(componentPath, componentName),
        examples: includeExamples ? await this.extractExamples(componentPath) : [],
      };

      // Cache the result
      this.componentsCache.set(cacheKey, component);
      return component;
    } catch (error) {
      console.error(`Error analyzing component ${componentName}:`, error);
      return null;
    }
  }

  /**
   * Get all available Ant Design components
   */
  async getAllComponents(): Promise<string[]> {
    try {
      const componentsPath = join(this.antdPath, 'components');
      const items = await readdir(componentsPath, { withFileTypes: true });
      
      return items
        .filter(item => item.isDirectory() && !item.name.startsWith('_') && !item.name.startsWith('.'))
        .map(item => item.name)
        .filter(name => !['__tests__', 'style', 'locale'].includes(name));
    } catch (error) {
      console.error('Failed to get components list:', error);
      return [];
    }
  }

  /**
   * Extract component properties from TypeScript definitions
   */
  private async extractProps(componentPath: string): Promise<ComponentProp[]> {
    const props: ComponentProp[] = [];

    try {
      // Look for TypeScript definition files
      const files = await readdir(componentPath);
      const tsFiles = files.filter(file => file.endsWith('.tsx') || file.endsWith('.ts'));

      for (const file of tsFiles) {
        const filePath = join(componentPath, file);
        const content = await readFile(filePath, 'utf-8');
        
        // Extract interface definitions
        const interfaceMatches = content.match(/interface\s+\w*Props\s*{[^}]+}/g);
        if (interfaceMatches) {
          for (const interfaceMatch of interfaceMatches) {
            const extractedProps = this.parsePropsInterface(interfaceMatch);
            props.push(...extractedProps);
          }
        }

        // Extract type definitions
        const typeMatches = content.match(/type\s+\w*Props\s*=\s*{[^}]+}/g);
        if (typeMatches) {
          for (const typeMatch of typeMatches) {
            const extractedProps = this.parsePropsInterface(typeMatch);
            props.push(...extractedProps);
          }
        }
      }
    } catch (error) {
      console.error(`Failed to extract props from ${componentPath}:`, error);
    }

    return props;
  }

  /**
   * Parse TypeScript interface to extract props
   */
  private parsePropsInterface(interfaceText: string): ComponentProp[] {
    const props: ComponentProp[] = [];
    
    // Extract property definitions
    const propRegex = /(\w+)\??:\s*([^;,}]+)/g;
    let match;

    while ((match = propRegex.exec(interfaceText)) !== null) {
      const [, name, typeText] = match;
      const required = !interfaceText.includes(`${name}?:`);
      
      props.push({
        name,
        type: typeText.trim(),
        required,
        description: '', // Would need to extract from comments
        defaultValue: this.extractDefaultValue(typeText),
      });
    }

    return props;
  }

  /**
   * Extract default value from type definition
   */
  private extractDefaultValue(typeText: string): any {
    // Handle boolean types
    if (typeText.includes('false')) return false;
    if (typeText.includes('true')) return true;
    
    // Handle string literals
    const stringLiteralMatch = typeText.match(/'([^']+)'/);
    if (stringLiteralMatch) return stringLiteralMatch[1];
    
    // Handle number literals
    const numberMatch = typeText.match(/\b(\d+)\b/);
    if (numberMatch) return parseInt(numberMatch[1], 10);
    
    return undefined;
  }

  /**
   * Extract usage information
   */
  private async extractUsage(componentPath: string, componentName: string): Promise<ComponentUsage> {
    const usage: ComponentUsage = {
      import: `import { ${componentName} } from 'antd';`,
      basicExample: `<${componentName} />`,
      commonProps: [],
      styleProps: [],
    };

    try {
      // Look for index.ts or main component file
      const files = await readdir(componentPath);
      const mainFile = files.find(file => file === 'index.tsx' || file === `${componentName.toLowerCase()}.tsx`);
      
      if (mainFile) {
        const filePath = join(componentPath, mainFile);
        const content = await readFile(filePath, 'utf-8');
        
        // Extract common props from defaultProps or usage patterns
        const defaultPropsMatch = content.match(/defaultProps\s*=\s*{([^}]+)}/);
        if (defaultPropsMatch) {
          const propsText = defaultPropsMatch[1];
          usage.commonProps = this.extractCommonProps(propsText);
        }
      }

      // Look for demo files
      const demoPath = join(componentPath, 'demo');
      try {
        await access(demoPath);
        const basicDemo = await this.findBasicDemo(demoPath);
        if (basicDemo) {
          usage.basicExample = basicDemo;
        }
      } catch {
        // Demo directory doesn't exist
      }
    } catch (error) {
      console.error(`Failed to extract usage for ${componentName}:`, error);
    }

    return usage;
  }

  /**
   * Extract examples from demo files
   */
  private async extractExamples(componentPath: string): Promise<ComponentExample[]> {
    const examples: ComponentExample[] = [];

    try {
      const demoPath = join(componentPath, 'demo');
      await access(demoPath);
      
      const demoFiles = await readdir(demoPath);
      const tsxFiles = demoFiles.filter(file => file.endsWith('.tsx'));

      for (const file of tsxFiles.slice(0, 5)) { // Limit to 5 examples
        const filePath = join(demoPath, file);
        const content = await readFile(filePath, 'utf-8');
        
        const example = this.parseExampleFile(content, file);
        if (example) {
          examples.push(example);
        }
      }
    } catch (error) {
      // Demo directory doesn't exist or is not accessible
    }

    return examples;
  }

  /**
   * Parse example file content
   */
  private parseExampleFile(content: string, filename: string): ComponentExample | null {
    try {
      // Extract title from comment or filename
      const titleMatch = content.match(/\/\*\*\s*\n\s*\*\s*(.+?)\s*\n/);
      const title = titleMatch?.[1] || filename.replace('.tsx', '').replace(/[-_]/g, ' ');

      // Extract description
      const descMatch = content.match(/\/\*\*[\s\S]*?\*\s*(.+?)\s*\n[\s\S]*?\*\//);
      const description = descMatch?.[1] || '';

      // Extract React component code
      const componentMatch = content.match(/export default.*?{([\s\S]*?)};?\s*$/);
      const code = componentMatch ? componentMatch[0] : content;

      return {
        title: this.capitalizeWords(title),
        description,
        code: code.trim(),
      };
    } catch (error) {
      console.error(`Failed to parse example file ${filename}:`, error);
      return null;
    }
  }

  /**
   * Determine component category
   */
  private async determineCategory(componentName: string): Promise<ComponentCategory> {
    const categoryMap: Record<string, ComponentCategory> = {
      // General
      'button': 'General',
      'icon': 'General',
      'typography': 'General',

      // Layout
      'divider': 'Layout',
      'grid': 'Layout',
      'layout': 'Layout',
      'space': 'Layout',

      // Navigation
      'affix': 'Navigation',
      'breadcrumb': 'Navigation',
      'dropdown': 'Navigation',
      'menu': 'Navigation',
      'pagination': 'Navigation',
      'steps': 'Navigation',

      // Data Entry
      'autocomplete': 'Data Entry',
      'cascader': 'Data Entry',
      'checkbox': 'Data Entry',
      'datepicker': 'Data Entry',
      'form': 'Data Entry',
      'input': 'Data Entry',
      'inputnumber': 'Data Entry',
      'mentions': 'Data Entry',
      'radio': 'Data Entry',
      'rate': 'Data Entry',
      'select': 'Data Entry',
      'slider': 'Data Entry',
      'switch': 'Data Entry',
      'timepicker': 'Data Entry',
      'transfer': 'Data Entry',
      'treeselect': 'Data Entry',
      'upload': 'Data Entry',

      // Data Display
      'avatar': 'Data Display',
      'badge': 'Data Display',
      'calendar': 'Data Display',
      'card': 'Data Display',
      'carousel': 'Data Display',
      'collapse': 'Data Display',
      'descriptions': 'Data Display',
      'empty': 'Data Display',
      'image': 'Data Display',
      'list': 'Data Display',
      'popover': 'Data Display',
      'qrcode': 'Data Display',
      'statistic': 'Data Display',
      'table': 'Data Display',
      'tabs': 'Data Display',
      'tag': 'Data Display',
      'timeline': 'Data Display',
      'tooltip': 'Data Display',
      'tree': 'Data Display',

      // Feedback
      'alert': 'Feedback',
      'drawer': 'Feedback',
      'message': 'Feedback',
      'modal': 'Feedback',
      'notification': 'Feedback',
      'popconfirm': 'Feedback',
      'progress': 'Feedback',
      'result': 'Feedback',
      'skeleton': 'Feedback',
      'spin': 'Feedback',
    };

    return categoryMap[componentName.toLowerCase()] || 'Other';
  }

  /**
   * Format display name
   */
  private formatDisplayName(componentName: string): string {
    return componentName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Extract common props from defaultProps
   */
  private extractCommonProps(propsText: string): string[] {
    const props: string[] = [];
    const propRegex = /(\w+):/g;
    let match;

    while ((match = propRegex.exec(propsText)) !== null) {
      props.push(match[1]);
    }

    return props;
  }

  /**
   * Find basic demo file
   */
  private async findBasicDemo(demoPath: string): Promise<string | null> {
    try {
      const files = await readdir(demoPath);
      const basicFile = files.find(file => 
        file.includes('basic') || 
        file.includes('simple') || 
        file.startsWith('01-') ||
        files.indexOf(file) === 0
      );
      
      if (basicFile) {
        const content = await readFile(join(demoPath, basicFile), 'utf-8');
        const componentMatch = content.match(/export default.*?{([\s\S]*?)};?\s*$/);
        return componentMatch ? componentMatch[0] : null;
      }
    } catch (error) {
      console.error('Failed to find basic demo:', error);
    }
    
    return null;
  }

  /**
   * Capitalize words
   */
  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }
}