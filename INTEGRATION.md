# 校园智能体后端 — 前后端对接文档

> **版本**: 0.1.0  
> **后端技术栈**: FastAPI + SQLite + SQLAlchemy + DeepSeek LLM  
> **对接人**: 前端同学  
> **最后更新**: 2026-06-28

---

## 目录

1. [快速开始（后端启动）](#1-快速开始后端启动)
2. [系统架构概览](#2-系统架构概览)
3. [核心概念](#3-核心概念)
4. [场景与子场景体系](#4-场景与子场景体系)
5. [API 接口详细文档](#5-api-接口详细文档)
   - [5.1 核心对话接口 `/api/dingdang/chat`](#51-核心对话接口-apidingdangchat)
   - [5.2 场景配置接口 `/api/scenes/{scene_id}/config`](#52-场景配置接口-apiscenesscene_idconfig)
   - [5.3 智能体列表 `/api/agent/list`](#53-智能体列表-apiagentlist)
   - [5.4 智能体详情 `/api/agent/{agent_id}`](#54-智能体详情-apiagentagent_id)
   - [5.5 模拟智能体问答 `/api/agent/ask`](#55-模拟智能体问答-apiagentask)
   - [5.6 真实智能体直连 `/api/real-agent/query`](#56-真实智能体直连-apireal-agentquery)
   - [5.7 对话记录查询 `/api/dingdang/messages`](#57-对话记录查询-apidingdangmessages)
   - [5.8 足迹记录查询 `/api/dingdang/footprints`](#58-足迹记录查询-apidingdangfootprints)
   - [5.9 智能体调用日志 `/api/dingdang/agent-rpc-logs`](#59-智能体调用日志-apidingdangagent-rpc-logs)
   - [5.10 数据清理接口](#510-数据清理接口)
6. [前端对接完整流程](#6-前端对接完整流程)
7. [场景与智能体映射表](#7-场景与智能体映射表)
8. [错误处理说明](#8-错误处理说明)
9. [CORS 跨域配置](#9-cors-跨域配置)
10. [数据库表结构](#10-数据库表结构)
11. [前端建议的数据流设计](#11-前端建议的数据流设计)

---

## 1. 快速开始（后端启动）

### 1.1 环境要求

- Python 3.10+
- pip

### 1.2 安装依赖

```bash
cd project
pip install -r requirements.txt
```

### 1.3 配置环境变量

项目根目录下创建 `.env` 文件（已存在，如需修改 DeepSeek Key）：

```env
DEEPSEEK_API_KEY=你的DeepSeek_API_Key（向后端同学索取）
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
```

如果需要指定外部 Leader 智能体地址，在 `app/services/real_agent_client.py` 中修改 `LEADER_RPC_URL`（默认 `http://117.74.66.94:5000/rpc`）。

### 1.4 启动服务

```bash
cd project
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

启动后访问：
- API 文档（Swagger UI）: `http://localhost:8000/docs`
- 健康检查: `http://localhost:8000/`

### 1.5 数据库

首次启动时，SQLite 数据库 `campus_agent.db` 会在项目根目录自动创建，并自动建表、写入 3 个默认智能体种子数据。

---

## 2. 系统架构概览

```
┌──────────────────────────────────────┐
│          前端（你的 React 应用）        │
│         http://localhost:3000         │
└──────────────────┬───────────────────┘
                   │ HTTP / JSON (CORS 白名单)
┌──────────────────▼───────────────────┐
│      FastAPI 后端（本项目）            │
│      http://localhost:8000           │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  /api/dingdang/chat  核心对话 │    │
│  │  /api/scenes/*       场景配置 │    │
│  │  /api/agent/*        智能体   │    │
│  │  /api/real-agent/*   直连RPC  │    │
│  │  /api/agent-logs/*   日志上报 │    │
│  └──────────────────────────────┘    │
│                                      │
│  ┌──────────────────────────────┐    │
│  │  意图识别 (DeepSeek / 关键词)  │    │
│  │  对话存储 (SQLite)            │    │
│  │  足迹追踪                    │    │
│  │  RPC 日志持久化              │    │
│  └──────────────────────────────┘    │
└──────────────────┬───────────────────┘
                   │ JSON-RPC 2.0
┌──────────────────▼───────────────────┐
│      外部 Leader 智能体               │
│   http://117.74.66.94:5000/rpc       │
│   （总调度智能体，处理实际对话）         │
└──────────────────────────────────────┘
```

**核心交互链路**：前端 → 后端 `/api/dingdang/chat` → 外部 Leader 智能体（JSON-RPC）→ 后端整理结果 → 前端

---

## 3. 核心概念

### 3.1 conversationId（会话ID）

- 格式：`C_` + 时间戳 + 随机字符，如 `C_LFO8XY2B`
- 作用：标识一次完整的对话会话。同一用户在同一场景下的多轮对话共享同一个 `conversationId`
- **前端必须维护**：首次请求可以不传，后端会自动生成并返回。后续同一会话的所有请求都必须带上这个 ID

### 3.2 traceId（追踪ID）

- 格式：`T_` + 时间戳 + 随机字符，如 `T_LFO8Y3AC`
- 作用：标识单次请求的追踪链，用于调试和日志追踪
- 后端自动生成，每次请求唯一

### 3.3 userId（用户ID）

- 作用：标识当前用户
- 前端可以不传，后端会自动生成

### 3.4 agentId（智能体ID）

- 作用：标识与用户对话的智能体
- 默认值：`leader_agent`（总调度智能体）

### 3.5 scene（场景标识）

- 作用：标识用户当前所在的场景/子场景
- 取值：见 [场景与子场景体系](#4-场景与子场景体系)

---

## 4. 场景与子场景体系

整个应用基于"场景地图"概念，用户在一个校园地图上导航，不同位置（子场景）对应不同的智能体服务。

### 4.1 场景层级结构

```
school (校园总地图)                    ← 顶层场景
├── mcdonalds (麦当劳)                ← 子场景 → 麦当劳经理智能体
├── stadium (体育场)                   ← 子场景 → 体育馆管理员智能体
└── office (学院办公楼) [待扩展]        ← 子场景 → 陈院长智能体
```

### 4.2 场景数据获取

前端通过 **[场景配置接口](#52-场景配置接口-apiscenesscene_idconfig)** 获取完整的地图/子场景数据（坐标、图标、名称等）。

### 4.3 子场景详细展开说明

> 🔴 **融合版本核心要求**：以下三个子场景必须在融合版前端中完整呈现，每个子场景需具备独立的对话界面和对应的智能体交互能力。

---

#### 4.3.1 麦当劳 🍔 — `mcdonalds`

| 属性 | 值 |
|------|-----|
| **子场景 ID** | `mcdonalds` |
| **显示名称** | 麦当劳 |
| **地图坐标** | (300, 180) |
| **图标资源** | `/assets/icons/mcdonalds.png` |
| **对应智能体** | `mcd_manager`（麦当劳经理） |
| **所属场景** | `McDonaldScene` |
| **智能体角色** | 负责推荐套餐、联名活动、限定餐品信息 |

**对话能力（Leader 智能体调度后返回）：**

| 对话场景举例 | 用户输入示例 | 预期智能体回复方向 |
|-------------|-------------|-------------------|
| 套餐推荐 | "今天有什么好吃的？" | 推荐当日套餐、新品、优惠组合 |
| 联名活动 | "最近有什么联名活动？" | 介绍当前 IP 联名、限定周边 |
| 限定餐品 | "有限定口味的麦旋风吗？" | 查询季节性/限时餐品库存 |
| 点餐引导 | "我想点一个巨无霸套餐" | 引导用户选择规格、配餐、结算 |
| 营业信息 | "你们几点关门？" | 回复营业时间、高峰期提醒 |

**前端 UI 建议：**
- 进入麦当劳子场景后展示麦当劳风格的对话背景
- 可在对话界面顶部展示"麦当劳经理"头像和名称
- 支持快捷回复按钮（"今日推荐"、"查看菜单"、"营业时间"等）

---

#### 4.3.2 体育场 🏟️ — `stadium`

| 属性 | 值 |
|------|-----|
| **子场景 ID** | `stadium` |
| **显示名称** | 体育场 |
| **地图坐标** | (700, 360) |
| **图标资源** | `/assets/icons/stadium.png` |
| **对应智能体** | `gym_admin`（体育馆管理员） |
| **所属场景** | `GymScene` |
| **智能体角色** | 负责体育馆场地预约、收费、开放时间咨询 |

**对话能力（Leader 智能体调度后返回）：**

| 对话场景举例 | 用户输入示例 | 预期智能体回复方向 |
|-------------|-------------|-------------------|
| 场地预约 | "我想预约明天下午的羽毛球场" | 查询可预约时段、引导选择场地 |
| 收费标准 | "篮球场怎么收费？" | 说明校内外价格、计时/包场方案 |
| 开放时间 | "周末体育馆开门吗？" | 回复各场馆开放时间表 |
| 器材租赁 | "可以租羽毛球拍吗？" | 说明可租器材清单及价格 |
| 活动查询 | "最近有什么体育比赛？" | 推送近期赛事、健身课程信息 |

**前端 UI 建议：**
- 进入体育场子场景后展示运动风格的对话背景
- 可在对话界面顶部展示"体育馆管理员"头像和名称
- 支持快捷回复按钮（"场地预约"、"开放时间"、"收费标准"等）
- 可扩展场地预约日历/时间选择器组件

---

#### 4.3.3 学院办公楼 🏫 — `office`

| 属性 | 值 |
|------|-----|
| **子场景 ID** | `office` |
| **显示名称** | 学院办公楼 |
| **地图坐标** | 待定（需前端同学根据地图素材设定） |
| **图标资源** | 待定（建议 `/assets/icons/office.png`） |
| **对应智能体** | `dean_chen`（陈院长） |
| **所属场景** | `OfficeScene` |
| **智能体角色** | 负责本科教学政策、培养方案、学院介绍 |

> ⚠️ **注意**：`office` 子场景的智能体数据已在后端数据库就绪（`dean_chen`），但 `app/mock/mock_scene_data.py` 的 `subScenes` 列表中**尚未添加此子场景的坐标和图标信息**。
>
> 融合版需要先将 `office` 补充到 `SCHOOL_SCENE["subScenes"]` 数组中（见下方代码），前端才能通过场景配置接口获取到此子场景。

**后端需补充的配置（`app/mock/mock_scene_data.py`）：**

```python
# 在 subScenes 列表中新增：
{
    "subSceneId": "office",
    "name": "学院办公楼",
    "icon": "/assets/icons/office.png",
    "x": 500,       # ← 请前端同学根据实际地图调整
    "y": 100        # ← 请前端同学根据实际地图调整
}
```

**对话能力（Leader 智能体调度后返回）：**

| 对话场景举例 | 用户输入示例 | 预期智能体回复方向 |
|-------------|-------------|-------------------|
| 培养方案 | "计算机学院大二有哪些必修课？" | 查询专业培养方案、课程列表 |
| 教学政策 | "转专业需要什么条件？" | 解释转专业政策、申请流程 |
| 学院介绍 | "计算机学院有哪些实验室？" | 介绍学院组织架构、研究方向 |
| 选课咨询 | "通识课选什么比较好？" | 推荐热门课程、学分规划建议 |
| 教务流程 | "缓考怎么申请？" | 说明教务手续办理流程 |

**前端 UI 建议：**
- 进入办公楼子场景后展示正式/学术风格的对话背景
- 可在对话界面顶部展示"陈院长"头像和名称
- 支持快捷回复按钮（"培养方案"、"教学政策"、"学院介绍"等）

---

### 4.4 子场景总览表

| 子场景 ID | 名称 | 坐标 (x, y) | 图标路径 | 智能体 | 状态 |
|-----------|------|------------|----------|--------|------|
| `mcdonalds` | 麦当劳 | (300, 180) | `/assets/icons/mcdonalds.png` | 麦当劳经理 | ✅ 就绪 |
| `stadium` | 体育场 | (700, 360) | `/assets/icons/stadium.png` | 体育馆管理员 | ✅ 就绪 |
| `office` | 学院办公楼 | 待定 | `/assets/icons/office.png` | 陈院长 | ⚠️ 后端智能体就绪，需补充地图坐标 |

> ⚠️ 坐标基于校园地图背景图 `/assets/maps/school.png`。前端同学请根据实际地图素材调整坐标值（修改 `app/mock/mock_scene_data.py` 中的 `SCHOOL_SCENE` 字典即可）。

### 4.5 子场景在前端的交互流程

```
用户进入校园地图
    │
    ├── 看到 3 个子场景图标分布在地图上
    │   ├── 🍔 麦当劳 (300, 180)
    │   ├── 🏟️ 体育场 (700, 360)
    │   └── 🏫 学院办公楼 (坐标待定)
    │
    ├── 点击某个子场景图标
    │   └── 前端设置 currentScene = 该子场景的 subSceneId
    │   └── 进入该场景的对话界面
    │   └── 展示对应智能体的头像/名称
    │
    └── 用户在对话界面输入消息
        └── POST /api/dingdang/chat { scene: currentScene, ... }
        └── Leader 智能体感知用户所在场景，自动调度到对应智能体
        └── 前端展示智能体回复
```

> 💡 **核心理念**：用户在不同子场景中与不同智能体对话，就像在真实校园里走到不同地点遇到不同的人。每个子场景应该有独立的视觉风格和对话氛围。

---

## 5. API 接口详细文档

### 基础信息

- **Base URL**: `http://localhost:8000`
- **Content-Type**: `application/json`
- **字符编码**: UTF-8
- **所有时间字段格式**: ISO 8601 (`2026-06-28T12:30:45.123456`)

---

### 5.1 核心对话接口 `/api/dingdang/chat`

> 🔴 **这是最重要的接口，前端 90% 的交互都走这个接口**

```
POST /api/dingdang/chat
```

#### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `message` | string | **是** | - | 用户输入的消息文本 |
| `conversationId` | string | 否 | 自动生成 | 会话ID（推荐传 `conversationId`） |
| `conversation_id` | string | 否 | 自动生成 | 同上（兼容写法） |
| `userId` | string | 否 | 自动生成 | 用户ID（推荐传 `userId`） |
| `user_id` | string | 否 | 自动生成 | 同上（兼容写法） |
| `agentId` | string | 否 | `leader_agent` | 智能体ID（推荐传 `agentId`） |
| `aicId` | string | 否 | `leader_agent` | 同上（兼容写法） |
| `scene` | string | 否 | `null` | 当前所在场景标识 |
| `source` | string | 否 | `null` | 消息来源标记 |

> ⚠️ **兼容性说明**：后端同时支持 camelCase 和 snake_case 两种参数名格式。建议前端统一使用 camelCase 风格（`conversationId`, `userId`, `agentId`）。

#### 请求示例

```json
{
  "message": "你好，我想预约明天的羽毛球场",
  "conversationId": "C_LFO8XY2B",
  "userId": "user_001",
  "agentId": "leader_agent",
  "scene": "stadium"
}
```

#### 成功响应 (HTTP 200)

```json
{
  "success": true,
  "conversationId": "C_LFO8XY2B",
  "conversation_id": "C_LFO8XY2B",
  "traceId": "T_LFO8Y3AC",
  "agentId": "leader_agent",
  "agent_id": "leader_agent",
  "reply": "好的！体育馆明天羽毛球场有上午9:00-11:00和下午2:00-4:00两个时段可预约……",
  "answer": "好的！体育馆明天羽毛球场有上午9:00-11:00和下午2:00-4:00两个时段可预约……",
  "source": "leader_agent",
  "raw": {
    "request_id": "C_LFO8XY2B-a1b2c3d4",
    "reply": "好的！体育馆明天...",
    "from_agent": "leader",
    "to_agent": "gym_admin",
    "task_id": "task_xxxxx",
    "session_id": "session_xxxxx",
    "state": "completed",
    "protocol": "AIP RPC SDK",
    "command": "query",
    "scene": "stadium",
    "rpc_logs": []
  }
}
```

| 响应字段 | 类型 | 说明 |
|----------|------|------|
| `success` | boolean | 请求是否成功 |
| `conversationId` | string | 会话ID（前端请以此为准，后续请求必须回传） |
| `conversation_id` | string | 同上（兼容） |
| `traceId` | string | 本次请求的追踪ID |
| `agentId` | string | 响应的智能体ID |
| `reply` | string | 智能体的回复文本（**前端展示用**） |
| `answer` | string | 同 `reply`，智能体回复（**前端展示用**） |
| `source` | string | 回复来源 |
| `raw` | object | 原始 RPC 返回数据，含调度链路信息 |

#### 失败响应 (HTTP 200，但 success=false)

```json
{
  "success": false,
  "conversationId": "C_LFO8XY2B",
  "traceId": "T_LFO8Y3AC",
  "agentId": "leader_agent",
  "reply": "智能体调用失败：连接外部服务超时",
  "answer": "智能体调用失败：连接外部服务超时",
  "error": "connect timeout"
}
```

> ⚠️ **重要**：即使调用失败，HTTP 状态码也是 200。**前端必须检查 `success` 字段**来判断成功与否，不能依赖 HTTP 状态码。

#### 前端调用示例代码

```javascript
// React / TypeScript 示例
async function sendMessage(message, conversationId, userId, scene) {
  const response = await fetch('http://localhost:8000/api/dingdang/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      conversationId,  // 首次调用不传，从返回值获取后保存
      userId,
      scene,           // 当前用户所在的子场景 ID
    }),
  });

  const data = await response.json();

  if (data.success) {
    // 展示 data.reply 或 data.answer
    // 保存 data.conversationId 用于后续对话
    return {
      conversationId: data.conversationId,
      reply: data.reply,
      traceId: data.traceId,
    };
  } else {
    // 展示错误提示
    console.error(data.error);
    return null;
  }
}
```

---

### 5.2 场景配置接口 `/api/scenes/{scene_id}/config`

> 🟡 **前端初始化时必须调用此接口，获取场景地图和子场景布局信息**

```
GET /api/scenes/{scene_id}/config
```

#### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `scene_id` | string | 场景ID，目前仅支持 `"school"` |

#### 响应示例

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "sceneId": "school",
    "name": "校园地图",
    "background": "/assets/maps/school.png",
    "subScenes": [
      {
        "subSceneId": "mcdonalds",
        "name": "麦当劳",
        "icon": "/assets/icons/mcdonalds.png",
        "x": 300,
        "y": 180
      },
      {
        "subSceneId": "stadium",
        "name": "体育场",
        "icon": "/assets/icons/stadium.png",
        "x": 700,
        "y": 360
      }
    ]
  }
}
```

#### 前端使用说明

```javascript
// 1. 获取场景配置
const { data } = await fetch('/api/scenes/school/config').then(r => r.json());

// 2. 设置地图背景
setBackground(data.background);  // "/assets/maps/school.png"

// 3. 在地图上渲染子场景图标
data.subScenes.forEach(sub => {
  renderIcon({
    id: sub.subSceneId,   // 子场景唯一标识
    name: sub.name,        // 显示名称
    icon: sub.icon,        // 图标图片
    x: sub.x,              // 在地图上的 X 坐标（像素）
    y: sub.y,              // 在地图上的 Y 坐标（像素）
  });
});

// 4. 用户点击子场景图标时，传入 scene 参数发起对话
//    例如点击麦当劳图标 → scene = "mcdonalds"
```

---

### 5.3 智能体列表 `/api/agent/list`

```
GET /api/agent/list
```

#### 响应示例

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 1,
      "agentId": "gym_admin",
      "name": "体育馆管理员",
      "scene": "GymScene",
      "role": "负责体育馆场地预约、收费、开放时间咨询",
      "description": null,
      "status": "active",
      "mockReply": "体育馆今天正常开放，开放时间是 8:00-22:00。如需预约场地请到前台办理。",
      "createdAt": "2026-06-28T10:00:00.000000"
    },
    {
      "id": 2,
      "agentId": "mcd_manager",
      "name": "麦当劳经理",
      "scene": "McDonaldScene",
      "role": "负责推荐套餐、联名活动、限定餐品信息",
      "description": null,
      "status": "active",
      "mockReply": "欢迎光临麦当劳！今天推荐巨无霸套餐，加1元升级大份薯条和可乐~",
      "createdAt": "2026-06-28T10:00:00.000000"
    },
    {
      "id": 3,
      "agentId": "dean_chen",
      "name": "陈院长",
      "scene": "OfficeScene",
      "role": "负责本科教学政策、培养方案、学院介绍",
      "description": null,
      "status": "active",
      "mockReply": "同学你好，关于培养方案的问题，请先告诉我你的年级和专业。",
      "createdAt": "2026-06-28T10:00:00.000000"
    }
  ]
}
```

> 该接口返回所有已注册的智能体信息。前端可用于展示"可选智能体列表"。

---

### 5.4 智能体详情 `/api/agent/{agent_id}`

```
GET /api/agent/{agent_id}
```

#### 路径参数

| 参数 | 类型 | 示例 | 说明 |
|------|------|------|------|
| `agent_id` | string | `gym_admin` | 智能体唯一标识 |

#### 成功响应

```json
{
  "success": true,
  "data": {
    "agentId": "gym_admin",
    "name": "体育馆管理员",
    "scene": "GymScene",
    "role": "负责体育馆场地预约、收费、开放时间咨询",
    "description": null,
    "status": "active",
    "mockReply": "体育馆今天正常开放，开放时间是 8:00-22:00。如需预约场地请到前台办理。"
  }
}
```

#### 失败响应

```json
{
  "success": false,
  "error": "agent not found"
}
```

---

### 5.5 模拟智能体问答 `/api/agent/ask`

> ⚠️ 此接口为 **Mock 模式**，直接返回数据库中预设的 `mockReply`，不经过外部 Leader 智能体。仅用于前端开发调试。

```
POST /api/agent/ask
```

#### 请求参数

```json
{
  "agentId": "gym_admin",
  "question": "今天开门吗？",
  "context": {}
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `agentId` | string | 是 | 目标智能体ID |
| `question` | string | 是 | 问题文本 |
| `context` | object | 否 | 附加上下文（预留） |

#### 响应示例

```json
{
  "success": true,
  "answer": "体育馆今天正常开放，开放时间是 8:00-22:00。如需预约场地请到前台办理。",
  "agentId": "gym_admin",
  "source": "mock_agent"
}
```

---

### 5.6 真实智能体直连 `/api/real-agent/query`

> 直接调用外部 Leader 智能体的 JSON-RPC 接口，**不经由 dingdang/chat 的消息/足迹/日志持久化流程**。适用于需要轻量直接调用的场景。

```
POST /api/real-agent/query
```

#### 请求参数

```json
{
  "conversation_id": "C_XXXXX",
  "user_id": "user_001",
  "message": "帮我查一下麦当劳今天的优惠套餐",
  "scene": "mcdonalds"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `conversation_id` | string | **是** | 会话ID |
| `user_id` | string | **是** | 用户ID |
| `message` | string | **是** | 消息文本 |
| `scene` | string | 否 | 场景标识 |

#### 响应示例

```json
{
  "ok": true,
  "data": {
    "request_id": "C_XXXXX-a1b2c3d4",
    "reply": "今天麦当劳有巨无霸超值午餐，只需25元！",
    "from_agent": "leader",
    "to_agent": "mcdonalds",
    "task_id": "task_xxxxx",
    "session_id": "session_xxxxx",
    "state": "completed",
    "protocol": "AIP RPC SDK",
    "command": "query",
    "scene": "mcdonalds",
    "raw_request": {
      "jsonrpc": "2.0",
      "method": "query",
      "id": "C_XXXXX-a1b2c3d4",
      "params": {
        "query": "帮我查一下麦当劳今天的优惠套餐"
      }
    },
    "raw_response": { /* 外部智能体原始返回 */ }
  }
}
```

---

### 5.7 对话记录查询 `/api/dingdang/messages`

```
GET /api/dingdang/messages
```

返回最近 50 条对话消息记录（按 ID 降序）。

#### 响应示例

```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 123,
      "conversationId": "C_LFO8XY2B",
      "traceId": "T_LFO8Y3AC",
      "senderType": "user",
      "senderId": "user_001",
      "content": "你好，我想预约明天的羽毛球场",
      "scene": "stadium",
      "createdAt": "2026-06-28T12:30:45.123456"
    },
    {
      "id": 124,
      "conversationId": "C_LFO8XY2B",
      "traceId": "T_LFO8Y3AC",
      "senderType": "agent",
      "senderId": "leader_agent",
      "content": "好的！体育馆明天羽毛球场有上午9:00-11:00和下午2:00-4:00两个时段可预约……",
      "scene": "stadium",
      "createdAt": "2026-06-28T12:30:46.654321"
    }
  ]
}
```

| `senderType` 取值 | 含义 |
|-------------------|------|
| `user` | 用户消息 |
| `agent` | 智能体回复 |
| `dingdang` | 叮当系统消息 |
| `system` | 系统通知 |

---

### 5.8 足迹记录查询 `/api/dingdang/footprints`

```
GET /api/dingdang/footprints
```

返回最近 50 条足迹追踪记录（调试用）。

#### 响应示例

```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 1,
      "traceId": "T_LFO8Y3AC",
      "conversationId": "C_LFO8XY2B",
      "from": "user_001",
      "to": "leader_agent",
      "what": "你好，我想预约明天的羽毛球场",
      "result": "成功路由到体育馆管理员智能体",
      "status": "success",
      "createdAt": "2026-06-28T12:30:45.123456"
    }
  ]
}
```

---

### 5.9 智能体调用日志 `/api/dingdang/agent-rpc-logs`

```
GET /api/dingdang/agent-rpc-logs
```

返回最近 50 条智能体间 RPC 调用日志。

#### 响应示例

```json
{
  "success": true,
  "count": 50,
  "data": [
    {
      "id": 1,
      "requestId": "C_LFO8XY2B-a1b2c3d4",
      "conversationId": "C_LFO8XY2B",
      "taskId": "task_xxxxx",
      "fromAgent": "leader",
      "toAgent": "gym_admin",
      "protocol": "AIP_RPC",
      "command": "query",
      "inputText": "帮我查一下羽毛球场",
      "outputText": "好的！体育馆明天羽毛球场有...",
      "state": "completed",
      "rawRequest": { /* JSON-RPC 请求体 */ },
      "rawResponse": { /* JSON-RPC 响应体 */ },
      "createdAt": "2026-06-28T12:30:46.654321"
    }
  ]
}
```

---

### 5.10 数据清理接口

> 🔧 开发调试用，用于清空数据重新测试。

| 方法 | 路径 | 说明 |
|------|------|------|
| `DELETE` | `/api/dingdang/messages` | 清空对话消息表 |
| `DELETE` | `/api/dingdang/footprints` | 清空足迹表（含内存和数据库） |
| `DELETE` | `/api/dingdang/agent-rpc-logs` | 清空智能体调用日志表 |

响应格式统一为：
```json
{
  "success": true,
  "message": "messages cleared"
}
```

---

## 6. 前端对接完整流程

### 6.1 应用初始化流程

```
Step 1: 获取场景配置
  GET /api/scenes/school/config
  → 获取地图背景图、所有子场景（坐标、图标、名称）

Step 2: 渲染地图
  - 设置背景图 data.background
  - 遍历 data.subScenes，在地图对应坐标放置可点击图标

Step 3: (可选) 获取智能体列表
  GET /api/agent/list
  → 展示可用的智能体信息
```

### 6.2 用户对话流程

```
Step 1: 用户在地图上点击某个子场景图标
  → 前端记录当前 scene = 子场景的 subSceneId（例如 "mcdonalds"）
  → 展示该场景对应的对话界面

Step 2: 用户输入消息并发送
  POST /api/dingdang/chat
  Body: {
    message: "今天有什么优惠套餐？",
    conversationId: "之前保存的会话ID（首次为空）",
    userId: "用户ID",
    scene: "mcdonalds"
  }

Step 3: 处理响应
  if (data.success) {
    - 保存 data.conversationId（用于后续同一会话的请求）
    - 在界面上展示 data.reply
  } else {
    - 展示错误提示 data.reply
  }

Step 4: 继续对话
  - 用户在同一场景下继续发消息，保持 conversationId 和 scene 不变
  - 用户切换到另一个子场景（如 "stadium"），建议开启新会话（不传旧的 conversationId）
```

### 6.3 场景切换策略

```
方案 A（推荐）：切换场景 = 新会话
  - 用户点击新场景 → conversationId 设为 null，让后端生成新ID
  - 优点：对话上下文隔离，不会把麦当劳的对话带到体育馆

方案 B：同一会话跨场景
  - 用户点击新场景 → 保持 conversationId，只更新 scene 参数
  - 优点：Leader 智能体可以看到完整的跨场景对话历史
  - 缺点：上下文可能混乱
```

> **建议默认使用方案 A**，除非产品设计明确要求跨场景上下文连续。

---

## 7. 场景与智能体映射表

| 场景标识 (`scene`) | 子场景名称 | 前端 icons | 对应智能体 `agentId` | 智能体名称 | 功能 |
|-------------------|-----------|-----------|---------------------|-----------|------|
| `mcdonalds` | 麦当劳 | `/assets/icons/mcdonalds.png` | `mcd_manager` | 麦当劳经理 | 套餐推荐、联名活动、限定餐品 |
| `stadium` | 体育场 | `/assets/icons/stadium.png` | `gym_admin` | 体育馆管理员 | 场地预约、收费标准、开放时间 |
| `office` | 学院办公楼 | 待定 | `dean_chen` | 陈院长 | 教学政策、培养方案、学院介绍 |

> ⚠️ `office` 场景目前已在数据库中有对应智能体 (`dean_chen`)，但 `SCHOOL_SCENE` mock 数据的 `subScenes` 列表中尚未包含。如需添加，在 `app/mock/mock_scene_data.py` 中补充即可。

---

## 8. 错误处理说明

### 8.1 错误响应模式

> ⚠️ 后端大部分接口**在业务错误时仍返回 HTTP 200**。前端必须检查响应体中的业务状态字段。

| 接口 | 业务状态字段 | 成功值 | 失败值 |
|------|------------|--------|--------|
| `/api/dingdang/chat` | `success` | `true` | `false` |
| `/api/agent/list` | `success` | `true` | - |
| `/api/agent/{id}` | `success` | `true` | `false` |
| `/api/agent/ask` | `success` | `true` | `false` |
| `/api/real-agent/query` | `ok` | `true` | `false` |
| `/api/scenes/{id}/config` | `code` | `0` | HTTPException(404) |
| `/api/agent-logs` | `ok` | `true` | - |

### 8.2 前端统一错误处理建议

```javascript
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, options);

    // 网络错误 / 服务不可用
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // 业务错误（success=false / ok=false）
    const isSuccess = data.success !== undefined ? data.success : data.ok;
    if (isSuccess === false) {
      return { error: true, message: data.reply || data.error || '请求失败' };
    }

    return { error: false, data };
  } catch (err) {
    return { error: true, message: `网络异常：${err.message}` };
  }
}
```

---

## 9. CORS 跨域配置

后端已配置 CORS 白名单，允许以下来源的请求：

- `http://localhost:3000`
- `http://127.0.0.1:3000`

如果你的前端运行在其他端口或域名，需要修改 `app/main.py`：

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",      # Vite 默认端口
        "http://你的新域名:端口",       # ← 添加你的前端地址
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 10. 数据库表结构

对接时如果需要直接查看数据库（仅用于调试），以下是核心表：

### messages（对话消息）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `conversation_id` | VARCHAR(64) | 会话ID |
| `trace_id` | VARCHAR(64) | 追踪ID |
| `sender_type` | VARCHAR(32) | user / agent / dingdang / system |
| `sender_id` | VARCHAR(64) | 发送者ID |
| `content` | TEXT | 消息正文 |
| `scene` | VARCHAR(64) | 所在场景 |
| `created_at` | DATETIME | 创建时间 |

### footprints（足迹记录）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `trace_id` | VARCHAR(64) | 追踪ID |
| `conversation_id` | VARCHAR(64) | 会话ID |
| `from_node` | VARCHAR(64) | 来源节点 |
| `to_node` | VARCHAR(64) | 目标节点 |
| `what` | TEXT | 操作描述 |
| `result` | TEXT | 操作结果 |
| `status` | VARCHAR(32) | 状态 |
| `created_at` | DATETIME | 创建时间 |

### agents（智能体定义）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `agent_id` | VARCHAR(64) UNIQUE | 智能体唯一标识 |
| `name` | VARCHAR(64) | 智能体名称 |
| `scene` | VARCHAR(64) | 所属场景 |
| `role` | TEXT | 角色定位 |
| `description` | TEXT | 详细描述 |
| `status` | VARCHAR(32) | active / disabled |
| `mock_reply` | TEXT | Mock 回复文本 |
| `created_at` | DATETIME | 创建时间 |

### agent_rpc_logs（智能体调用日志）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 自增主键 |
| `request_id` | VARCHAR(100) | 请求唯一标识 |
| `conversation_id` | VARCHAR(100) | 会话ID |
| `task_id` | VARCHAR(200) | 任务ID |
| `from_agent` | VARCHAR(255) | 调用方智能体 |
| `to_agent` | VARCHAR(255) | 被调用方智能体 |
| `protocol` | VARCHAR(50) | 协议（默认 AIP_RPC） |
| `command` | VARCHAR(50) | 指令 |
| `input_text` | TEXT | 输入文本 |
| `output_text` | TEXT | 输出文本 |
| `state` | VARCHAR(50) | 状态 |
| `raw_request` | JSON | 原始请求 |
| `raw_response` | JSON | 原始响应 |
| `created_at` | DATETIME | 创建时间 |

---

## 11. 前端建议的数据流设计

### 11.1 状态管理建议

```typescript
// 建议在前端维护的全局状态
interface AppState {
  // 场景相关
  sceneConfig: SceneConfig | null;       // GET /api/scenes/school/config 的结果
  currentScene: string | null;           // 当前所在子场景，如 "mcdonalds"

  // 对话相关
  conversationId: string | null;         // 当前会话ID
  messages: Message[];                   // 当前会话的消息列表

  // 用户相关
  userId: string;                        // 用户唯一标识（可本地生成 UUID）
}

interface SceneConfig {
  sceneId: string;
  name: string;
  background: string;
  subScenes: SubScene[];
}

interface SubScene {
  subSceneId: string;
  name: string;
  icon: string;
  x: number;
  y: number;
}

interface Message {
  id: string;
  senderType: 'user' | 'agent';
  content: string;
  timestamp: string;
}
```

### 11.2 关键前端交互逻辑

```
┌─────────────────────────────────────────────────┐
│  1. 应用启动                                      │
│     ↓                                           │
│  2. GET /api/scenes/school/config               │
│     ↓                                           │
│  3. 渲染地图背景 + 子场景图标                      │
│     ↓                                           │
│  4. 用户点击子场景图标                            │
│     → 设置 currentScene                          │
│     → 清空 conversationId（开始新会话）            │
│     → 展示对话面板                                │
│     ↓                                           │
│  5. 用户输入消息                                  │
│     → POST /api/dingdang/chat                   │
│     → 保存返回的 conversationId                  │
│     → 展示 reply                                 │
│     ↓                                           │
│  6. 继续对话（重复步骤 5）                         │
│     ↓                                           │
│  7. 用户点击另一个子场景 → 回到步骤 4               │
└─────────────────────────────────────────────────┘
```

### 11.3 图片资源约定

前端需要准备以下静态资源（路径已在场景配置中指定）：

| 资源路径 | 用途 | 建议尺寸 |
|----------|------|----------|
| `/assets/maps/school.png` | 校园地图背景 | 按前端设计定 |
| `/assets/icons/mcdonalds.png` | 麦当劳场景图标 | 64×64 或 128×128 |
| `/assets/icons/stadium.png` | 体育场场景图标 | 64×64 或 128×128 |

> 资源文件需要放在前端项目的 `public/assets/` 目录下，与后端返回的路径对应。如果使用不同的路径约定，请同步修改 `app/mock/mock_scene_data.py`。

---

## 附录 A：完整 API 速查表

| 方法 | 路径 | 说明 | 关键请求字段 | 关键响应字段 |
|------|------|------|------------|------------|
| `GET` | `/` | 健康检查 | - | `message` |
| `GET` | `/api/scenes/{id}/config` | 场景配置 | - | `data.sceneId, data.subScenes` |
| `POST` | `/api/dingdang/chat` | **核心对话** | `message`, `conversationId`, `scene` | `success`, `reply`, `conversationId` |
| `GET` | `/api/agent/list` | 智能体列表 | - | `data[].agentId, data[].name` |
| `GET` | `/api/agent/{id}` | 智能体详情 | - | `data.agentId, data.role` |
| `POST` | `/api/agent/ask` | Mock问答 | `agentId`, `question` | `success`, `answer` |
| `POST` | `/api/real-agent/query` | 直连RPC | `conversation_id`, `user_id`, `message` | `ok`, `data.reply` |
| `POST` | `/api/agent-logs` | 记录RPC日志 | `from_agent`, `to_agent` | `ok`, `id` |
| `GET` | `/api/dingdang/messages` | 对话记录 | - | `data[].content, data[].senderType` |
| `GET` | `/api/dingdang/footprints` | 足迹记录 | - | `data[].from, data[].to` |
| `GET` | `/api/dingdang/agent-rpc-logs` | RPC日志 | - | `data[].fromAgent, data[].toAgent` |
| `DELETE` | `/api/dingdang/messages` | 清空消息 | - | `success` |
| `DELETE` | `/api/dingdang/footprints` | 清空足迹 | - | `success` |
| `DELETE` | `/api/dingdang/agent-rpc-logs` | 清空日志 | - | `success` |

---

## 附录 B：联系方式

- 后端负责人：见 git commit 记录
- 仓库地址：`https://github.com/iamroxy-0604/campus-agent-backend`
- 外部 Leader 智能体地址：`http://117.74.66.94:5000/rpc`（可在 `app/services/real_agent_client.py` 中修改）

---

> 📝 **对接时如有任何问题或接口需要调整，请直接提 Issue 或联系后端同学。后端可根据前端需求灵活添加新接口、返回新字段，或调整现有接口的返回格式。**
