/**
 * 好友关系服务（斯坦福小镇式社交系统）
 * 职责：管理用户好友关系、历史对话、用户档案
 *
 * 核心概念：
 * - aicId：用户唯一身份标识（由后端/认证服务发放）
 * - 关系双向存储，支持好友申请、接受、删除
 * - 历史对话按 (userA, userB) 键值对存储
 *
 * 接口规范：
 * - 所有涉及用户标识的参数均为 aicId {string}
 * - 返回 Promise<object>，统一含 { success: boolean, data?: any, error?: string }
 */

import { API_CONFIG } from '../config/api.js';

/**
 * 获取用户档案
 * @param {string} aicId
 * @returns {Promise<{success: boolean, data?: {aicId, name, avatar, friends: string[]}}>}
 */
export async function getUserProfile(aicId) {
  // TODO: GET /api/user/{aicId}
  return mockFallback({ aicId, name: '游客', avatar: '', friends: [] });
}

/**
 * 申请添加好友
 * @param {string} fromAicId
 * @param {string} toAicId
 * @returns {Promise<{success: boolean}>}
 */
export async function addFriend(fromAicId, toAicId) {
  // TODO: POST /api/social/friend-request
  return { success: true };
}

/**
 * 获取好友列表
 * @param {string} aicId
 * @returns {Promise<{success: boolean, data?: {aicId, name}[]}>}
 */
export async function getFriendList(aicId) {
  // TODO: GET /api/social/friends?aicId=xxx
  return { success: true, data: [] };
}

/**
 * 获取两个用户之间的历史对话
 * @param {string} userA
 * @param {string} userB
 * @returns {Promise<{success: boolean, data?: {from, to, message, timestamp}[]}>}
 */
export async function getChatHistory(userA, userB) {
  // TODO: GET /api/social/chat-history?a=xxx&b=xxx
  return { success: true, data: [] };
}

/**
 * 保存对话消息
 * @param {string} from
 * @param {string} to
 * @param {string} message
 * @returns {Promise<{success: boolean}>}
 */
export async function saveChatMessage(from, to, message) {
  // TODO: POST /api/social/chat-message
  console.log('[SocialService] saveChatMessage', { from, to, message });
  return { success: true };
}

function mockFallback(data) {
  return { success: true, data };
}
