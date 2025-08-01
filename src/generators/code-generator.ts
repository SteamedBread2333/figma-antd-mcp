/**
 * React + TypeScript + Ant Design Code Generator
 * 
 * Generates React components using Ant Design based on parsed Figma designs
 */

import { AntdAnalyzer } from '../analyzers/antd-analyzer.js';
import { ParsedFigmaData, ParsedComponent } from '../parsers/figma-parser.js';
import { AntdComponent, ComponentMapping, GeneratedComponentConfig } from '../types/antd.js';
import { prettier } from '../utils/index.js';

export interface GenerationConfig {
  figmaData: ParsedFigmaData;
  componentName: string;
  outputFormat: 'typescript' | 'javascript';
  includeStyles: boolean;
  antdVersion: string;
}

export interface GenerationResult {
  code: string;
  imports: string[];
  dependencies: string[];
  warnings: string[];
  mappings: ComponentMapping[];
}

export class CodeGenerator {
  private antdAnalyzer: AntdAnalyzer;
  private componentMappings: ComponentMapping[] = [];

  constructor(antdAnalyzer: AntdAnalyzer) {
    this.antdAnalyzer = antdAnalyzer;
    this.initializeComponentMappings();
  }

  /**
   * Generate React component from Figma data
   */
  async generateComponent(config: GenerationConfig): Promise<GenerationResult> {
    const { figmaData, componentName, outputFormat, includeStyles, antdVersion } = config;
    
    const result: GenerationResult = {
      code: '',
      imports: ['React'],
      dependencies: ['react', 'antd'],
      warnings: [],
      mappings: [],
    };

    try {
      // Process the main component tree
      const rootComponents = figmaData.components;
      if (rootComponents.length === 0) {
        throw new Error('No components found in Figma data');
      }

      // Generate component configuration
      const componentConfigs = await this.processComponents(rootComponents, result);
      
      // Generate React code
      const componentCode = this.generateReactCode(
        componentName,
        componentConfigs,
        outputFormat,
        includeStyles
      );

      // Format the code
      result.code = await this.formatCode(componentCode, outputFormat);

      // Add required imports
      result.imports = this.generateImports(componentConfigs, outputFormat);

    } catch (error) {
      result.warnings.push(`Code generation failed: ${error instanceof Error ? error.message : String(error)}`);
      result.code = this.generateErrorComponent(componentName, error instanceof Error ? error.message : String(error), outputFormat);
    }

    return result;
  }

