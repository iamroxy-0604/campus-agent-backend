# 四个核心功能 · 后端 & 智能体需求分析

> 日期: 2026-07-08  
> 目的: 明确好友 / 积分 / 二手市场 / 公告栏对后端和 AI 智能体的具体要求

---

## 总览

| 功能 | 后端复杂度 | 智能体需求 | 优先级 |
|------|-----------|-----------|--------|
| 👥 好友系统 | 🔴 高 | 🟡 中 | P0 |
| ⭐ 积分系统 | 🟡 中 | 🟢 低 | P0 |
| 🛒 二手市场 | 🔴 高 | 🟢 低 | P1 |
| 📋 公告栏 | 🟢 低 | 🟢 低 | P0 |

---

## 一、👥 好友系统

### 1.1 功能拆解

```
前端交互                          后端需要支持的
─────────────────────────────────────────────────
注册/登录                          → 用户系统（账号、密码、昵称、头像）
查看好友列表                       → 好友关系表 CRUD
添加好友（发送申请 → 对方同意）     → 好友申请表 + 状态流转
实时看到好友位置                   → WebSocket 位置广播
一对一私聊                         → 消息表 + WebSocket 实时推送
查看好友资料卡                     → 用户信息查询接口
```

### 1.2 数据库表设计

```sql
-- 用户表（目前没有，需新建）
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    username VARCHAR(32) UNIQUE NOT NULL,   -- 登录名
    nickname VARCHAR(32),                    -- 显示昵称
    avatar VARCHAR(128),                     -- 头像路径
    password_hash VARCHAR(128) NOT NULL,
    current_scene VARCHAR(64),               -- 当前所在场景
    current_x FLOAT, current_y FLOAT,        -- 实时坐标
    is_online BOOLEAN DEFAULT 0,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 好友关系表
CREATE TABLE friendships (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    friend_id INTEGER REFERENCES users(id),
    status VARCHAR(16) DEFAULT 'pending',   -- pending / accepted / blocked
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, friend_id)
);

-- 私聊消息表
CREATE TABLE chat_messages (
    id INTEGER PRIMARY KEY,
    from_user INTEGER REFERENCES users(id),
    to_user INTEGER REFERENCES users(id),
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 1.3 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/user/register` | 注册 |
| `POST` | `/api/user/login` | 登录 |
| `GET` | `/api/user/{id}/profile` | 查看用户资料 |
| `POST` | `/api/friend/request` | 发送好友申请 |
| `PUT` | `/api/friend/{id}/accept` | 同意好友申请 |
| `DELETE` | `/api/friend/{id}` | 删除好友 |
| `GET` | `/api/friend/list` | 好友列表 |
| `POST` | `/api/user/location` | 上报位置坐标 |
| `GET` | `/api/friend/online-locations` | 获取在线好友位置 |
| `POST` | `/api/chat/send` | 发送私聊消息 |
| `GET` | `/api/chat/history/{user_id}` | 拉取聊天记录 |
| `WS` | `/ws/chat` | WebSocket 实时消息推送 |

### 1.4 智能体需求

| 场景 | 说明 |
|------|------|
| 🤖 **交友推荐** | 智能体根据用户行为（常去场景、兴趣标签）推荐"可能认识的人" |
| 🤖 **破冰话题** | 加好友后，智能体自动生成一句开场白（基于双方共同点） |
| 🤖 **好友动态摘要** | "你的好友小明刚在体育馆约了篮球局，小红在二手市场上了新东西" |

> 智能体不需要处理好友关系本身，只做"推荐"和"摘要"这类语言任务。

---

## 二、⭐ 每日任务 & 积分系统

### 2.1 功能拆解

```
前端交互                          后端需要支持的
─────────────────────────────────────────────────
每日任务列表展示                   → 任务模板表 + 用户任务进度表
完成任务自动加积分                 → 积分变动记录表
积分排行榜                        → 积分聚合查询
积分商城（兑换道具）               → 道具表 + 兑换记录表
成就徽章展示                      → 成就定义表 + 用户成就表
连续打卡                          → 签到记录表
```

### 2.2 数据库表设计

