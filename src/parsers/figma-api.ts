/**
 * Direct Figma API integration
 * 
 * This module provides direct access to Figma API functionality
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { FigmaFile, FigmaNode } from '../types/figma.js';

export interface FigmaApiConfig {
  accessToken: string;
  baseURL?: string;
}

export interface FigmaFileResponse {
  document: FigmaNode;
  components: Record<string, any>;
  componentSets: Record<string, any>;
  styles: Record<string, any>;
  name: string;
  lastModified: string;
  thumbnailUrl: string;
  version: string;
  role: string;
  editorType: string;
  linkAccess: string;
}

export interface FigmaImageResponse {
  images: Record<string, string>;
}

export interface FigmaCommentsResponse {
  comments: FigmaComment[];
}

export interface FigmaComment {
  id: string;
  file_key: string;
  parent_id?: string;
  user: {
    id: string;
    handle: string;
    img_url: string;
    email?: string;
  };
  created_at: string;
  resolved_at?: string;
  message: string;
  client_meta: {
    node_id?: string[];
    node_offset?: { x: number; y: number };
  };
  order_id: string;
}

export class FigmaApi {
  private client: AxiosInstance;
  private accessToken: string;

  constructor(config: FigmaApiConfig) {
    if (!config.accessToken || typeof config.accessToken !== 'string') {
      throw new Error('Invalid Figma access token: Token must be a non-empty string');
    }
    
    // Basic token format validation
    if (config.accessToken.length < 20) {
      throw new Error('Invalid Figma access token: Token appears to be too short');
    }

    this.accessToken = config.accessToken;
    this.client = axios.create({
      baseURL: config.baseURL || 'https://api.figma.com/v1',
      headers: {
        'X-Figma-Token': this.accessToken,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Figma API Error Details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          headers: error.response?.headers,
          url: error.config?.url,
          method: error.config?.method
        });

        if (error.response) {
          const { status, data } = error.response;
          
          // Handle specific error cases
          if (status === 401) {
            throw new Error('Figma API authentication failed: Invalid or expired access token');
          } else if (status === 403) {
            throw new Error('Figma API access denied: Check token permissions or file access rights');
          } else if (status === 404) {
            throw new Error('Figma file not found: Check if the file exists and is accessible');
          } else if (status === 429) {
            throw new Error('Figma API rate limit exceeded: Please try again later');
          }

          const errorMessage = data?.message || data?.err || `HTTP ${status} error`;
          throw new Error(`Figma API error (${status}): ${errorMessage}`);
        } else if (error.request) {
          throw new Error('Network error: Unable to reach Figma API. Check your internet connection.');
        } else {
          throw new Error(`Request setup error: ${error.message}`);
        }
      }
    );
  }

  /**
   * Extract file key from Figma URL
   */
  static extractFileKey(figmaUrl: string): string {
    if (!figmaUrl || typeof figmaUrl !== 'string') {
      throw new Error('Invalid Figma URL: URL must be a non-empty string');
    }

    // Handle various Figma URL formats:
    // https://www.figma.com/file/abc123/Title
    // https://www.figma.com/design/abc123/Title
    // https://figma.com/file/abc123/Title
    const patterns = [
      /figma\.com\/(?:file|design)\/([a-zA-Z0-9_-]+)/,
      /figma\.com\/([a-zA-Z0-9_-]+)/, // fallback
    ];

    for (const pattern of patterns) {
      const match = figmaUrl.match(pattern);
      if (match && match[1] && match[1].length > 10) { // Figma file keys are usually longer than 10 chars
        return match[1];
      }
    }

    // If it's already just a file key
    if (/^[a-zA-Z0-9_-]{15,}$/.test(figmaUrl)) {
      return figmaUrl;
    }

    throw new Error(`Invalid Figma URL format: ${figmaUrl}. Expected format: https://www.figma.com/file/FILE_KEY/Title`);
  }

  /**
   * Extract node ID from Figma URL
   */
  static extractNodeId(figmaUrl: string): string | null {
    const match = figmaUrl.match(/node-id=([^&]+)/);
    if (!match) return null;
    
    let nodeId = decodeURIComponent(match[1]);
    
    // Convert URL format (28439-1428) to API format (28439:1428)
    // Figma URLs use dashes but API expects colons
    if (nodeId.includes('-') && !nodeId.includes(':')) {
      nodeId = nodeId.replace('-', ':');
    }
    
    return nodeId;
  }

  /**
   * Get specific nodes from file (avoids large file downloads)
   */
  async getNodes(fileKeyOrUrl: string, nodeIds: string[]): Promise<any> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    const idsParam = nodeIds.join(',');
    
    const url = `/files/${fileKey}/nodes?ids=${encodeURIComponent(idsParam)}`;
    console.log(`🎯 Fetching specific nodes: ${url}`);
    
    const response = await this.client.get(url);
    return response.data;
  }

  /**
   * Get file information
   */
  async getFile(fileKeyOrUrl: string, options: {
    version?: string;
    ids?: string;
    depth?: number;
    geometry?: 'paths' | 'vector';
    plugin_data?: string;
    branch_data?: boolean;
  } = {}): Promise<FigmaFileResponse> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    
    const params = new URLSearchParams();
    if (options.version) params.append('version', options.version);
    if (options.ids) params.append('ids', options.ids);
    if (options.depth) params.append('depth', options.depth.toString());
    if (options.geometry) params.append('geometry', options.geometry);
    if (options.plugin_data) params.append('plugin_data', options.plugin_data);
    if (options.branch_data) params.append('branch_data', options.branch_data.toString());

    const queryString = params.toString();
    const url = `/files/${fileKey}${queryString ? `?${queryString}` : ''}`;

    const response: AxiosResponse<FigmaFileResponse> = await this.client.get(url);
    return response.data;
  }

  /**
   * Get specific nodes from a file
   */
  async getFileNodes(fileKeyOrUrl: string, nodeIds: string[], options: {
    version?: string;
    depth?: number;
    geometry?: 'paths' | 'vector';
    plugin_data?: string;
  } = {}): Promise<{ nodes: Record<string, FigmaNode> }> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options.version) params.append('version', options.version);
    if (options.depth) params.append('depth', options.depth.toString());
    if (options.geometry) params.append('geometry', options.geometry);
    if (options.plugin_data) params.append('plugin_data', options.plugin_data);

    const response = await this.client.get(`/files/${fileKey}/nodes?${params.toString()}`);
    return response.data;
  }

  /**
   * Get image URLs for nodes
   */
  async getImages(fileKeyOrUrl: string, nodeIds: string[], options: {
    scale?: number;
    format?: 'jpg' | 'png' | 'svg' | 'pdf';
    svg_include_id?: boolean;
    svg_simplify_stroke?: boolean;
    use_absolute_bounds?: boolean;
    version?: string;
  } = {}): Promise<FigmaImageResponse> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    
    const params = new URLSearchParams();
    params.append('ids', nodeIds.join(','));
    if (options.scale) params.append('scale', options.scale.toString());
    if (options.format) params.append('format', options.format);
    if (options.svg_include_id) params.append('svg_include_id', options.svg_include_id.toString());
    if (options.svg_simplify_stroke) params.append('svg_simplify_stroke', options.svg_simplify_stroke.toString());
    if (options.use_absolute_bounds) params.append('use_absolute_bounds', options.use_absolute_bounds.toString());
    if (options.version) params.append('version', options.version);

    const response: AxiosResponse<FigmaImageResponse> = await this.client.get(`/images/${fileKey}?${params.toString()}`);
    return response.data;
  }

  /**
   * Get comments on a file
   */
  async getComments(fileKeyOrUrl: string): Promise<FigmaCommentsResponse> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    const response: AxiosResponse<FigmaCommentsResponse> = await this.client.get(`/files/${fileKey}/comments`);
    return response.data;
  }

  /**
   * Post a comment on a file
   */
  async postComment(fileKeyOrUrl: string, message: string, options: {
    node_id?: string;
    node_offset?: { x: number; y: number };
  } = {}): Promise<{ id: string }> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    
    const payload: any = { message };
    if (options.node_id) {
      payload.client_meta = {
        node_id: [options.node_id],
        ...(options.node_offset && { node_offset: options.node_offset })
      };
    }

    const response = await this.client.post(`/files/${fileKey}/comments`, payload);
    return response.data;
  }

  /**
   * Reply to a comment
   */
  async replyToComment(fileKeyOrUrl: string, commentId: string, message: string): Promise<{ id: string }> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    
    const payload = {
      message,
      parent_id: commentId
    };

    const response = await this.client.post(`/files/${fileKey}/comments`, payload);
    return response.data;
  }

  /**
   * Get file thumbnail
   */
  async getFileThumbnail(fileKeyOrUrl: string): Promise<string> {
    const fileKey = FigmaApi.extractFileKey(fileKeyOrUrl);
    const file = await this.getFile(fileKey);
    return file.thumbnailUrl;
  }

  /**
   * Search for components in a team library
   */
  async getTeamComponents(teamId: string): Promise<any> {
    const response = await this.client.get(`/teams/${teamId}/components`);
    return response.data;
  }

  /**
   * Get component information
   */
  async getComponent(componentKey: string): Promise<any> {
    const response = await this.client.get(`/components/${componentKey}`);
    return response.data;
  }

  /**
   * Get team styles
   */
  async getTeamStyles(teamId: string): Promise<any> {
    const response = await this.client.get(`/teams/${teamId}/styles`);
    return response.data;
  }

  /**
   * Get style information
   */
  async getStyle(styleKey: string): Promise<any> {
    const response = await this.client.get(`/styles/${styleKey}`);
    return response.data;
  }

  /**
   * Validate access token
   */
  async validateToken(): Promise<boolean> {
    try {
      // Try to make a simple request to validate the token
      await this.client.get('/me');
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user information
   */
  async getMe(): Promise<any> {
    const response = await this.client.get('/me');
    return response.data;
  }

  /**
   * Get team projects
   */
  async getTeamProjects(teamId: string): Promise<any> {
    const response = await this.client.get(`/teams/${teamId}/projects`);
    return response.data;
  }

  /**
   * Get project files
   */
  async getProjectFiles(projectId: string): Promise<any> {
    const response = await this.client.get(`/projects/${projectId}/files`);
    return response.data;
  }

  /**
   * Get node thumbnail as base64
   */
  async getNodeThumbnail(fileKeyOrUrl: string, nodeId: string, options: {
    scale?: number;
    format?: 'jpg' | 'png' | 'svg';
  } = {}): Promise<string | null> {
    try {
      const images = await this.getImages(fileKeyOrUrl, [nodeId], options);
      const imageUrl = images.images[nodeId];
      
      if (!imageUrl) {
        return null;
      }

      // Fetch the image and convert to base64
      const imageResponse = await axios.get(imageUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000 
      });
      
      const base64 = Buffer.from(imageResponse.data).toString('base64');
      const mimeType = options.format === 'jpg' ? 'image/jpeg' : 
                       options.format === 'svg' ? 'image/svg+xml' : 'image/png';
      
      return `data:${mimeType};base64,${base64}`;
    } catch (error) {
      console.error('Failed to get node thumbnail:', error);
      return null;
    }
  }
}