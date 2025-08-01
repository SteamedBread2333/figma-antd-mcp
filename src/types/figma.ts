/**
 * Figma API types and interfaces
 */

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  locked?: boolean;
  opacity?: number;
  absoluteBoundingBox?: Rectangle;
  constraints?: LayoutConstraint;
  effects?: Effect[];
  exportSettings?: ExportSetting[];
  blendMode?: BlendMode;
  preserveRatio?: boolean;
  layoutAlign?: 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
  layoutGrow?: number;
  layoutSizingHorizontal?: 'FIXED' | 'HUG' | 'FILL';
  layoutSizingVertical?: 'FIXED' | 'HUG' | 'FILL';
  clipsContent?: boolean;
  background?: Paint[];
  backgroundColor?: Color;
  fills?: Paint[];
  strokes?: Paint[];
  strokeWeight?: number;
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER';
  strokeDashes?: number[];
  cornerRadius?: number;
  cornerSmoothing?: number;
  children?: FigmaNode[];
  characters?: string;
  style?: TypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: { [styleId: number]: TypeStyle };
}

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Paint {
  type: 'SOLID' | 'GRADIENT_LINEAR' | 'GRADIENT_RADIAL' | 'GRADIENT_ANGULAR' | 'GRADIENT_DIAMOND' | 'IMAGE' | 'EMOJI';
  visible?: boolean;
  opacity?: number;
  color?: Color;
  gradientHandlePositions?: Vector[];
  gradientStops?: ColorStop[];
  scaleMode?: 'FILL' | 'FIT' | 'CROP' | 'TILE';
  imageTransform?: Transform;
  scalingFactor?: number;
  rotation?: number;
  imageRef?: string;
  filters?: ImageFilters;
  gifRef?: string;
}

export interface Vector {
  x: number;
  y: number;
}

export interface ColorStop {
  position: number;
  color: Color;
}

export interface Transform {
  m00: number;
  m01: number;
  m02: number;
  m10: number;
  m11: number;
  m12: number;
}

export interface ImageFilters {
  exposure?: number;
  contrast?: number;
  saturation?: number;
  temperature?: number;
  tint?: number;
  highlights?: number;
  shadows?: number;
}

export interface TypeStyle {
  fontFamily: string;
  fontPostScriptName?: string;
  paragraphSpacing?: number;
  paragraphIndent?: number;
  listSpacing?: number;
  hangingPunctuation?: boolean;
  hangingList?: boolean;
  italic?: boolean;
  fontWeight: number;
  fontSize: number;
  textCase?: 'ORIGINAL' | 'UPPER' | 'LOWER' | 'TITLE' | 'SMALL_CAPS' | 'SMALL_CAPS_FORCED';
  textDecoration?: 'NONE' | 'UNDERLINE' | 'STRIKETHROUGH';
  textAutoResize?: 'NONE' | 'HEIGHT' | 'WIDTH_AND_HEIGHT' | 'TRUNCATE';
  textTruncation?: 'DISABLED' | 'ENDING';
  maxLines?: number;
  textAlignHorizontal?: 'LEFT' | 'RIGHT' | 'CENTER' | 'JUSTIFIED';
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM';
  letterSpacing?: number;
  fills?: Paint[];
  hyperlink?: Hyperlink;
  opentypeFlags?: { [flag: string]: number };
}

export interface Hyperlink {
  type: 'URL' | 'NODE';
  url?: string;
  nodeID?: string;
}

export interface Effect {
  type: 'INNER_SHADOW' | 'DROP_SHADOW' | 'LAYER_BLUR' | 'BACKGROUND_BLUR';
  visible?: boolean;
  radius: number;
  color?: Color;
  blendMode?: BlendMode;
  offset?: Vector;
  spread?: number;
  showShadowBehindNode?: boolean;
}

export interface ExportSetting {
  suffix?: string;
  format: 'JPG' | 'PNG' | 'SVG' | 'PDF';
  constraint?: Constraint;
}

export interface Constraint {
  type: 'SCALE' | 'WIDTH' | 'HEIGHT';
  value: number;
}

export interface LayoutConstraint {
  vertical: 'TOP' | 'BOTTOM' | 'CENTER' | 'TOP_BOTTOM' | 'SCALE';
  horizontal: 'LEFT' | 'RIGHT' | 'CENTER' | 'LEFT_RIGHT' | 'SCALE';
}

export type BlendMode = 
  | 'PASS_THROUGH' | 'NORMAL' | 'DARKEN' | 'MULTIPLY' | 'LINEAR_BURN' | 'COLOR_BURN'
  | 'LIGHTEN' | 'SCREEN' | 'LINEAR_DODGE' | 'COLOR_DODGE' | 'OVERLAY' | 'SOFT_LIGHT'
  | 'HARD_LIGHT' | 'DIFFERENCE' | 'EXCLUSION' | 'HUE' | 'SATURATION' | 'COLOR' | 'LUMINOSITY';

export interface FigmaFile {
  document: FigmaNode;
  components: { [key: string]: Component };
  componentSets: { [key: string]: ComponentSet };
  schemaVersion: number;
  styles: { [key: string]: Style };
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
}

export interface Component {
  key: string;
  name: string;
  description: string;
  componentSetId?: string;
  documentationLinks: DocumentationLink[];
  remote: boolean;
}

export interface ComponentSet {
  key: string;
  name: string;
  description: string;
  documentationLinks: DocumentationLink[];
  remote: boolean;
}

export interface DocumentationLink {
  uri: string;
}

export interface Style {
  key: string;
  name: string;
  description: string;
  remote: boolean;
  styleType: 'FILL' | 'TEXT' | 'EFFECT' | 'GRID';
}