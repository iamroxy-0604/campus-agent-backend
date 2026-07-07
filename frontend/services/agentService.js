// services/agentService.js
import { API_CONFIG } from '../config/api.js';

const AGENT_REGISTRY = {
  gym_admin: {
    name: '体育馆管理员',
    scene: 'GymScene',
    agentId: 'gym_admin'
  },
  mcd_manager: {
    name: '麦当劳餐厅服务员',
    scene: 'McDonaldScene',
    agentId: 'mcd_manager'
  },
  dean_chen: {
    name: '陈院长',
    scene: 'OfficeScene',
    agentId: 'dean_chen'
  }
};

function getConversationId() {
  let conversationId = localStorage.getItem('conversationId');

  if (!conversationId) {
    conversationId = `C_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('conversationId', conversationId);
  }

  return conversationId;
}

/**
 * 向智能体提问（子场景 NPC 对话用）
 */
export async function askAgent(agentId, question) {
  const agent = AGENT_REGISTRY[agentId];

  if (!agent) {
    return {
      answer: `未找到智能体: ${agentId}`,
      agentId,
      error: true,
      success: false
    };
  }

  let conversationId = localStorage.getItem('conversationId');
  if (!conversationId) {
    conversationId = `C_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem('conversationId', conversationId);
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/dingdang/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationId,
        userId: 'U_001',
        agentId,
        aicId: agentId,
        message: question,
        scene: agent.scene,
        source: 'npc_dialog'
      })
    });

    const data = await response.json();

    if (!response.ok || data.success === false) {
      throw new Error(data.error || data.detail || '后端智能体请求失败');
    }

    return {
      answer: data.answer || data.reply || '抱歉，我没有拿到智能体回复。',
      agentId,
      source: data.source,
      success: true,
      raw: data
    };
  } catch (error) {
    console.error('[AgentService] 智能体调用失败:', error);

    return {
      answer: `连接智能体失败: ${error.message}`,
      agentId,
      error: true,
      success: false
    };
  }
}

export async function getAgentInfo(agentId) {
  return AGENT_REGISTRY[agentId] || null;
}

export async function getAgentsByScene(sceneKey) {
  return Object.entries(AGENT_REGISTRY)
    .filter(([, v]) => v.scene === sceneKey)
    .map(([id, v]) => ({ id, ...v }));
}