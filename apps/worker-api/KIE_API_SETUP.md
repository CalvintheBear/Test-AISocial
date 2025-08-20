# KIE Flux Kontext API 集成配置指南

## 🚀 快速开始

### 1. 获取API密钥
1. 访问 [KIE API Dashboard](https://docs.kie.ai/)
2. 注册账户并获取API密钥
3. 将API密钥添加到环境变量

### 2. 环境变量配置

#### 生产环境 (Cloudflare Workers)
```bash
# 使用 wrangler secrets 命令
wrangler secret put KIE_API_KEY
# 输入你的KIE API密钥
```

#### 开发环境
1. 复制 `.dev.vars.example` 为 `.dev.vars`
2. 填入实际值：
```bash
KIE_API_KEY=your_actual_api_key_here
DEV_MODE=1
```

### 3. 数据库迁移
```bash
# 应用KIE相关数据库迁移
wrangler d1 execute test-d1 --file=./migrations/003_add_kie_fields.sql
```

## 🔧 配置说明

### wrangler.toml 配置
```toml
[vars]
# KIE API 配置
KIE_API_BASE_URL = "https://api.kie.ai/api/v1/flux/kontext"
KIE_DEFAULT_MODEL = "flux-kontext-pro"
KIE_DEFAULT_ASPECT_RATIO = "1:1"
KIE_DEFAULT_OUTPUT_FORMAT = "jpeg"
KIE_DEFAULT_SAFETY_TOLERANCE = "2"
```

### 支持的模型
- `flux-kontext-pro`: 标准模型，适用于大多数场景，性价比高
- `flux-kontext-max`: 增强模型，适用于复杂场景，质量更高

### 支持的宽高比
- `1:1` (正方形) ⬜
- `16:9` (横屏) 🖥️
- `9:16` (竖屏) 📱
- `4:3` (传统横屏) 📺
- `3:4` (传统竖屏) 📱

### 支持的输出格式
- `png`: 无损压缩，质量更好，文件较大（默认）
- `jpeg`: 有损压缩，文件较小，质量稍差

## 📡 API端点

### 图像生成
```
POST /api/artworks/generate
```

请求体：
```json
{
  "prompt": "A serene mountain landscape at sunset",
  "aspectRatio": "16:9",
  "model": "flux-kontext-pro"
}
```

### 生成状态查询
```
GET /api/artworks/:id/generation-status
```

### 重新生成
```
POST /api/artworks/:id/regenerate
```

### KIE回调处理
```
POST /api/kie/kie-callback
```

## 🔄 工作流程

1. **用户提交生成请求**
   - 前端调用 `/api/artworks/generate`
   - 后端创建草稿记录
   - 调用KIE API启动生成任务

2. **异步生成处理**
   - KIE API处理图像生成
   - 生成完成后发送回调到 `/api/kie/kie-callback`

3. **状态更新**
   - 回调处理器更新数据库状态
   - 清除相关缓存
   - 发布完成通知到Redis

4. **前端状态同步**
   - 前端轮询生成状态
   - 或通过WebSocket/SSE接收实时更新

## ⚠️ 重要注意事项

### 回调URL配置
- 回调URL必须是公网可访问的地址
- 建议使用HTTPS协议
- 回调处理必须在15秒内响应

### 图像URL过期
- 原始图像URL有效期为10分钟
- 生成图像URL有效期为14天
- 建议及时下载并存储到R2

### 错误处理
- 内容策略违规 (code: 400)
- 内部错误 (code: 500)
- 生成失败 (code: 501)

### 超时设置
- 生成超时：15分钟
- 状态查询间隔：5秒
- 最大轮询次数：120次

## 🧪 测试

### 本地测试
```bash
# 启动本地开发服务器
wrangler dev

# 测试健康检查
curl http://localhost:8787/api/health

# 测试Redis连接
curl http://localhost:8787/api/redis/ping
```

### 生产部署
```bash
# 部署到Cloudflare Workers
wrangler deploy

# 验证环境变量
wrangler secret list
```

## 📚 相关文档

- [KIE API 官方文档](https://docs.kie.ai/flux-kontext-api/)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [D1 数据库文档](https://developers.cloudflare.com/d1/)

## 🆘 故障排除

### 常见问题

1. **API密钥无效**
   - 检查环境变量配置
   - 验证API密钥是否正确

2. **回调接收失败**
   - 检查回调URL是否公网可访问
   - 验证防火墙设置
   - 检查服务器响应时间

3. **生成超时**
   - 检查网络连接
   - 验证API配额
   - 调整超时设置

4. **数据库错误**
   - 检查迁移是否已应用
   - 验证数据库连接
   - 检查表结构

### 日志查看
```bash
# 查看实时日志
wrangler tail

# 查看特定时间段的日志
wrangler tail --format=pretty
```
