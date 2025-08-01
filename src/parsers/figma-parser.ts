/**
 * Figma API Parser
 * 
 * Handles parsing of Figma design files and extracting component information
 */

import { FigmaApi, FigmaFileResponse } from './figma-api.js';
import { FigmaFile, FigmaNode } from '../types/figma.js';

export interface ParsedFigmaData {
  file: FigmaFile;
  components: ParsedComponent[];
  styles: ParsedStyle[];
  assets: ParsedAsset[];
}

export interface ParsedComponent {
  id: string;
  name: string;
  type: string;
  properties: ComponentProperty[];
  children?: ParsedComponent[];
  layout: LayoutInfo;
  styling: StylingInfo;
  content?: ContentInfo;
}

export interface ComponentProperty {
  name: string;
  value: any;
  type: string;
}

export interface LayoutInfo {
  width: number;
  height: number;
  x: number;
  y: number;
  constraints?: {
    horizontal: string;
    vertical: string;
  };
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  margin?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  flexDirection?: 'row' | 'column';
  justifyContent?: string;
  alignItems?: string;
  gap?: number;
}

export interface StylingInfo {
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  opacity?: number;
  shadows?: ShadowInfo[];
  fills?: FillInfo[];
}

export interface ShadowInfo {
  type: string;
  color: string;
  x: number;
  y: number;
  blur: number;
  spread?: number;
}

export interface FillInfo {
  type: string;
  color?: string;
  gradient?: GradientInfo;
  opacity?: number;
}

export interface GradientInfo {
  type: string;
  stops: Array<{
    position: number;
    color: string;
  }>;
  angle?: number;
}

export interface ContentInfo {
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: string;
  textColor?: string;
}

export interface ParsedStyle {
  id: string;
  name: string;
  type: string;
  properties: Record<string, any>;
}

export interface ParsedAsset {
  id: string;
  name: string;
  type: 'image' | 'icon' | 'vector';
  url?: string;
  format?: string;
}

export class FigmaParser {
  private figmaApi: FigmaApi | null = null;

  /**
   * Initialize the parser with Figma API access
   */
  initialize(accessToken: string): void {
    this.figmaApi = new FigmaApi({ accessToken });
  }

