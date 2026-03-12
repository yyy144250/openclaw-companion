/**
 * 跨窗口事件桥接层
 *
 * 架构：
 *   mascot 窗口 —— 拥有唯一的 WebSocket 连接
 *   chat   窗口 —— 通过 Tauri 事件与 mascot 通信
 *
 * 事件约定（全部通过 Tauri emit/listen）：
 *   mascot → chat:
 *     "ws:status"        { connected: boolean }
 *     "ws:chat_response"  ServerMessage.payload（与之前 wsService.on('chat_response') 相同）
 *     "ws:live2d_action"  ServerMessage.payload
 *
 *   chat → mascot:
 *     "ws:send_chat"      { text: string, images?: string[] }
 *     "ws:connect"        { config: ServerConfig }
 *     "ws:disconnect"     {}
 */

import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import type { ServerConfig } from '../types';

// ===== 事件名称常量 =====
export const EVT = {
  /** mascot → chat: 连接状态变化 */
  STATUS: 'ws:status',
  /** mascot → chat: 聊天回复 */
  CHAT_RESPONSE: 'ws:chat_response',
  /** mascot → chat: Live2D 动作 */
  LIVE2D_ACTION: 'ws:live2d_action',

  /** chat → mascot: 发送聊天消息 */
  SEND_CHAT: 'ws:send_chat',
  /** chat → mascot: 请求连接 */
  CONNECT: 'ws:connect',
  /** chat → mascot: 请求断开 */
  DISCONNECT: 'ws:disconnect',
  /** chat → mascot: 请求同步当前状态（chat 窗口刚打开时使用） */
  STATUS_SYNC: 'ws:status_sync',
} as const;

// ===== mascot 端：广播事件 =====

/** 广播连接状态给其他窗口 */
export function broadcastStatus(connected: boolean) {
  emit(EVT.STATUS, { connected }).catch(console.error);
}

/** 广播聊天回复给其他窗口 */
export function broadcastChatResponse(payload: any) {
  emit(EVT.CHAT_RESPONSE, payload).catch(console.error);
}

/** 广播 Live2D 动作给其他窗口 */
export function broadcastLive2DAction(payload: any) {
  emit(EVT.LIVE2D_ACTION, payload).catch(console.error);
}

// ===== chat 端：发送请求 =====

/** 请求 mascot 代发聊天消息 */
export function requestSendChat(text: string, images?: string[]) {
  emit(EVT.SEND_CHAT, { text, images }).catch(console.error);
}

/** 请求 mascot 连接到指定服务器 */
export function requestConnect(config: ServerConfig) {
  emit(EVT.CONNECT, { config }).catch(console.error);
}

/** 请求 mascot 断开连接 */
export function requestDisconnect() {
  emit(EVT.DISCONNECT, {}).catch(console.error);
}

/** 请求 mascot 同步当前连接状态（chat 窗口刚打开时调用） */
export function requestStatusSync() {
  emit(EVT.STATUS_SYNC, {}).catch(console.error);
}

// ===== 监听工具 =====

/** 监听连接状态变化（chat 窗口使用） */
export function onStatus(handler: (connected: boolean) => void): Promise<UnlistenFn> {
  return listen<{ connected: boolean }>(EVT.STATUS, (e) => handler(e.payload.connected));
}

/** 监听聊天回复（chat 窗口使用） */
export function onChatResponse(handler: (payload: any) => void): Promise<UnlistenFn> {
  return listen(EVT.CHAT_RESPONSE, (e) => handler(e.payload));
}

/** 监听 Live2D 动作（chat 窗口不需要，留作扩展） */
export function onLive2DAction(handler: (payload: any) => void): Promise<UnlistenFn> {
  return listen(EVT.LIVE2D_ACTION, (e) => handler(e.payload));
}

/** 监听发送聊天请求（mascot 窗口使用） */
export function onSendChat(handler: (text: string, images?: string[]) => void): Promise<UnlistenFn> {
  return listen<{ text: string; images?: string[] }>(EVT.SEND_CHAT, (e) => {
    handler(e.payload.text, e.payload.images);
  });
}

/** 监听连接请求（mascot 窗口使用） */
export function onConnectRequest(handler: (config: ServerConfig) => void): Promise<UnlistenFn> {
  return listen<{ config: ServerConfig }>(EVT.CONNECT, (e) => handler(e.payload.config));
}

/** 监听断开请求（mascot 窗口使用） */
export function onDisconnectRequest(handler: () => void): Promise<UnlistenFn> {
  return listen(EVT.DISCONNECT, () => handler());
}

/** 监听状态同步请求（mascot 窗口使用，收到后回报当前状态） */
export function onStatusSyncRequest(handler: () => void): Promise<UnlistenFn> {
  return listen(EVT.STATUS_SYNC, () => handler());
}
