/**
 * Ant Design component types and interfaces
 */

export interface AntdComponent {
  name: string;
  displayName: string;
  category: ComponentCategory;
  props: ComponentProp[];
  usage: ComponentUsage;
  examples: ComponentExample[];
  documentation?: string;
  deprecated?: boolean;
  version?: string;
}

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  options?: string[] | number[];
  validation?: PropValidation;
}

export interface PropValidation {
  min?: number;
  max?: number;
  pattern?: string;
  enum?: string[];
}

export interface ComponentUsage {
  import: string;
  basicExample: string;
  commonProps: string[];
  styleProps: string[];
}

export interface ComponentExample {
  title: string;
  description: string;
  code: string;
  props?: Record<string, any>;
}

export type ComponentCategory = 
  | 'General'
  | 'Layout' 
  | 'Navigation'
  | 'Data Entry'
  | 'Data Display'
  | 'Feedback'
  | 'Other';

export interface AntdTheme {
  token: {
    colorPrimary: string;
    colorInfo: string;
    colorSuccess: string;
    colorWarning: string;
    colorError: string;
    fontSize: number;
    fontFamily: string;
    borderRadius: number;
    [key: string]: any;
  };
  components?: {
    [componentName: string]: {
      [tokenName: string]: any;
    };
  };
}

export interface GeneratedComponentConfig {
  component: AntdComponent;
  props: Record<string, any>;
  children?: GeneratedComponentConfig[];
  styling?: ComponentStyling;
}

export interface ComponentStyling {
  className?: string;
  style?: Record<string, any>;
  theme?: Partial<AntdTheme>;
}

// Mapping between Figma node types and Ant Design components
export interface ComponentMapping {
  figmaType: string;
  figmaName?: string;
  antdComponent: string;
  confidence: number;
  rules: MappingRule[];
}

export interface MappingRule {
  condition: string;
  action: string;
  weight: number;
}

// Code generation templates
export interface CodeTemplate {
  name: string;
  template: string;
  imports: string[];
  dependencies: string[];
}