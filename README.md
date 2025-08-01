# Figma to Ant Design Code Generator (MCP Service)

这是一个基于 Model Context Protocol (MCP) 的服务，能够将 Figma 设计稿转换为标准的 React + TypeScript + Ant Design 代码。该服务直接集成 Figma API，无需依赖外部服务。

## 功能特性

- 🎨 **直接 Figma API 集成**: 直接与 Figma API 交互，获取设计文件和组件信息
- 📋 **文件管理**: 添加、解析和分析 Figma 设计文件
- 🖼️ **节点预览**: 获取设计节点的缩略图和预览
- 💬 **评论系统**: 读取和发布 Figma 文件评论
- ⚛️ **React 代码生成**: 生成符合最佳实践的 React + TypeScript 组件代码
- 🐜 **Ant Design 集成**: 严格遵循 Ant Design 设计规范和 API 文档
- 🔍 **智能组件映射**: 基于设计特征自动匹配最合适的 Ant Design 组件
- ✅ **代码质量验证**: 内置代码质量检查和最佳实践建议
- 🎯 **高精度转换**: 通过分析 Ant Design 源码确保生成结果的准确性

## 架构设计

### 核心模块

1. **Figma API 集成** (`src/parsers/figma-api.ts`)
   - 直接与 Figma REST API 交互
   - 处理认证和错误处理
   - 支持文件、节点、图片和评论操作

2. **Figma Parser** (`src/parsers/figma-parser.ts`)
   - 解析设计文件的组件树结构
   - 提取布局、样式和内容信息
   - 生成结构化的设计数据

3. **Ant Design Analyzer** (`src/analyzers/antd-analyzer.ts`)
   - 分析 Ant Design 组件库源码
   - 提取组件 API 和属性定义
   - 生成组件使用模式和示例

4. **Code Generator** (`src/generators/code-generator.ts`)
   - 智能映射 Figma 元素到 Ant Design 组件
   - 生成 React + TypeScript 代码
   - 处理样式转换和属性映射

5. **Code Validator** (`src/validators/code-validator.ts`)
   - 验证生成代码的正确性
   - 检查 Ant Design 最佳实践
   - 提供代码质量评分和改进建议

## 安装和使用

### 环境要求

- Node.js >= 18
- TypeScript >= 5.0
- Git (用于子模块管理)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <repository-url>
   cd figma-antd-mcp
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **初始化 Ant Design 子模块**
   ```bash
   git submodule update --init --recursive
   ```

4. **构建项目**
   ```bash
   npm run build
   ```

5. **启动服务**
   ```bash
   npm start
   ```

### MCP 工具使用

服务提供以下 MCP 工具：

#### Figma 文件操作

##### 1. `add_figma_file`
添加 Figma 文件到上下文

```json
{
  "figmaUrl": "https://www.figma.com/file/abc123/MyFile",
  "accessToken": "figma-access-token"
}
```

##### 2. `parse_figma_design`
解析 Figma 设计文件

```json
{
  "figmaUrl": "https://www.figma.com/file/abc123/MyFile",
  "accessToken": "figma-access-token",
  "nodeId": "optional-node-id"
}
```

##### 3. `get_figma_node_thumbnail`
获取节点缩略图

```json
{
  "figmaUrl": "https://www.figma.com/file/abc123/MyFile",
  "nodeId": "1:2",
  "accessToken": "figma-access-token",
  "scale": 2.0,
  "format": "png"
}
```

#### 评论功能

##### 4. `read_figma_comments`
读取文件评论

```json
{
  "figmaUrl": "https://www.figma.com/file/abc123/MyFile",
  "accessToken": "figma-access-token"
}
```

##### 5. `post_figma_comment`
发布评论

```json
{
  "figmaUrl": "https://www.figma.com/file/abc123/MyFile",
  "message": "This looks great!",
  "accessToken": "figma-access-token",
  "nodeId": "optional-node-id"  
}
```