```sql
-- 任务模板表
CREATE TABLE task_templates (
    id INTEGER PRIMARY KEY,
    name VARCHAR(64),              -- "登录小镇" / "与NPC对话"
    description TEXT,
    type VARCHAR(32),              -- daily / weekly / achievement
    reward_points INTEGER DEFAULT 10,
    target_count INTEGER DEFAULT 1, -- 需要完成几次
    icon VARCHAR(32)               -- emoji 图标
);

-- 用户任务进度表
CREATE TABLE user_tasks (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    task_id INTEGER REFERENCES task_templates(id),
    progress INTEGER DEFAULT 0,          -- 当前进度
    completed BOOLEAN DEFAULT 0,
    date DATE,                            -- 任务日期（每日任务按天重置）
    UNIQUE(user_id, task_id, date)
);

-- 积分记录表
CREATE TABLE points_log (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    points INTEGER,                 -- 正数为获得，负数为消费
    reason VARCHAR(64),             -- "daily_login" / "talk_to_npc" / "redeem_gift"
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 用户积分汇总（缓存，避免每次 SUM）
CREATE TABLE user_points (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    total_points INTEGER DEFAULT 0,
    updated_at DATETIME
);

-- 签到记录
CREATE TABLE checkins (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    date DATE UNIQUE,
    streak INTEGER DEFAULT 1,       -- 连续打卡天数
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 成就定义表
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY,
    name VARCHAR(64),
    description TEXT,
    condition_type VARCHAR(32),     -- talk_count / friend_count / login_days
    condition_value INTEGER,        -- 需要的数量
    icon VARCHAR(32)
);

-- 用户成就表
CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    achievement_id INTEGER REFERENCES achievements(id),
    unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, achievement_id)
);
```

### 2.3 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/task/daily` | 获取今日任务列表 + 进度 |
| `POST` | `/api/task/checkin` | 每日打卡 |
| `GET` | `/api/points/balance` | 查询积分余额 |
| `GET` | `/api/points/log` | 积分变动明细 |
| `GET` | `/api/leaderboard/points` | 积分排行榜 |
| `GET` | `/api/achievement/list` | 成就列表 + 解锁状态 |
| `POST` | `/api/task/report` | 上报行为触发任务进度检查 |

> **`POST /api/task/report` 是关键接口**：前端在用户完成特定行为时调用，后端检查该行为是否关联到某个每日任务，自动更新进度并加积分。

### 2.4 智能体需求

| 场景 | 说明 |
|------|------|
| 🤖 **今日任务文案** | 智能体每天生成不同的任务描述，避免"登录小镇"这种机械文案 |
| 🤖 **成就解锁祝贺** | 解锁成就时智能体写一句个性化祝贺语 |

> 积分系统本身是纯逻辑（加减分、查进度），几乎不需要智能体参与。

---

## 三、🛒 二手市场

### 3.1 功能拆解

```
前端交互                          后端需要支持的
─────────────────────────────────────────────────
发布商品（标题/价格/图片/描述）    → 商品表 CRUD + 图片上传
商品列表浏览 + 筛选 + 搜索         → 列表查询 + 分页 + 筛选
商品详情                          → 单条查询
联系卖家                          → 触发好友系统（跳转私聊）
交易完成互评                      → 评价表
卖家信用展示                      → 信用分聚合查询
```

### 3.2 数据库表设计

```sql
-- 商品表
CREATE TABLE items (
    id INTEGER PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id),
    title VARCHAR(64) NOT NULL,
    description TEXT,
    price DECIMAL(10,2),
    original_price DECIMAL(10,2),    -- 原价（可选）
    condition VARCHAR(16),           -- 全新 / 95新 / 九成新 / 八成新 / 六成新
    category VARCHAR(16),            -- 教材 / 数码 / 外设 / 生活 / 出行 / 考研 / 其他
    image_path VARCHAR(256),         -- 图片路径
    status VARCHAR(16) DEFAULT 'active',  -- active / sold / removed
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 交易评价表
CREATE TABLE item_reviews (
    id INTEGER PRIMARY KEY,
    item_id INTEGER REFERENCES items(id),
    reviewer_id INTEGER REFERENCES users(id),  -- 评价者
    reviewee_id INTEGER REFERENCES users(id),  -- 被评价者
    rating INTEGER CHECK(rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 收藏表
CREATE TABLE item_favorites (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    item_id INTEGER REFERENCES items(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, item_id)
);
```

### 3.3 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/item/create` | 发布商品（含图片上传） |
| `GET` | `/api/item/list` | 商品列表（分页+筛选+搜索） |
| `GET` | `/api/item/{id}` | 商品详情 |
| `PUT` | `/api/item/{id}` | 编辑商品 |
| `DELETE` | `/api/item/{id}` | 下架商品（软删除） |
| `POST` | `/api/item/{id}/favorite` | 收藏 |
| `POST` | `/api/item/{id}/review` | 交易评价 |
| `GET` | `/api/user/{id}/items` | 某用户的在售商品 |
| `GET` | `/api/user/{id}/credit` | 卖家信用分 |

