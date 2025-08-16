# 任务-05（中优先级）- slug 持久化与数据迁移

## 提示词（先读）
- 你的任务：为 `artworks` 表新增 `slug` 字段与唯一索引，迁移现有数据，并统一前后端使用持久化的 slug。

## 执行步骤
1) D1 迁移
- 新增列：`ALTER TABLE artworks ADD COLUMN slug TEXT;`
- 数据回填：根据 `title` 生成 slug（去特殊字符、连字符）；冲突时追加短 id。
- 唯一索引：D1 暂不支持传统索引；通过应用层保证唯一（或额外维护索引表）。

2) 服务与路由
- `D1Service.getArtwork/list*` 返回 DB 中的 `slug`（不再运行时生成）。
- 前端路由 `/artwork/:id/:slug` 使用该字段；详情仍以 `id` 为主键查询。

## 示例（伪代码）
```sql
-- 迁移
ALTER TABLE artworks ADD COLUMN slug TEXT;
-- 回填(slugify)
```

## 验收清单
- DB 中 `slug` 有值且唯一；页面 URL 稳定。
- 新增作品自动写入 slug；类型检查与回归通过。
