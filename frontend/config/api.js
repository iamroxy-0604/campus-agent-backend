/**
 * API 全局配置
 */
export const API_CONFIG = {
  // DeepSeek 意图识别（备用，优先使用用户智能体）
  DEEPSEEK_API_KEY: import.meta.env.VITE_DEEPSEEK_API_KEY || '',
  DEEPSEEK_BASE_URL: 'https://api.deepseek.com',
  DEEPSEEK_MODEL: 'deepseek-chat',

  // 后端服务基地址
  BACKEND_BASE_URL: 'http://127.0.0.1:8000',
  BASE_URL: 'http://127.0.0.1:8000',

  // ========== 智能体服务地址 ==========
  // 用户智能体 Leader（意图识别 + 路由）
  LEADER_AGENT_URL: 'http://117.74.66.94:5000/rpc',

  // 麦当劳 Partner（直连备用）
  MCDONALD_PARTNER_URL: 'http://117.74.66.94:5001/rpc',

  // 调试开关
  DEBUG_FORCE_FALLBACK: false
};