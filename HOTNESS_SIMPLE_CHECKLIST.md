# AI Social 热度系统简化清单

## 🎯 当前状态
- ✅ TypeScript 错误修复完成
- ✅ 基础热度计算已就绪
- 🔄 需要完善功能

## 📋 下一步做什么

### 今天要做（优先级1）
- [ ] **添加热点推荐API** - 创建 `/api/hotness/trending`
  ```typescript
  // 简单实现：
  router.get('/trending', async (c) => {
    const hotness = new HotnessService(RedisService.fromEnv(c.env));
    const top = await hotness.getTopHotArtworks(20);
    return c.json({ data: top });
  });
  ```

- [ ] **前端集成热点页面** - 在 feed 页面添加热点标签
  ```typescript
  // 简单组件：
  const TrendingTab = () => {
    const { data } = useSWR('/api/hotness/trending');
    return <ArtworkGrid artworks={data} />;
  };
  ```

### 明天要做（优先级2）
- [ ] **防刷保护** - 添加简单限频
- [ ] **调试工具** - 查看作品热度详情

### 本周要做（优先级3）
- [ ] **性能优化** - 添加缓存
- [ ] **前端美化** - 热度图标

## 🔧 快速检查

| 检查项 | 状态 | 备注 |
|--------|------|------|
| 热度计算正常 | ✅ | 已测试 |
| API无错误 | ✅ | TypeScript通过 |
| Redis连接正常 | ✅ | 开发环境 |
| 前端可调用 | 🔄 | 待完成 |

## 🚀 立即执行

1. **运行测试**：`cd apps/worker-api && npm run dev`
2. **访问调试**：`http://localhost:8787/api/debug`
3. **查看热度**：`http://localhost:8787/api/hotness/trending`

## 📞 有问题时
- 看错误日志：`wrangler tail`
- 检查Redis：`curl http://localhost:8787/api/redis/ping`
- 重启服务：`npm run dev` (重新运行)

---
简化版 - 专注核心功能