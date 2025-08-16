# 任务-04（中优先级）- 缓存策略与一致性（Feed/用户作品 + Likes/Favorites）

## 提示词（先读）
- 你的任务：为 Feed 与用户作品列表增加 Redis 缓存（TTL），并在写入（发布/点赞/收藏）时失效相关 Key；同时设计 likes/favorites 与 D1 的一致性校验与回写策略。

## 执行步骤
1) Key 设计
- `feed:list`、`user:{id}:artworks`、`user:{id}:favorites`；TTL 5–15 分钟。

2) 读写流程
- 读：先查 Redis，未命中查 D1 并回填。
- 写：发布/点赞/收藏时，失效相关 Key（如 `feed:list`、`user:{id}:artworks`、`artwork:{id}:likes`）。

3) 一致性
- 点赞/收藏已同步 D1 + Redis；补充一个定时校验（D1 ↔ Redis）脚本，发现偏差则回写修正或报警。

## 示例（伪代码）
```ts
// 读缓存
const cache = await redis.get('feed:list')
if (cache) return c.json(JSON.parse(cache))
const list = await d1.listFeed(limit)
await redis.setex('feed:list', JSON.stringify(list), 600)
return c.json(list)
```

## 验收清单
- 缓存命中率提升；写操作后相关 Key 被正确失效。
- 定时一致性校验脚本可运行并输出报告。