  /**
   * Get component mapping suggestions for a Figma node
   */
  async getComponentMapping(figmaNode: any, context?: string): Promise<ComponentMapping[]> {
    const mappings: ComponentMapping[] = [];

    // Analyze the node and suggest appropriate Ant Design components
    const nodeType = figmaNode.type;
    const nodeName = figmaNode.name?.toLowerCase() || '';

    // Apply mapping rules
    for (const mapping of this.componentMappings) {
      let confidence = 0;

      // Check type matching
      if (mapping.figmaType === nodeType) {
        confidence += 30;
      }

      // Check name matching
      if (mapping.figmaName && nodeName.includes(mapping.figmaName)) {
        confidence += 40;
      }

      // Apply additional rules
      for (const rule of mapping.rules) {
        if (this.evaluateRule(rule, figmaNode, context)) {
          confidence += rule.weight;
        }
      }

      if (confidence > 20) { // Minimum threshold
        mappings.push({
          ...mapping,
          confidence: Math.min(confidence, 100), // Cap at 100%
        });
      }
    }

    // Sort by confidence
    return mappings.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Process Figma components and generate Ant Design configurations
   */
  private async processComponents(
    components: ParsedComponent[], 
    result: GenerationResult
  ): Promise<GeneratedComponentConfig[]> {
    const configs: GeneratedComponentConfig[] = [];

    for (const component of components) {
      const config = await this.processComponent(component, result);
      if (config) {
        configs.push(config);
      }
    }

    return configs;
  }

  /**
   * Process a single Figma component
   */
  private async processComponent(
    component: ParsedComponent, 
    result: GenerationResult
  ): Promise<GeneratedComponentConfig | null> {
    try {
      // Get component mapping
      const mappings = await this.getComponentMapping(component);
      
      if (mappings.length === 0) {
        result.warnings.push(`No suitable Ant Design component found for: ${component.name}`);
        return null;
      }

      const bestMapping = mappings[0];
      result.mappings.push(bestMapping);

      // Get Ant Design component info
      const antdComponents = await this.antdAnalyzer.analyzeComponents([bestMapping.antdComponent]);
      const antdComponent = antdComponents[0];

      if (!antdComponent) {
        result.warnings.push(`Could not analyze Ant Design component: ${bestMapping.antdComponent}`);
        return null;
      }

      // Generate props based on Figma component properties
      const props = this.generateProps(component, antdComponent);

      // Process children
      const children: GeneratedComponentConfig[] = [];
      if (component.children) {
        for (const child of component.children) {
          const childConfig = await this.processComponent(child, result);
          if (childConfig) {
            children.push(childConfig);
          }
        }
      }

      return {
        component: antdComponent,
        props,
        children: children.length > 0 ? children : undefined,
        styling: this.generateStyling(component),
      };

    } catch (error) {
      result.warnings.push(`Failed to process component ${component.name}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * Generate props for Ant Design component based on Figma component
   */
  private generateProps(figmaComponent: ParsedComponent, antdComponent: AntdComponent): Record<string, any> {
    const props: Record<string, any> = {};

    // Handle text content
    if (figmaComponent.content?.text) {
      if (['Button', 'Typography'].includes(antdComponent.name)) {
        props.children = figmaComponent.content.text;
      } else if (antdComponent.name === 'Input') {
        props.placeholder = figmaComponent.content.text;
      }
    }

    // Handle size based on dimensions
    if (figmaComponent.layout) {
      const { width, height } = figmaComponent.layout;
      
      if (antdComponent.name === 'Button') {
        if (height <= 24) props.size = 'small';
        else if (height >= 40) props.size = 'large';
        else props.size = 'middle';
      }
    }

    // Handle styling
    if (figmaComponent.styling) {
      if (antdComponent.name === 'Button') {
        // Determine button type based on styling
        if (figmaComponent.styling.fills?.some(fill => fill.type === 'SOLID')) {
          props.type = 'primary';
        } else if (figmaComponent.styling.borderWidth) {
          props.type = 'default';
        }
      }
    }

    // Handle visibility
    if (figmaComponent.properties.some(p => p.name === 'visible' && p.value === false)) {
      props.style = { ...props.style, display: 'none' };
    }

    return props;
  }

  /**
   * Generate styling information
   */
  private generateStyling(component: ParsedComponent) {
    const styling: any = {};

    if (component.styling) {
      const style: Record<string, any> = {};

      // Background color
      if (component.styling.backgroundColor) {
        style.backgroundColor = component.styling.backgroundColor;
      }

      // Border
      if (component.styling.borderColor && component.styling.borderWidth) {
        style.border = `${component.styling.borderWidth}px solid ${component.styling.borderColor}`;
      }

      // Border radius
      if (component.styling.borderRadius) {
        style.borderRadius = component.styling.borderRadius;
      }

      // Opacity
      if (component.styling.opacity !== undefined) {
        style.opacity = component.styling.opacity;
      }

      // Box shadow
      if (component.styling.shadows && component.styling.shadows.length > 0) {
        const shadow = component.styling.shadows[0];
        style.boxShadow = `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}`;
      }

      if (Object.keys(style).length > 0) {
        styling.style = style;
      }
    }

    return styling;
  }

  /**
   * Generate React component code
   */
  private generateReactCode(
    componentName: string,
    configs: GeneratedComponentConfig[],
    outputFormat: 'typescript' | 'javascript',
    includeStyles: boolean
  ): string {
    const imports = this.generateImportStatements(configs);
    const typeAnnotations = outputFormat === 'typescript' ? ': React.FC' : '';
    
    let code = `${imports}\n\n`;
    
    if (outputFormat === 'typescript') {
      code += `interface ${componentName}Props {}\n\n`;
    }

    code += `const ${componentName}${typeAnnotations} = (${outputFormat === 'typescript' ? 'props: ' + componentName + 'Props' : ''}) => {\n`;
    code += '  return (\n';
    code += '    <div>\n';

    // Generate JSX for each component
    for (const config of configs) {
      code += this.generateComponentJSX(config, 6); // 6 spaces indentation
    }

    code += '    </div>\n';
    code += '  );\n';
    code += '};\n\n';
    code += `export default ${componentName};`;

    return code;
  }

  /**
   * Generate JSX for a component configuration
   */
  private generateComponentJSX(config: GeneratedComponentConfig, indent: number): string {
    const spaces = ' '.repeat(indent);
    const componentName = config.component.name;
    
    let jsx = `${spaces}<${componentName}`;

    // Add props
    for (const [key, value] of Object.entries(config.props)) {
      if (key === 'children') continue; // Handle children separately
      
      if (typeof value === 'string') {
        jsx += ` ${key}="${value}"`;
      } else if (typeof value === 'boolean') {
        jsx += value ? ` ${key}` : ` ${key}={false}`;
      } else {
        jsx += ` ${key}={${JSON.stringify(value)}}`;
      }
    }

    // Add styling
    if (config.styling?.style) {
      jsx += ` style={${JSON.stringify(config.styling.style)}}`;
    }

    // Handle children
    const hasTextChildren = config.props.children && typeof config.props.children === 'string';
    const hasComponentChildren = config.children && config.children.length > 0;

    if (hasTextChildren || hasComponentChildren) {
      jsx += '>';
      
      if (hasTextChildren) {
        jsx += config.props.children as string;
      }
      
      if (hasComponentChildren) {
        jsx += '\n';
        for (const child of config.children!) {
          jsx += this.generateComponentJSX(child, indent + 2);
        }
        jsx += spaces;
      }
      
      jsx += `</${componentName}>\n`;
    } else {
      jsx += ' />\n';
    }

    return jsx;
  }

  /**
   * Generate import statements
   */
  private generateImportStatements(configs: GeneratedComponentConfig[]): string {
    const antdComponents = new Set<string>();
    
    const collectComponents = (config: GeneratedComponentConfig) => {
      antdComponents.add(config.component.name);
      if (config.children) {
        config.children.forEach(collectComponents);
      }
    };

    configs.forEach(collectComponents);

    const imports = [
      "import React from 'react';",
      `import { ${Array.from(antdComponents).sort().join(', ')} } from 'antd';`
    ];

    return imports.join('\n');
  }

  /**
   * Generate imports list
   */
  private generateImports(configs: GeneratedComponentConfig[], outputFormat: string): string[] {
    const imports = ['react', 'antd'];
    
    if (outputFormat === 'typescript') {
      imports.push('@types/react');
    }

    return imports;
  }

  /**
   * Format code using prettier
   */
  private async formatCode(code: string, outputFormat: string): Promise<string> {
    try {
      return await prettier.format(code, {
        parser: outputFormat === 'typescript' ? 'typescript' : 'babel',
      });
    } catch (error) {
      console.warn('Failed to format code:', error);
      return code;
    }
  }

  /**
   * Generate error component
   */
  private generateErrorComponent(componentName: string, error: string, outputFormat: string): string {
    const typeAnnotation = outputFormat === 'typescript' ? ': React.FC' : '';
    
    return `import React from 'react';
import { Alert } from 'antd';

const ${componentName}${typeAnnotation} = () => {
  return (
    <Alert
      message="Component Generation Error"
      description="${error}"
      type="error"
      showIcon
    />
  );
};

export default ${componentName};`;
  }

  /**
   * Initialize component mappings
   */
  private initializeComponentMappings(): void {
    this.componentMappings = [
      // Button mappings
      {
        figmaType: 'COMPONENT',
        figmaName: 'button',
        antdComponent: 'Button',
        confidence: 0,
        rules: [
          { condition: 'name_contains_button', action: 'increase_confidence', weight: 50 },
          { condition: 'has_text_content', action: 'increase_confidence', weight: 20 },
          { condition: 'clickable_appearance', action: 'increase_confidence', weight: 30 },
        ],
      },
      
      // Input mappings
      {
        figmaType: 'FRAME',
        figmaName: 'input',
        antdComponent: 'Input',
        confidence: 0,
        rules: [
          { condition: 'name_contains_input', action: 'increase_confidence', weight: 50 },
          { condition: 'has_border', action: 'increase_confidence', weight: 20 },
          { condition: 'rectangular_shape', action: 'increase_confidence', weight: 15 },
        ],
      },

      // Card mappings
      {
        figmaType: 'FRAME',
        figmaName: 'card',
        antdComponent: 'Card',
        confidence: 0,
        rules: [
          { condition: 'name_contains_card', action: 'increase_confidence', weight: 50 },
          { condition: 'has_background', action: 'increase_confidence', weight: 20 },
          { condition: 'has_shadow', action: 'increase_confidence', weight: 25 },
          { condition: 'contains_multiple_elements', action: 'increase_confidence', weight: 15 },
        ],
      },

      // Text/Typography mappings
      {
        figmaType: 'TEXT',
        antdComponent: 'Typography.Text',
        confidence: 0,
        rules: [
          { condition: 'is_text_node', action: 'increase_confidence', weight: 80 },
          { condition: 'small_font_size', action: 'prefer_text', weight: 20 },
        ],
      },

      // Default fallback
      {
        figmaType: 'FRAME',
        antdComponent: 'div',
        confidence: 0,
        rules: [
          { condition: 'is_container', action: 'use_div', weight: 10 },
        ],
      },
    ];
  }

  /**
   * Evaluate a mapping rule
   */
  private evaluateRule(rule: any, figmaNode: any, context?: string): boolean {
    switch (rule.condition) {
      case 'name_contains_button':
        return figmaNode.name?.toLowerCase().includes('button') || false;
      
      case 'name_contains_input':
        return figmaNode.name?.toLowerCase().includes('input') || false;
      
      case 'name_contains_card':
        return figmaNode.name?.toLowerCase().includes('card') || false;
      
      case 'has_text_content':
        return !!figmaNode.content?.text;
      
      case 'has_border':
        return !!figmaNode.styling?.borderWidth;
      
      case 'has_background':
        return !!figmaNode.styling?.backgroundColor || !!figmaNode.styling?.fills?.length;
      
      case 'has_shadow':
        return !!figmaNode.styling?.shadows?.length;
      
      case 'is_text_node':
        return figmaNode.type === 'TEXT';
      
      case 'rectangular_shape':
        return figmaNode.layout && figmaNode.layout.width > figmaNode.layout.height;
      
      case 'contains_multiple_elements':
        return figmaNode.children && figmaNode.children.length > 1;
      
      default:
        return false;
    }
  }
}