  /**
   * Parse a Figma file
   */
  async parseFile(fileKeyOrUrl: string, accessToken?: string, nodeId?: string): Promise<ParsedFigmaData> {
    try {
      // Initialize API if not already done
      if (!this.figmaApi && accessToken) {
        this.initialize(accessToken);
      }

      if (!this.figmaApi) {
        throw new Error('Figma API not initialized. Please provide an access token.');
      }

      // Fetch file data using the new API
      // Get file data from Figma API - use nodes endpoint for specific nodes
      let fileResponse: FigmaFileResponse;
      
      if (nodeId) {
        // 🔥 USE NODES ENDPOINT TO AVOID LARGE FILE DOWNLOADS
        console.log(`🎯 Using nodes endpoint for specific node: ${nodeId}`);
        try {
          const nodesResponse = await this.figmaApi.getNodes(fileKeyOrUrl, [nodeId]);
          
          // Convert nodes response to file format
          const nodes = nodesResponse.nodes;
          const targetNode = nodes[nodeId];
          
          if (!targetNode || targetNode.err) {
            throw new Error(`Node ${nodeId} not found or has error: ${targetNode?.err || 'Unknown error'}`);
          }
          
          // Create minimal file structure with just the target node
          fileResponse = {
            document: {
              id: '0:0',
              name: 'Document',
              type: 'DOCUMENT',
              children: [targetNode.document]
            },
            components: {},
            componentSets: {},
            styles: {},
            name: 'Selected Node',
            lastModified: new Date().toISOString(),
            thumbnailUrl: '',
            version: '1.0',
            role: 'viewer',
            editorType: 'figma',
            linkAccess: 'view'
          } as FigmaFileResponse;
          
          console.log(`✅ Successfully fetched node: ${targetNode.document.name}`);
        } catch (nodeError) {
          console.log(`⚠️ Nodes endpoint failed, falling back to file endpoint: ${nodeError}`);
          // Fallback to file endpoint with heavy filtering
          fileResponse = await this.figmaApi.getFile(fileKeyOrUrl, { 
            ids: nodeId,
            depth: 1
          });
        }
      } else {
        // For full file requests, use heavy depth limit
        console.log('Fetching full file with heavy depth limit');
        fileResponse = await this.figmaApi.getFile(fileKeyOrUrl, { depth: 1 });
      }
      
      // Convert FigmaFileResponse to FigmaFile format
      const file: FigmaFile = {
        document: fileResponse.document,
        components: fileResponse.components,
        componentSets: fileResponse.componentSets,
        styles: fileResponse.styles,
        name: fileResponse.name,
        lastModified: fileResponse.lastModified,
        thumbnailUrl: fileResponse.thumbnailUrl,
        version: fileResponse.version,
        role: fileResponse.role,
        editorType: fileResponse.editorType,
        linkAccess: fileResponse.linkAccess,
        schemaVersion: 0, // Default value
      };

      // Parse components
      const rootNode = nodeId ? this.findNodeById(file.document, nodeId) : file.document;
      if (!rootNode) {
        throw new Error(`Node with ID ${nodeId} not found`);
      }

      const components = this.parseNode(rootNode);
      const styles = this.parseStyles(file.styles);
      // Skip assets extraction to prevent HTTP 414 errors on large files
    // const assets = await this.extractAssets(file, fileKeyOrUrl);
    const assets: ParsedAsset[] = [];

      return {
        file,
        components,
        styles,
        assets,
      };
    } catch (error) {
      throw new Error(`Failed to parse Figma file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Find a node by ID in the document tree
   */
  private findNodeById(node: FigmaNode, nodeId: string): FigmaNode | null {
    if (node.id === nodeId) {
      return node;
    }

    if (node.children) {
      for (const child of node.children) {
        const found = this.findNodeById(child, nodeId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * Parse a Figma node into our internal format
   */
  private parseNode(node: FigmaNode): ParsedComponent[] {
    const components: ParsedComponent[] = [];

    const component: ParsedComponent = {
      id: node.id,
      name: node.name,
      type: node.type,
      properties: this.extractProperties(node),
      layout: this.extractLayout(node),
      styling: this.extractStyling(node),
    };

    // Extract text content if it's a text node
    if (node.type === 'TEXT' && node.characters) {
      component.content = this.extractContent(node);
    }

    // Parse children
    if (node.children && node.children.length > 0) {
      component.children = [];
      for (const child of node.children) {
        const childComponents = this.parseNode(child);
        component.children.push(...childComponents);
      }
    }

    components.push(component);
    return components;
  }

  /**
   * Extract component properties from Figma node
   */
  private extractProperties(node: FigmaNode): ComponentProperty[] {
    const properties: ComponentProperty[] = [];

    // Basic properties
    if (node.visible !== undefined) {
      properties.push({ name: 'visible', value: node.visible, type: 'boolean' });
    }
    if (node.locked !== undefined) {
      properties.push({ name: 'locked', value: node.locked, type: 'boolean' });
    }
    if (node.opacity !== undefined) {
      properties.push({ name: 'opacity', value: node.opacity, type: 'number' });
    }

    // Layout properties
    if (node.layoutAlign) {
      properties.push({ name: 'layoutAlign', value: node.layoutAlign, type: 'string' });
    }
    if (node.layoutGrow !== undefined) {
      properties.push({ name: 'layoutGrow', value: node.layoutGrow, type: 'number' });
    }
    if (node.layoutSizingHorizontal) {
      properties.push({ name: 'layoutSizingHorizontal', value: node.layoutSizingHorizontal, type: 'string' });
    }
    if (node.layoutSizingVertical) {
      properties.push({ name: 'layoutSizingVertical', value: node.layoutSizingVertical, type: 'string' });
    }

    return properties;
  }

  /**
   * Extract layout information from Figma node
   */
  private extractLayout(node: FigmaNode): LayoutInfo {
    const layout: LayoutInfo = {
      width: node.absoluteBoundingBox?.width || 0,
      height: node.absoluteBoundingBox?.height || 0,
      x: node.absoluteBoundingBox?.x || 0,
      y: node.absoluteBoundingBox?.y || 0,
    };

    if (node.constraints) {
      layout.constraints = {
        horizontal: node.constraints.horizontal,
        vertical: node.constraints.vertical,
      };
    }

    // Detect flex layout properties
    if (node.type === 'FRAME' || node.type === 'COMPONENT') {
      // Infer flex direction from layout
      if (node.children && node.children.length > 1) {
        const firstChild = node.children[0];
        const secondChild = node.children[1];
        
        if (firstChild.absoluteBoundingBox && secondChild.absoluteBoundingBox) {
          const isHorizontal = Math.abs(
            firstChild.absoluteBoundingBox.y - secondChild.absoluteBoundingBox.y
          ) < Math.abs(
            firstChild.absoluteBoundingBox.x - secondChild.absoluteBoundingBox.x
          );
          
          layout.flexDirection = isHorizontal ? 'row' : 'column';
        }
      }
    }

    return layout;
  }

  /**
   * Extract styling information from Figma node
   */
  private extractStyling(node: FigmaNode): StylingInfo {
    const styling: StylingInfo = {};

    // Background color
    if (node.backgroundColor) {
      styling.backgroundColor = this.colorToHex(node.backgroundColor);
    }

    // Fills
    if (node.fills && node.fills.length > 0) {
      styling.fills = node.fills.map(fill => this.parseFill(fill));
    }

    // Border
    if (node.strokes && node.strokes.length > 0) {
      const stroke = node.strokes[0];
      if (stroke.color) {
        styling.borderColor = this.colorToHex(stroke.color);
      }
    }
    if (node.strokeWeight) {
      styling.borderWidth = node.strokeWeight;
    }

    // Border radius
    if (node.cornerRadius) {
      styling.borderRadius = node.cornerRadius;
    }

    // Opacity
    if (node.opacity !== undefined) {
      styling.opacity = node.opacity;
    }

    // Effects (shadows, blurs, etc.)
    if (node.effects && node.effects.length > 0) {
      styling.shadows = node.effects
        .filter(effect => effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW')
        .map(effect => ({
          type: effect.type,
          color: effect.color ? this.colorToHex(effect.color) : '#000000',
          x: effect.offset?.x || 0,
          y: effect.offset?.y || 0,
          blur: effect.radius,
          spread: effect.spread,
        }));
    }

    return styling;
  }

  /**
   * Extract content information from text nodes
   */
  private extractContent(node: FigmaNode): ContentInfo {
    const content: ContentInfo = {};

    if (node.characters) {
      content.text = node.characters;
    }

    if (node.style) {
      content.fontFamily = node.style.fontFamily;
      content.fontSize = node.style.fontSize;
      content.fontWeight = node.style.fontWeight;
      content.letterSpacing = node.style.letterSpacing;
      content.textAlign = node.style.textAlignHorizontal?.toLowerCase();
      
      // Extract text color from fills
      if (node.style.fills && node.style.fills.length > 0) {
        const textFill = node.style.fills[0];
        if (textFill.color) {
          content.textColor = this.colorToHex(textFill.color);
        }
      }
    }

    return content;
  }

  /**
   * Parse fill information
   */
  private parseFill(fill: any): FillInfo {
    const fillInfo: FillInfo = {
      type: fill.type,
      opacity: fill.opacity,
    };

    if (fill.type === 'SOLID' && fill.color) {
      fillInfo.color = this.colorToHex(fill.color);
    } else if (fill.type.startsWith('GRADIENT') && fill.gradientStops) {
      fillInfo.gradient = {
        type: fill.type,
        stops: fill.gradientStops.map((stop: any) => ({
          position: stop.position,
          color: this.colorToHex(stop.color),
        })),
      };
    }

    return fillInfo;
  }

  /**
   * Parse styles from Figma file
   */
  private parseStyles(styles: Record<string, any>): ParsedStyle[] {
    return Object.entries(styles).map(([id, style]) => ({
      id,
      name: style.name,
      type: style.styleType,
      properties: style,
    }));
  }

  /**
   * Extract assets (images, icons) from the file
   */
  private async extractAssets(file: FigmaFile, fileKeyOrUrl: string): Promise<ParsedAsset[]> {
    const assets: ParsedAsset[] = [];
    
    if (!this.figmaApi) {
      return assets;
    }

    try {
      // Find all nodes that might contain images or icons
      const imageNodes: string[] = [];
      this.collectImageNodes(file.document, imageNodes);

      if (imageNodes.length > 0) {
        // Get image URLs for the collected nodes
        const imageResponse = await this.figmaApi.getImages(fileKeyOrUrl, imageNodes, {
          format: 'png',
          scale: 1
        });

        // Process the image URLs
        for (const [nodeId, imageUrl] of Object.entries(imageResponse.images)) {
          if (imageUrl) {
            const node = this.findNodeById(file.document, nodeId);
            assets.push({
              id: nodeId,
              name: node?.name || `Asset ${nodeId}`,
              type: 'image',
              url: imageUrl,
              format: 'png'
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract assets:', error);
    }

    return assets;
  }

  /**
   * Recursively collect nodes that might contain images
   */
  private collectImageNodes(node: FigmaNode, imageNodes: string[]): void {
    // Check if this node has fills that might be images
    if (node.fills && node.fills.some(fill => fill.type === 'IMAGE')) {
      imageNodes.push(node.id);
    }

    // Check for vector nodes, components, or other visual elements
    if (['VECTOR', 'STAR', 'POLYGON', 'ELLIPSE', 'RECTANGLE'].includes(node.type)) {
      imageNodes.push(node.id);
    }

    // Recursively check children
    if (node.children) {
      for (const child of node.children) {
        this.collectImageNodes(child, imageNodes);
      }
    }
  }

  /**
   * Convert Figma color to hex string
   */
  private colorToHex(color: { r: number; g: number; b: number; a?: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    
    const hex = '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
    
    return hex;
  }
}