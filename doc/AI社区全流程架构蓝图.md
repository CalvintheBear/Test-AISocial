AI社区全流程架构蓝图

---

## **完整开发蓝图内容**

> 当前实现进度（基于本仓库现状）
> - 前端页面/组件：已完成初版。`/`、`/features`、`/feed`、`/user/:username`、`/artwork/:id/:slug` 均已实现并具备 SEO 元信息；样式系统（设计 Token + Tailwind 扩展）与 UI 组件（Button/Card/Badge/Tabs/Header/Sidebar/Toast/Skeleton）已落地。
> - 数据与交互：目前通过 `public/mocks/*.json` 驱动 SSR/RSC 页面。`useLike / useFavorite / usePublish` 等 hooks 已就绪，但尚未接入后端；`authFetch` 已封装（JWT 注入待接入 Clerk）。
> - 后端与基础设施：Cloudflare Workers API、D1、R2、Redis、Cron、Clerk 鉴权均未开始对接。
> - API 设计同步：前端已实现点赞/收藏撤销（DELETE），本蓝图已补充相应接口；返回体当前以前端直返数据为主，后端落地时可先直返，后续再统一包装。

### 1. 系统架构图

* 前端组件：

  * 登录按钮 `/login`
  * 生成 / 上传表单（非公开）
  * 发布按钮
  * 点赞 / 收藏按钮
  * 用户作品列表 `/user/:username`
  * 推荐页 Feed `/feed`
  * 单个作品页 `/artwork/:id/:slug`
  * 营销落地页 `/`
  * 功能介绍页 `/features`
* 后端 Workers API：

  * 生成 / 上传 / 发布 / 点赞 / 收藏 / 获取作品 / Feed
* AI 接口：

  * 生成作品临时文件
* 数据存储：

  * Cloudflare R2（原图 / 缩略图）
  * D1 数据库表（users, artworks, artworks_like, artworks_favorite）
* 缓存：

  * Redis（热度榜、用户作品列表、收藏列表、feed 队列、点赞计数）
* 异步任务：

  * 缩略图生成
  * Feed 更新
* SEO & 加载优化：

  * SSR 首屏渲染
  * 图片 / 视频懒加载
  * SEO meta 标签
* 前端状态映射：

  * draft → published
  * 收藏高亮
  * 点赞计数
  * 自动显示生成作品

---

### 2. API 对照表

| API 路径                      | 方法    | 功能          | 请求参数                        | 返回字段                             |
| ----------------------------- | ------ | ------------ | ------------------------------- | ----------------------------------- |
| /api/auth/login               | POST   | Google 登录   | OAuth token                      | JWT, user info                      |
| /api/artworks/generate        | POST   | 生成 AI 作品   | prompt, file(optional), JWT     | artwork_id, url, status:draft       |
| /api/artworks/upload          | POST   | 上传图片/视频  | file, JWT                       | artwork_id, url                     |
| /api/artworks/:id/publish     | POST   | 发布作品       | artwork_id, JWT                 | status:published                     |
| /api/artworks/:id/like       | POST   | 点赞作品       | artwork_id, JWT                 | like_count, isLiked                  |
| /api/artworks/:id/like       | DELETE | 取消点赞       | artwork_id, JWT                 | like_count, isLiked                  |
| /api/artworks/:id/favorite   | POST   | 收藏作品       | artwork_id, JWT                 | is_favorite                          |
| /api/artworks/:id/favorite   | DELETE | 取消收藏       | artwork_id, JWT                 | is_favorite                          |
| /api/users/:id/artworks      | GET    | 获取用户作品   | user_id, JWT                    | artwork list                         |
| /api/feed                     | GET    | 推荐页 / Feed | JWT                              | artwork list                         |
| /api/artworks/:id            | GET    | 单个作品详情   | id(path), JWT                   | artwork info (+ author)             |
| /api/users/:id/favorites     | GET    | 获取收藏列表   | user_id, JWT                    | artwork list                         |

注：当前前端实现预期“直返数据结构”（如 `ArtworkListItem[]` / `ArtworkDetail`），未统一使用 `{ success, data }` 包装；后端可先直返，后续再统一响应格式。

---

### 3. 数据库（D1）表字段

| 表名                 | 字段                                            | 说明                           |
| ------------------ | --------------------------------------------- | ---------------------------- |
| users              | id, name, email, profile_pic                 | 用户信息                         |
| artworks           | id, user_id, title, url, status, created_at | 作品信息，status:draft/published |
| artworks_like     | user_id, artwork_id, created_at            | 点赞记录                         |
| artworks_favorite | user_id, artwork_id, created_at            | 收藏记录                         |

---

### 4. Redis Key / 数据类型

| Key                        | 数据类型        | 说明        |
| -------------------------- | ----------- | --------- |
| user:{user_id}:artworks  | list        | 用户作品列表    |
| user:{user_id}:favorites | set         | 用户收藏作品    |
| hot_rank                  | sorted set  | 全站热度榜     |
| feed_queue                | list        | Feed 队列   |
| artwork:{id}:likes        | int / score | 点赞计数 / 热度 |

---

### 5. R2 文件路径