#### 代码生成

##### 6. `analyze_antd_components`
分析 Ant Design 组件

```json
{
  "componentNames": ["Button", "Input", "Card"],
  "includeExamples": true
}
```

##### 7. `generate_react_code`
生成 React 代码

```json
{
  "figmaData": {...},
  "componentName": "MyComponent",
  "outputFormat": "typescript",
  "includeStyles": true,
  "antdVersion": "5.x"
}
```

##### 8. `validate_generated_code`
验证生成的代码

```json
{
  "code": "React component code",
  "strict": true
}
```

##### 9. `get_component_mapping`
获取组件映射建议

```json
{
  "figmaNode": {...},
  "context": "form input field"
}
```

## 开发指南

### 项目结构

```
src/
├── types/           # TypeScript 类型定义
│   ├── figma.ts     # Figma API 类型
│   └── antd.ts      # Ant Design 类型
├── parsers/         # 解析器模块
│   └── figma-parser.ts
├── analyzers/       # 分析器模块
│   └── antd-analyzer.ts
├── generators/      # 代码生成器
│   └── code-generator.ts
├── validators/      # 代码验证器
│   └── code-validator.ts
├── utils/           # 工具函数
│   └── formatter.ts
└── index.ts         # MCP 服务入口
```

### 代码生成流程

1. **文件获取**: 直接从 Figma API 获取设计文件数据
2. **设计解析**: Figma Parser 解析设计文件，提取组件信息
3. **组件分析**: Ant Design Analyzer 分析相关组件的 API 和用法
4. **智能映射**: 根据设计特征匹配最适合的 Ant Design 组件
5. **代码生成**: 生成符合规范的 React + TypeScript 代码
6. **质量验证**: 验证代码质量并提供改进建议

### Figma API 功能

- **文件访问**: 获取完整的设计文件结构和元数据
- **节点操作**: 读取特定节点的详细信息和属性
- **图像导出**: 生成节点的缩略图和高质量图像
- **评论管理**: 读取现有评论和发布新评论
- **实时同步**: 支持获取最新的文件版本和更改

### 组件映射规则

系统使用以下规则进行智能组件映射：

- **类型匹配**: 根据 Figma 节点类型匹配组件类型
- **命名匹配**: 分析节点名称中的关键词
- **特征匹配**: 根据样式特征（如边框、阴影、背景等）匹配
- **上下文匹配**: 考虑组件在设计中的使用场景

### 扩展开发

#### 添加新的组件映射规则

在 `src/generators/code-generator.ts` 中的 `initializeComponentMappings` 方法中添加新规则：

```typescript
{
  figmaType: 'FRAME',
  figmaName: 'custom-component',
  antdComponent: 'CustomComponent',
  confidence: 0,
  rules: [
    { condition: 'custom_condition', action: 'increase_confidence', weight: 50 },
  ],
}
```

#### 添加新的验证规则

创建新的验证规则类并继承 `ValidationRule`：

```typescript
class CustomValidationRule extends ValidationRule {
  async validate(code: ParsedCode, config: ValidationOptions) {
    // 实现验证逻辑
    return { errors: [], warnings: [], suggestions: [] };
  }
}
```

## 最佳实践

### Figma 设计准备

1. **规范命名**: 使用有意义的图层名称，便于组件映射
2. **组件化设计**: 合理使用 Figma 组件和变体功能
3. **一致性样式**: 保持设计系统的一致性

### 代码生成优化

1. **提供上下文**: 在映射时提供详细的使用场景描述
2. **验证结果**: 始终验证生成的代码质量
3. **手动调优**: 根据验证建议进行手动优化

## 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交变更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 致谢

- [Ant Design](https://ant.design/) - 优秀的 React UI 组件库
- [Figma API](https://www.figma.com/developers/api) - 强大的设计工具 API
- [Model Context Protocol](https://modelcontextprotocol.io/) - 先进的 AI 协作协议