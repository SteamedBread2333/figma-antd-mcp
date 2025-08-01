# 使用示例

本文档展示如何使用集成了 Figma API 的 MCP 服务。

## 前置要求

1. **获取 Figma API 访问令牌**
   - 访问 [Figma 开发者设置](https://www.figma.com/developers/api#access-tokens)
   - 生成个人访问令牌
   - 确保令牌具有 "File content" 和 "Comments" 权限

## 基本使用流程

### 1. 添加 Figma 文件到上下文

```json
{
  "name": "add_figma_file",
  "arguments": {
    "figmaUrl": "https://www.figma.com/file/abc123xyz/MyDesignFile",
    "accessToken": "your-figma-access-token"
  }
}
```

**返回结果：**
- 文件名称和最后修改时间
- 组件、样式和资源的统计信息
- 主要框架的列表和详细信息

### 2. 解析设计文件获取详细数据

```json
{
  "name": "parse_figma_design", 
  "arguments": {
    "figmaUrl": "https://www.figma.com/file/abc123xyz/MyDesignFile",
    "accessToken": "your-figma-access-token",
    "nodeId": "1:2"
  }
}
```

**返回结果：**
- 完整的组件树结构
- 样式和布局信息
- 文本内容和属性

### 3. 获取节点缩略图

```json
{
  "name": "get_figma_node_thumbnail",
  "arguments": {
    "figmaUrl": "https://www.figma.com/file/abc123xyz/MyDesignFile",
    "nodeId": "1:2",
    "accessToken": "your-figma-access-token",
    "scale": 2.0,
    "format": "png"
  }
}
```

### 4. 生成 React 代码

```json
{
  "name": "generate_react_code",
  "arguments": {
    "figmaData": {
      "file": { "name": "Login Form" },
      "components": [/* 解析的组件数据 */],
      "styles": [],
      "assets": []
    },
    "componentName": "LoginForm",
    "outputFormat": "typescript",
    "includeStyles": true,
    "antdVersion": "5.x"
  }
}
```

## 完整工作流程示例

### 从 Figma 到 React 组件的完整流程

1. **添加文件**
   ```bash
   add_figma_file -> 获取文件概览
   ```

2. **解析设计**
   ```bash
   parse_figma_design -> 获取详细的组件数据
   ```

3. **分析组件**
   ```bash
   analyze_antd_components -> 了解可用的 Ant Design 组件
   ```

4. **获取映射建议**
   ```bash
   get_component_mapping -> 获取最佳的组件映射建议
   ```

5. **生成代码**
   ```bash
   generate_react_code -> 生成最终的 React 代码
   ```

6. **验证代码**
   ```bash
   validate_generated_code -> 检查生成代码的质量
   ```

## 评论功能

### 读取现有评论

```json
{
  "name": "read_figma_comments",
  "arguments": {
    "figmaUrl": "https://www.figma.com/file/abc123xyz/MyDesignFile",
    "accessToken": "your-figma-access-token"
  }
}
```

### 发布新评论

```json
{
  "name": "post_figma_comment",
  "arguments": {
    "figmaUrl": "https://www.figma.com/file/abc123xyz/MyDesignFile",
    "message": "这个设计看起来很棒！建议调整按钮的圆角。",
    "accessToken": "your-figma-access-token",
    "nodeId": "1:2"
  }
}
```

## 最佳实践

### 1. 设计准备
- 确保 Figma 文件中的图层命名清晰（如 "Login Button", "Username Input"）
- 使用合理的组件分组和嵌套结构
- 保持设计系统的一致性

### 2. 令牌管理
- 妥善保管 Figma API 令牌
- 定期更新令牌以确保安全性
- 在生产环境中使用环境变量存储令牌

### 3. 代码生成优化
- 首先使用 `add_figma_file` 了解文件结构
- 针对特定节点使用 `parse_figma_design` 获取详细信息
- 利用 `get_component_mapping` 获取最优的组件映射
- 始终验证生成的代码质量

### 4. 协作流程
- 使用评论功能与设计师沟通实现细节
- 通过缩略图功能预览组件外观
- 定期同步最新的设计文件版本

## 错误处理

常见错误及解决方案：

1. **无效的 Figma URL**
   - 确保 URL 格式正确
   - 检查文件是否公开或您有访问权限

2. **API 令牌无效**
   - 验证令牌是否正确
   - 检查令牌是否具有必要权限

3. **节点不存在**
   - 确认节点 ID 是否正确
   - 检查节点是否在指定文件中

4. **网络连接问题**
   - 检查网络连接
   - 确认可以访问 Figma API