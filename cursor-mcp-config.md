# 在前端项目中配置 Figma-Ant Design MCP 服务

## 1. 创建 MCP 配置文件

在你的前端项目根目录创建 `.cursor/mcp_config.json`:

```json
{
  "mcpServers": {
    "figma-antd-generator": {
      "command": "node",
      "args": ["/path/to/figma-antd-mcp/dist/index.js"],
      "env": {
        "FIGMA_API_TOKEN": "your-figma-access-token"
      }
    }
  }
}
```

## 2. 获取 Figma API Token

1. 访问 [Figma Developer Settings](https://www.figma.com/developers/api#access-tokens)
2. 点击 "Create a personal access token"
3. 给token命名，选择权限：
   - ✅ File content (read)
   - ✅ Comments (read/write)
4. 复制生成的token

## 3. 在前端项目中使用

### 方式1: 直接与Cursor AI对话

```
我想将这个Figma设计转换为React组件:
https://www.figma.com/file/abc123/LoginForm

请使用Ant Design组件生成代码，包含以下要求：
- 使用TypeScript
- 响应式设计
- 表单验证
- 现代化的样式
```

### 方式2: 分步骤处理

```
步骤1: 分析Figma文件
请使用add_figma_file工具分析这个设计文件的结构

步骤2: 解析特定组件
请使用parse_figma_design解析登录表单组件
或者使用parse_figma_selection解析选择的元素（推荐）

步骤3: 生成React代码
基于解析的数据，生成一个LoginForm组件
```

### 💡 处理 Figma Selection 的最佳实践

如果你在Figma中选择了特定元素：

1. **获取选择链接**：
   - 在Figma中选择你要的元素
   - 右键 → "Copy link to selection" 或按 `Ctrl/Cmd + L`
   - URL会包含`node-id`参数：`https://www.figma.com/design/FILE_KEY/Title?node-id=123%3A456`

2. **使用专门的工具**：
   ```
   请使用parse_figma_selection解析这个Figma选择：
   https://www.figma.com/design/abc123/MyDesign?node-id=123%3A456
   
   然后生成对应的React组件
   ```

## 4. 实际使用示例

### 示例对话1: 完整流程
```
用户: 我需要根据这个Figma设计创建一个用户卡片组件
https://www.figma.com/file/xyz789/UserProfile

Cursor AI会：
1. 调用add_figma_file分析文件
2. 解析用户卡片设计
3. 映射到合适的Ant Design组件(Card, Avatar, Typography等)
4. 生成完整的React TypeScript代码
5. 提供使用建议和优化建议
```

### 示例对话2: 特定需求
```
用户: 将这个按钮设计转换为Ant Design Button组件，需要支持多种状态
https://www.figma.com/file/button123?node-id=1:23

要求：
- 支持primary, secondary, danger状态
- 包含loading状态
- 响应式大小
- 无障碍访问支持
```

## 5. 常用命令模板

### 分析设计文件
```
请分析这个Figma文件的组件结构：[Figma URL]
使用add_figma_file工具获取概览信息
```

### 生成特定组件
```
根据这个设计生成React组件：[Figma URL]
组件名: [ComponentName]
要求: TypeScript + Ant Design + 响应式
```

### 获取组件缩略图
```
请获取这个节点的缩略图：
文件: [Figma URL]  
节点ID: [node-id]
用于预览设计效果
```

### 代码质量检查
```
请验证这段生成的代码的质量：
[粘贴代码]
```

## 6. 最佳实践

### 设计准备
- 确保Figma图层命名清晰 (如: "Login Button", "Email Input")
- 使用组件和变体功能
- 保持设计系统一致性

### 代码生成优化  
- 先用add_figma_file了解整体结构
- 针对具体组件使用parse_figma_design
- 利用get_component_mapping获得最佳映射
- 始终验证生成的代码质量

### 团队协作
- 使用read_figma_comments了解设计意图
- 通过post_figma_comment与设计师沟通
- 定期同步最新设计版本

## 7. 故障排除

### 常见问题
1. **Token权限不足**: 确保token有File content和Comments权限
2. **文件无法访问**: 检查Figma文件是否公开或已分享
3. **节点ID错误**: 在Figma中右键复制正确的节点链接

### 调试技巧
- 先使用add_figma_file测试连接
- 检查Cursor的MCP连接状态
- 查看生成代码的warnings和suggestions