import { API_CONFIG } from '../config/api.js';

/**
 * 叮当统一入口服务
 *
 * 前端职责：
 * - 只把用户输入发给后端
 * - 不做意图识别
 * - 不调用 DeepSeek
 * - 不选择 Agent
 *
 * 后端职责：
 * - 意图识别
 * - 场景判断
 * - Agent 选择
 * - Footprint 记录
 * - 返回 action 和 reply
 */
export async function sendDingdangMessage({
  aicId = 'AIC_001',
  conversationId = null,
  message,
  scene = 'CampusScene',
  context = {}
}) {
  if (!message || !message.trim()) {
    return {
      success: false,
      intent: 'unknown',
      targetScene: null,
      selectedAgent: null,
      action: {
        type: 'unknown',
        scene
      },
      reply: '请输入你想说的话。'
    };
  }

  console.log('[dingdangService] 发送给后端:', {
    aicId,
    conversationId,
    message,
    scene,
    context
  });

  const response = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/api/dingdang/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      aicId,
      conversationId,
      message,
      scene,
      context
    })
  });

  if (!response.ok) {
    throw new Error(`Dingdang API error: ${response.status}`);
  }

  const data = await response.json();

  console.log('[dingdangService] 后端返回:', data);

  return data;
}