#!/usr/bin/env node

/**
 * Figma to Ant Design Code Generator MCP Server
 * 
 * This MCP server provides tools for converting Figma designs to React + TypeScript + Ant Design code.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ErrorCode,
} from '@modelcontextprotocol/sdk/types.js';
import { FigmaParser, ParsedComponent } from './parsers/figma-parser.js';
import { AntdAnalyzer } from './analyzers/antd-analyzer.js';
import { CodeGenerator } from './generators/code-generator.js';
import { CodeValidator } from './validators/code-validator.js';
import { FigmaComment, FigmaApi } from './parsers/figma-api.js';

/**
 * Create and configure the MCP server
 */
async function createServer() {
  const server = new Server(
    {
      name: 'figma-antd-generator',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Initialize analyzers and generators
  const figmaParser = new FigmaParser();
  const antdAnalyzer = new AntdAnalyzer();
  const codeGenerator = new CodeGenerator(antdAnalyzer);
  const codeValidator = new CodeValidator();

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'parse_figma_design',
          description: 'Parse a Figma design file and extract component information',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL or file key (e.g., https://www.figma.com/file/abc123/MyFile)',
              },
              nodeId: {
                type: 'string',
                description: 'Optional specific node ID to parse (defaults to entire document)',
              },
              accessToken: {
                type: 'string',
                description: 'Figma API access token',
              },
            },
            required: ['figmaUrl', 'accessToken'],
          },
        },
        {
          name: 'add_figma_file',
          description: 'Add a Figma file to the context for analysis',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL (e.g., https://www.figma.com/file/abc123/MyFile)',
              },
              accessToken: {
                type: 'string',
                description: 'Figma API access token',
              },
            },
            required: ['figmaUrl', 'accessToken'],
          },
        },
        {
          name: 'get_figma_node_thumbnail',
          description: 'Get a thumbnail image for a specific node in a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL or file key',
              },
              nodeId: {
                type: 'string',
                description: 'Node ID to get thumbnail for',
              },
              accessToken: {
                type: 'string',
                description: 'Figma API access token',
              },
              scale: {
                type: 'number',
                description: 'Image scale factor (default: 1.0)',
                default: 1.0,
              },
              format: {
                type: 'string',
                enum: ['png', 'jpg', 'svg'],
                description: 'Image format (default: png)',
                default: 'png',
              },
            },
            required: ['figmaUrl', 'nodeId', 'accessToken'],
          },
        },
        {
          name: 'read_figma_comments',
          description: 'Read all comments on a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL or file key',
              },
              accessToken: {
                type: 'string',
                description: 'Figma API access token',
              },
            },
            required: ['figmaUrl', 'accessToken'],
          },
        },
        {
          name: 'post_figma_comment',
          description: 'Post a comment on a Figma file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Figma file URL or file key',
              },
              message: {
                type: 'string',
                description: 'Comment message',
              },
              accessToken: {
                type: 'string',
                description: 'Figma API access token',
              },
              nodeId: {
                type: 'string',
                description: 'Optional node ID to attach comment to',
              },
            },
            required: ['figmaUrl', 'message', 'accessToken'],
          },
        },
        {
          name: 'analyze_antd_components',
          description: 'Analyze Ant Design components and their properties',
          inputSchema: {
            type: 'object',
            properties: {
              componentNames: {
                type: 'array',
                items: { type: 'string' },
                description: 'List of Ant Design component names to analyze',
              },
              includeExamples: {
                type: 'boolean',
                description: 'Whether to include usage examples',
                default: true,
              },
            },
            required: ['componentNames'],
          },
        },
        {
          name: 'generate_react_code',
          description: 'Generate React + TypeScript + Ant Design code from parsed Figma design',
          inputSchema: {
            type: 'object',
            properties: {
              figmaData: {
                type: 'object',
                description: 'Parsed Figma design data',
              },
              componentName: {
                type: 'string',
                description: 'Name for the generated React component',
              },
              outputFormat: {
                type: 'string',
                enum: ['typescript', 'javascript'],
                description: 'Output code format',
                default: 'typescript',
              },
              includeStyles: {
                type: 'boolean',
                description: 'Whether to include CSS-in-JS styles',
                default: true,
              },
              antdVersion: {
                type: 'string',
                description: 'Target Ant Design version (e.g., "5.x")',
                default: '5.x',
              },
            },
            required: ['figmaData', 'componentName'],
          },
        },
        {
          name: 'validate_generated_code',
          description: 'Validate and check the quality of generated code',
          inputSchema: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Generated React code to validate',
              },
              strict: {
                type: 'boolean',
                description: 'Enable strict validation rules',
                default: true,
              },
            },
            required: ['code'],
          },
        },
        {
          name: 'parse_figma_selection',
          description: 'Parse a specific Figma selection/node from a file',
          inputSchema: {
            type: 'object',
            properties: {
              figmaUrl: {
                type: 'string',
                description: 'Complete Figma selection URL with node-id (e.g., https://www.figma.com/design/abc123/Title?node-id=123%3A456)',
              },
              accessToken: {
                type: 'string',
                description: 'Figma API access token',
              },
            },
            required: ['figmaUrl', 'accessToken'],
          },
        },
        {
          name: 'get_component_mapping',
          description: 'Get mapping suggestions between Figma elements and Ant Design components',
          inputSchema: {
            type: 'object',
            properties: {
              figmaNode: {
                type: 'object',
                description: 'Figma node to find mapping for',
              },
              context: {
                type: 'string',
                description: 'Additional context about the intended use',
              },
            },
            required: ['figmaNode'],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'parse_figma_design': {
          const { figmaUrl, nodeId, accessToken } = args as {
            figmaUrl: string;
            nodeId?: string;
            accessToken: string;
          };

          const result = await figmaParser.parseFile(figmaUrl, accessToken, nodeId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'add_figma_file': {
          const { figmaUrl, accessToken } = args as {
            figmaUrl: string;
            accessToken: string;
          };

          // Initialize the parser with the access token
          figmaParser.initialize(accessToken);
          
          // Parse the file to get basic information
          const result = await figmaParser.parseFile(figmaUrl, accessToken);
          
          // Return a summary of the file
          const summary = {
            name: result.file.name,
            lastModified: result.file.lastModified,
            componentsCount: result.components.length,
            stylesCount: result.styles.length,
            assetsCount: result.assets.length,
            mainFrames: result.components
              .filter((c: ParsedComponent) => c.type === 'FRAME' && c.children && c.children.length > 0)
              .map((c: ParsedComponent) => ({
                id: c.id,
                name: c.name,
                width: c.layout.width,
                height: c.layout.height,
                childrenCount: c.children?.length || 0
              }))
              .slice(0, 10) // Limit to first 10 frames
          };

          return {
            content: [
              {
                type: 'text',
                text: `Successfully added Figma file: ${result.file.name}\n\n` +
                      `File Summary:\n` +
                      `- Last Modified: ${result.file.lastModified}\n` +
                      `- Components: ${summary.componentsCount}\n` +
                      `- Styles: ${summary.stylesCount}\n` +
                      `- Assets: ${summary.assetsCount}\n\n` +
                      `Main Frames:\n` +
                      summary.mainFrames.map((f: any) => 
                        `- ${f.name} (${f.width}×${f.height}) - ${f.childrenCount} children`
                      ).join('\n') +
                      (summary.mainFrames.length === 10 ? '\n... and more' : ''),
              },
            ],
          };
        }

        case 'get_figma_node_thumbnail': {
          const { figmaUrl, nodeId, accessToken, scale = 1.0, format = 'png' } = args as {
            figmaUrl: string;
            nodeId: string;
            accessToken: string;
            scale?: number;
            format?: 'png' | 'jpg' | 'svg';
          };

          // Initialize the parser if needed
          if (!figmaParser['figmaApi']) {
            figmaParser.initialize(accessToken);
          }

          try {
            // Normalize figmaUrl - handle both full URLs and file keys
            let normalizedUrl = figmaUrl;
            if (!figmaUrl.includes('figma.com')) {
              // If it's just a file key, construct a proper URL
              normalizedUrl = `https://www.figma.com/file/${figmaUrl}/`;
            }

            console.log(`🖼️ Getting thumbnail for node ${nodeId} from ${normalizedUrl}`);
            const thumbnail = await figmaParser['figmaApi']!.getNodeThumbnail(normalizedUrl, nodeId, { scale, format });
            
            if (!thumbnail) {
              // Try alternative approach for large files
              console.log('⚠️ Direct thumbnail failed, trying alternative approach...');
              
              return {
                content: [
                  {
                    type: 'text',
                    text: `Thumbnail generation failed for node ${nodeId}. This may be due to:\n` +
                          `1. The node is part of a large design system file\n` +
                          `2. The node requires special permissions\n` +
                          `3. The image generation service is temporarily unavailable\n\n` +
                          `Alternative: You can view this node directly in Figma using the selection URL.`,
                  },
                ],
              };
            }

            console.log(`✅ Successfully generated thumbnail for node ${nodeId}`);
            return {
              content: [
                {
                  type: 'image',
                  data: thumbnail,
                  mimeType: format === 'jpg' ? 'image/jpeg' : 
                           format === 'svg' ? 'image/svg+xml' : 'image/png',
                },
              ],
            };
          } catch (error) {
            console.error(`❌ Thumbnail generation error for node ${nodeId}:`, error);
            
            return {
              content: [
                {
                  type: 'text',
                  text: `Unable to generate thumbnail for node ${nodeId}.\n\n` +
                        `Error: ${error instanceof Error ? error.message : String(error)}\n\n` +
                        `This is common with large design system files. ` +
                        `You can still use the parsed component data to generate React code.`,
                },
              ],
            };
          }
        }

        case 'read_figma_comments': {
          const { figmaUrl, accessToken } = args as {
            figmaUrl: string;
            accessToken: string;
          };

          // Initialize the parser if needed
          if (!figmaParser['figmaApi']) {
            figmaParser.initialize(accessToken);
          }

          const comments = await figmaParser['figmaApi']!.getComments(figmaUrl);
          
          return {
            content: [
              {
                type: 'text',
                text: `Comments on Figma file:\n\n` +
                      comments.comments.map((comment: FigmaComment) => 
                        `**${comment.user.handle}** (${comment.created_at}):\n` +
                        `${comment.message}\n` +
                        (comment.resolved_at ? `✅ Resolved at ${comment.resolved_at}\n` : '') +
                        `---`
                      ).join('\n\n'),
              },
            ],
          };
        }

        case 'post_figma_comment': {
          const { figmaUrl, message, accessToken, nodeId } = args as {
            figmaUrl: string;
            message: string;
            accessToken: string;
            nodeId?: string;
          };

          // Initialize the parser if needed
          if (!figmaParser['figmaApi']) {
            figmaParser.initialize(accessToken);
          }

          const options = nodeId ? { node_id: nodeId } : {};
          const result = await figmaParser['figmaApi']!.postComment(figmaUrl, message, options);
          
          return {
            content: [
              {
                type: 'text',
                text: `Successfully posted comment (ID: ${result.id})\n${nodeId ? `Attached to node: ${nodeId}` : 'General file comment'}`,
              },
            ],
          };
        }

        case 'analyze_antd_components': {
          const { componentNames, includeExamples = true } = args as {
            componentNames: string[];
            includeExamples?: boolean;
          };

          const result = await antdAnalyzer.analyzeComponents(componentNames, includeExamples);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'generate_react_code': {
          const { 
            figmaData, 
            componentName, 
            outputFormat = 'typescript',
            includeStyles = true,
            antdVersion = '5.x'
          } = args as {
            figmaData: any;
            componentName: string;
            outputFormat?: 'typescript' | 'javascript';
            includeStyles?: boolean;
            antdVersion?: string;
          };

          const result = await codeGenerator.generateComponent({
            figmaData,
            componentName,
            outputFormat,
            includeStyles,
            antdVersion,
          });

          return {
            content: [
              {
                type: 'text',
                text: result.code,
              },
            ],
          };
        }

        case 'validate_generated_code': {
          const { code, strict = true } = args as {
            code: string;
            strict?: boolean;
          };

          const result = await codeValidator.validate(code, { strict });
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'parse_figma_selection': {
          const { figmaUrl, accessToken } = args as {
            figmaUrl: string;
            accessToken: string;
          };

          // Extract node ID from the URL
          const nodeId = FigmaApi.extractNodeId(figmaUrl);
          if (!nodeId) {
            return {
              content: [
                {
                  type: 'text',
                  text: `Error: No node-id found in URL. Please use "Copy link to selection" in Figma to get the complete URL.\n\nExpected format: https://www.figma.com/design/FILE_KEY/Title?node-id=123%3A456\n\nYour URL: ${figmaUrl}`,
                },
              ],
            };
          }

          // Parse the specific node
          const result = await figmaParser.parseFile(figmaUrl, accessToken, nodeId);
          
          // Filter to only the selected node and its children
          const selectedComponents = result.components.filter((c: ParsedComponent) => 
            c.id === nodeId || c.id.startsWith(nodeId)
          );

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  ...result,
                  components: selectedComponents,
                  selection: {
                    nodeId,
                    componentsFound: selectedComponents.length
                  }
                }, null, 2),
              },
            ],
          };
        }

        case 'get_component_mapping': {
          const { figmaNode, context } = args as {
            figmaNode: any;
            context?: string;
          };

          const result = await codeGenerator.getComponentMapping(figmaNode, context);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${name}`
          );
      }
    } catch (error) {
      throw new McpError(
        ErrorCode.InternalError,
        `Error executing tool ${name}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  });

  return server;
}

/**
 * Main entry point
 */
async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Figma Ant Design Generator MCP server running on stdio');
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}