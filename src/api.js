// api 是对服务端 /api 的轻量封装，统一错误处理。
// 开发时由 Vite 代理到后端（见 vite.config.js），生产时由后端同源托管。

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    let message = `请求失败（HTTP ${res.status}）`
    try {
      const data = await res.json()
      if (data && data.error) message = data.error
    } catch {
      // 非 JSON 响应，保留默认错误信息
    }
    throw new Error(message)
  }
  return res.json()
}

export const api = {
  // ---- 渠道 ----
  listSources: () => request('/source'),
  createSource: (payload) =>
    request('/source', { method: 'POST', body: JSON.stringify(payload) }),
  updateSource: (id, payload) =>
    request(`/source/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSource: (id) => request(`/source/${id}`, { method: 'DELETE' }),
  listSourceLogs: (id, params = {}) => {
    const qs = new URLSearchParams()
    if (params.limit) qs.set('limit', String(params.limit))
    const s = qs.toString()
    return request(`/source/${id}/logs${s ? `?${s}` : ''}`)
  },
  probeSource: (payload) =>
    request('/source/probe', { method: 'POST', body: JSON.stringify(payload) }),

  // ---- 采集 ----
  refresh: () => request('/refresh', { method: 'POST' }),

  // ---- 条目 ----
  listEntries: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.page && params.page > 1) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('page_size', String(params.pageSize))
    if (params.sourceId) qs.set('source_id', String(params.sourceId))
    if (params.read != null) qs.set('read', String(params.read))
    if (params.favorite != null) qs.set('favorite', String(params.favorite))
    if (params.archive != null) qs.set('archive', String(params.archive))
    const s = qs.toString()
    return request(`/entry/list${s ? `?${s}` : ''}`)
  },
  getEntry: (id) => request(`/entry/${id}`),

  // ---- 阅读状态 ----
  setRead: (id, read) =>
    request(`/entry/${id}/read`, {
      method: 'PUT',
      body: JSON.stringify({ read }),
    }),
  setFavorite: (id, favorite) =>
    request(`/entry/${id}/favorite`, {
      method: 'PUT',
      body: JSON.stringify({ favorite }),
    }),
  setArchive: (id, archive) =>
    request(`/entry/${id}/archive`, {
      method: 'PUT',
      body: JSON.stringify({ archive }),
    }),
  listReadLater: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.page && params.page > 1) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('page_size', String(params.pageSize))
    const s = qs.toString()
    return request(`/entry/read-later${s ? `?${s}` : ''}`)
  },
  setReadLater: (id, readLater) =>
    request(`/entry/${id}/read-later`, {
      method: 'PUT',
      body: JSON.stringify({ read_later: readLater }),
    }),
}

// subscribeRefresh 订阅采集进度 SSE（GET /api/refresh/stream）。
// onEvent 收到解析后的进度事件对象；EventSource 断线会自动重连。
// 返回 EventSource 实例，调用方在组件卸载时 close() 释放。
export function subscribeRefresh(onEvent) {
  const es = new EventSource(BASE + '/refresh/stream')
  es.onmessage = (msg) => {
    try {
      onEvent(JSON.parse(msg.data))
    } catch {
      // 忽略无法解析的事件（如非 JSON 内容）
    }
  }
  return es
}