### 3.4 智能体需求

| 场景 | 说明 |
|------|------|
| 🤖 **商品描述生成** | 用户上传图片 + 几个关键词，智能体自动生成一段吸引人的商品描述 |
| 🤖 **智能推荐** | 根据用户浏览/收藏记录，推荐可能感兴趣的商品 |
| 🤖 **价格建议** | "这本书现在的市场价大概是 ¥20-30，建议定价 ¥25" |
| 🤖 **交易安全提醒** | 检测到可疑交易模式时提醒（如价格异常低） |

> 智能体在这里做"锦上添花"——帮写描述、帮推荐、帮估价。核心 CRUD 不需要智能体。

---

## 四、📋 公告栏

### 4.1 功能拆解

```
前端交互                          后端需要支持的
─────────────────────────────────────────────────
公告列表展示                       → 公告表 CRUD
按类型筛选（系统/活动/场馆）        → 分类查询
点击查看详情                       → 单条查询
后台发布公告                       → 管理端发布接口
```

### 4.2 数据库表设计

```sql
CREATE TABLE announcements (
    id INTEGER PRIMARY KEY,
    title VARCHAR(64) NOT NULL,
    content TEXT,
    type VARCHAR(16),              -- 系统通知 / 平台公告 / 场馆通知 / 优惠活动 / 活动通知
    color VARCHAR(7) DEFAULT '#4fc3f7',  -- 左侧颜色条
    is_pinned BOOLEAN DEFAULT 0,   -- 是否置顶
    author_id INTEGER REFERENCES users(id),  -- 发布者
    view_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 4.3 API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/announcement/list` | 公告列表（分页+筛选） |
| `GET` | `/api/announcement/{id}` | 公告详情 |
| `POST` | `/api/announcement/create` | 发布公告（管理端） |
| `PUT` | `/api/announcement/{id}` | 编辑公告 |
| `DELETE` | `/api/announcement/{id}` | 删除公告 |

### 4.4 智能体需求

| 场景 | 说明 |
|------|------|
| 🤖 **公告内容润色** | 管理员写草稿 → 智能体润色成正式公告语气 |
| 🤖 **公告摘要** | 长公告自动生成一句话摘要，在列表页展示 |
| 🤖 **个性化推送** | "你常去体育馆，这条开放时间调整通知可能对你有用" |

> 公告栏是最轻量的功能。当前演示版用前端假数据就够了，正式版只需要 5 个简单接口。

---

## 五、后端开发优先级 & 工作量估算

```
第一阶段（用户系统 + 积分 + 公告栏）    ≈ 3-5 天
    ├── 用户注册/登录（JWT token）
    ├── 公告栏 CRUD（5 个接口）
    ├── 每日任务模板 + 进度追踪
    ├── 积分加减 + 排行榜
    └── 签到系统

第二阶段（好友 + 私聊）                ≈ 3-5 天
    ├── 好友申请/同意/删除
    ├── 私聊消息发送/拉取
    ├── WebSocket 实时推送
    └── 在线状态 + 位置广播

第三阶段（二手市场）                    ≈ 3-4 天
    ├── 商品 CRUD + 图片上传
    ├── 搜索/筛选/分页
    ├── 收藏 + 评价
    └── 卖家信用分
```

---

## 六、当前后端已有 vs 需要新增

| 模块 | 已有 | 需要新增 |
|------|------|---------|
| 👤 用户系统 | ❌ 无（目前 userId 是前端随机生成） | 全部新建 |
| 💬 对话存储 | ✅ messages 表 + agent_rpc_logs | 扩展为私聊消息 |
| 🤖 智能体调度 | ✅ real_agent_client + intent_service | 新增推荐/摘要类 prompt |
| 📋 公告 | ❌ 无 | 全部新建 |
| ⭐ 积分 | ❌ 无 | 全部新建 |
| 🛒 交易 | ❌ 无 | 全部新建 |
| 👥 好友 | ❌ 无 | 全部新建 |
| 🔐 认证 | ❌ 无 | JWT 中间件 |
| 📡 实时通信 | ❌ 无 | WebSocket 端点 |

> **结论**: 当前后端的对话/智能体链路是完整的，但**用户系统是零**。所有四个功能都依赖用户系统，所以**第一个要做的就是用户注册登录**。
