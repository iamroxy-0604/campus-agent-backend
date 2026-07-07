// services/intentService.js
import { API_CONFIG } from '../config/api.js';
import { sendToLeader } from './agentService.js';

/**
 * 识别用户意图（通过用户智能体）
 * @param {string} userInput
 * @returns {Promise<{intent: string, target: string|null, query: string, reply: string}>}
 */
export async function recognizeIntent(userInput) {
  // 优先使用用户智能体进行意图识别
  if (API_CONFIG.LEADER_AGENT_URL && !API_CONFIG.DEBUG_FORCE_FALLBACK) {
    try {
      const result = await sendToLeader(userInput);
      return {
        intent: result.intent,
        target: result.targetScene,
        query: userInput,
        reply: result.reply
      };
    } catch (err) {
      console.error('[IntentService] 用户智能体调用失败，降级到本地匹配', err);
      return fallbackIntent(userInput);
    }
  }
  
  return fallbackIntent(userInput);
}

function fallbackIntent(userInput) {
  const text = userInput.toLowerCase();
  
  // 本地关键词匹配
  if (text.includes('麦当劳') || text.includes('巨无霸') || text.includes('汉堡')) {
    return { intent: 'navigate', target: 'McDonaldScene', query: userInput, reply: '正在前往麦当劳...' };
  }
  if (text.includes('体育馆') || text.includes('健身') || text.includes('运动')) {
    return { intent: 'navigate', target: 'GymScene', query: userInput, reply: '正在前往体育馆...' };
  }
  if (text.includes('院长') || text.includes('办公室')) {
    return { intent: 'navigate', target: 'OfficeScene', query: userInput, reply: '正在前往院长办公室...' };
  }
  
  return { intent: 'unknown', target: null, query: userInput, reply: '我不太明白你的意思，试试说"去麦当劳"或"去体育馆"吧' };
}