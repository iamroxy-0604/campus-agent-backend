# ACPs 智能体部署指南（北邮小镇）

## 一、产出


已生成两个独立文件：
- `mcd-manager.json` — 麦当劳经理 NPC 智能体
- `player-caiqiyu.json` — 玩家 caiqiyu 个人智能体

---

## 二、部署架构说明

```
+----------------------------------------------------------+
|  实验室服务器  10.106.128.234 (gitlab.local)              |
|  +------------------------+   +------------------------+ |
|  |  GitLab 代码仓库        |   |  智能体 RPC 服务        | |
|  |  - 托管 JSON 配置       |   |  - 接收对话请求         | |
|  |  - CI/CD 自动部署脚本   |   |  - 调用 DeepSeek 回答   | |
|  +------------------------+   +------------------------+ |
|           |                              ^               |
|           |  git push                    |  HTTP/JSONRPC |
+-----------|------------------------------|---------------+
            |                              |
+-----------v------------------------------+---------------+
|  ACPs 注册中心                                           |
|  - 接收注册 JSON                                         |
|  - 分配 AIC 号                                           |
|  - 返回注册凭证                                          |
+----------------------------------------------------------+
```

**关键区分**：
- **GitLab 仓库**：只存代码和配置文件（JSON + 服务源码）。
- **RPC 服务进程**：实际跑对话逻辑的程序，监听某个端口（如 `:8080`），处理 `JSONRPC` 请求。

---

## 三、具体操作步骤

### Step 1：在 GitLab 创建项目

登录 `https://gitlab.local`，创建两个项目（或一个项目下两个目录）：

```
bupt-town-agents/
├── mcd-manager/          # 麦当劳智能体
│   ├── agent.json        # 即 mcd-manager.json
│   └── server.py         # 服务端程序（见下方示例）
└── player-caiqiyu/       # 玩家智能体
    ├── agent.json        # 即 player-caiqiyu.json
    └── server.py
```

### Step 2：把修正后的 JSON 提交到仓库

```bash
git clone https://gitlab.local/bupt-town-agents.git
cd bupt-town-agents

# 复制已生成的文件
cp /path/to/mcd-manager.json mcd-manager/agent.json
cp /path/to/player-caiqiyu.json player-caiqiyu/agent.json

git add .
git commit -m "add acp agent configs"
git push origin main
```

### Step 3：部署实际 RPC 服务（核心）

ACPs 注册只发配置文件还不够，**必须有一个实际运行的 HTTP 服务**来接收对话请求。

#### 方案 A：快速启动（Python Flask，推荐测试用）

在服务器 `10.106.128.234` 上创建 `mcd-manager/server.py`：

```python
from flask import Flask, request, jsonify
app = Flask(__name__)

@app.route('/agents/mcd/rpc', methods=['POST'])
def mcd_rpc():
    data = request.get_json()
    user_question = data.get('params', {}).get('question', '')
    
    # TODO: 接入 DeepSeek 或本地知识库生成回答
    answer = f"【麦当劳经理】收到问题：{user_question}"
    
    return jsonify({
        "jsonrpc": "2.0",
        "result": { "answer": answer },
        "id": data.get("id")
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
```

启动服务：
```bash
python server.py
# 服务将监听 http://10.106.128.234:8080/agents/mcd/rpc
```

#### 方案 B：Node.js（与前端同技术栈）

```javascript
// server.js
const express = require('express');
const app = express();
app.use(express.json());

app.post('/agents/mcd/rpc', (req, res) => {
  const { question } = req.body.params || {};
  // TODO: 接入 DeepSeek API 生成回答
  res.json({
    jsonrpc: '2.0',
    result: { answer: `【麦当劳经理】收到问题：${question}` },
    id: req.body.id
  });
});

app.listen(8080, '0.0.0.0', () => {
  console.log('MCD Agent listening on port 8080');
});
```

### Step 4：向 ACPs 注册中心提交注册

使用你提到的 [`ACPs-CA-Client`](https://github.com/AIP-PUB/ACPs-CA-Client) 工具，或直接用 `curl`：

```bash
# 注册麦当劳智能体
curl -X POST https://acp-registry.example.com/api/v1/agents \
  -H "Content-Type: application/json" \
  -d @mcd-manager/agent.json

# 注册玩家智能体
curl -X POST https://acp-registry.example.com/api/v1/agents \
  -H "Content-Type: application/json" \
  -d @player-caiqiyu/agent.json
```

**注册成功后会返回**：
```json
{
  "aic": "1.2.156.3088.0001.xxxxxx.xxxxxx.x.xxxx",
  "lastModifiedTime": "2026-05-06T12:00:00+08:00",
  "status": "active"
}
```

### Step 5：拿到 AIC 后更新前端

把注册中心返回的 `aic` 号记录到项目配置中：

```js
// config/api.js 或专门的新文件 config/agents.js
export const AGENT_CONFIG = {
  mcdManager: {
    aic: '1.2.156.xxxx....',   // <-- 填入注册返回的 AIC
    endpoint: 'http://10.106.128.234:8080/agents/mcd/rpc'
  },
  playerCaiqiyu: {
    aic: '1.2.156.xxxx....',   // <-- 填入注册返回的 AIC
    endpoint: 'http://10.106.128.234:8080/agents/player-caiqiyu/rpc'
  }
};
```

---

## 四、常见问题

### Q1：必须先跑服务才能注册吗？
**不一定**。有些注册中心允许先提交配置，再部署服务。但 `endPoints` 里的 URL 必须后续可达，否则其他智能体无法调用你。

### Q2：没有公网 IP 怎么办？
你们实验室是内网环境（`10.106.128.234`）。如果注册中心在外网，需要：
- 让注册中心也能访问该 IP（VPN/专线）
- 或在有公网的服务器上做反向代理

### Q3：麦当劳智能体怎么接入 DeepSeek？
在 `server.py` 的 `mcd_rpc()` 函数里，把 `user_question` 透传给 DeepSeek API（复用前端 `intentService.js` 的请求逻辑即可），拿到回答后返回给调用方。

### Q4：玩家智能体需要跑服务吗？
如果只做"交友关系存储"，玩家智能体可以是个**被动接收消息**的轻量服务，主要负责接收好友请求和聊天消息，存到数据库。前端通过 `socialService.js` 调用后端接口管理关系。

---

## 五、下一步行动清单

- [ ] 在 `gitlab.local` 创建 `bupt-town-agents` 仓库
- [ ] 把 `mcd-manager.json` 和 `player-caiqiyu.json` 提交到仓库
- [ ] 在服务器 `10.106.128.234` 上部署一个测试用的 Python/Node 服务（监听 8080）
- [ ] 使用 `ACPs-CA-Client` 或 `curl` 向注册中心提交两个 JSON
- [ ] 记录返回的 AIC 号，更新前端 `config/api.js`
- [ ] 联调：进入麦当劳子场景 → NPC 对话 → 触发智能体调用 → 看到回答
