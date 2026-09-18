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

  // ---- 采集 ----
  refresh: () => request('/refresh', { method: 'POST' }),

  // ---- 条目 ----
  listEntries: (params = {}) => {
    const qs = new URLSearchParams()
    if (params.page && params.page > 1) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('page_size', String(params.pageSize))
    if (params.sourceId) qs.set('source_id', String(params.sourceId))
    const s = qs.toString()
    return request(`/entry/list${s ? `?${s}` : ''}`)
  },
  getEntry: (id) => request(`/entry/${id}`),
}