| 路径                        | 类型      | 用途                  |
| ------------------------- | ------- | ------------------- |
| /artworks/original/:uuid | 原图 / 视频 | AI生成或上传原文件          |
| /artworks/thumb/:uuid    | 缩略图     | 异步任务生成，用于 feed / 列表 |

---

### 6. 时序图（用户操作到前端显示）

```mermaid
sequenceDiagram
    participant User as 用户
    participant Frontend as 前端组件
    participant Clerk as Clerk
    participant WorkerGen as 生成/上传 API
    participant WorkerPub as 发布 API
    participant WorkerLike as 点赞/收藏 API
    participant WorkerFetch as 获取作品 / Feed API
    participant AI as AI 接口
    participant R2 as Cloudflare R2
    participant D1 as D1 数据库
    participant Redis as Upstash Redis
    participant Cron as 异步任务

    %% 用户登录
    User->>LoginBtn: 点击登录
    LoginBtn->>Clerk: OAuth token
    Clerk-->>Frontend: JWT + user info

    %% 用户生成作品
    User->>GenForm: 填写 prompt + 点击生成
    GenForm->>WorkerGen: POST /api/artworks/generate
    WorkerGen->>Clerk: 验证 JWT
    WorkerGen->>AI: 生成作品临时文件
    AI-->>WorkerGen: 生成完成
    WorkerGen->>R2: 上传原图
    WorkerGen->>D1: 写入 artworks (status:draft)
    WorkerGen->>Redis: 更新 user:{id}:artworks + hot_rank + feed_queue
    WorkerGen-->>Frontend: 返回作品信息
    Frontend-->>ProfileList: 自动显示 draft 作品

    %% 用户发布作品
    User->>PublishBtn: 点击发布
    PublishBtn->>WorkerPub: POST /api/artworks/:id/publish
    WorkerPub->>Clerk: 验证 JWT
    WorkerPub->>D1: 更新 status=draft->published
    WorkerPub->>Redis: 更新热度榜 + feed_queue
    WorkerPub->>Cron: 触发异步任务
    Cron->>R2: 生成缩略图
    Cron->>Redis: 更新 feed 缓存
    WorkerPub-->>Frontend: 返回已发布状态
    Frontend-->>FeedList: 更新推荐页

    %% 点赞 / 收藏
    User->>LikeBtn: 点击点赞
    LikeBtn->>WorkerLike: POST /api/artworks/:id/like
    WorkerLike->>Clerk: 验证 JWT
    WorkerLike->>D1: 更新 artworks_like
    WorkerLike->>Redis: 更新 artwork:{id}:likes
    WorkerLike-->>Frontend: 更新点赞计数
    Frontend-->>ProfileList: 高亮点赞
    Frontend-->>FeedList: 更新点赞显示

    User->>FavBtn: 点击收藏
    FavBtn->>WorkerLike: POST /api/artworks/:id/favorite
    WorkerLike->>D1: 更新 artworks_favorite
    WorkerLike->>Redis: 更新 user:{id}:favorites
    WorkerLike-->>Frontend: 收藏高亮
    Frontend-->>ProfileList: 更新收藏状态
    Frontend-->>FeedList: 更新收藏状态

    %% 浏览 Feed / 用户页
    User->>FeedList: 打开 Feed / 用户页
    FeedList->>WorkerFetch: GET /api/feed or /api/users/:id/artworks
    WorkerFetch->>Redis: 读取缓存
    alt Redis 命中
        Redis-->>WorkerFetch: 返回数据
    else 缓存未命中
        WorkerFetch->>D1: 查询数据库
        D1-->>WorkerFetch: 返回数据
        WorkerFetch->>Redis: 更新缓存
    end
    WorkerFetch-->>Frontend: 返回作品列表
    Frontend-->>User: SSR 首屏 + 懒加载剩余作品

    %% 访问单个作品页
    User->>ArtworkPage: 打开作品页
    ArtworkPage->>WorkerFetch: GET /api/artworks/:id
    WorkerFetch->>Redis: 读取缓存
    alt Redis 命中
        Redis-->>WorkerFetch: 返回数据
    else 缓存未命中
        WorkerFetch->>D1: 查询数据库
        D1-->>WorkerFetch: 返回数据
        WorkerFetch->>Redis: 更新缓存
    end
    WorkerFetch-->>Frontend: 返回作品信息 + SEO meta
    Frontend-->>User: SSR 首屏 + 懒加载图片/视频
```

实现状态注解：
- 现阶段 `/feed`、`/user/:username`、`/artwork/:id/:slug` 的数据来自 `public/mocks/*.json`，未接入 Workers API；客户端交互 hooks 已具备，等待后端接口。
- 生成/上传/发布目前在前端以占位流程模拟（`CreateArtworkModal`），后续接入 `/api/artworks/generate | /upload | /:id/publish` 后替换为真实流程。

---

这份 PDF 文档版蓝图**覆盖了整个系统**：前端、后端、存储、缓存、异步任务、SEO URL、首屏加载、用户操作完整时序。

开发团队可以直接用它做**前端组件开发、API 开发、Redis 缓存策略、异步任务实现**。