// 通用工具函数。

// fmtTime 把 RFC3339 时间字符串格式化为本地可读时间。
export function fmtTime(s) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', { hour12: false })
}

// fmtRelativeTime 把 RFC3339 时间格式化为相对时间（如「3分钟前」）。
// 较近的时间用相对表述；超过 thresholdMs（默认 7 天）则回退到完整时间。
export function fmtRelativeTime(s, thresholdMs = 7 * 24 * 60 * 60 * 1000) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const diff = Date.now() - d.getTime()
  if (diff < 0) return fmtTime(s) // 未来时间，直接给完整时间
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '刚刚'
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`
  if (diff < day) return `${Math.floor(diff / hour)}小时前`
  if (diff < thresholdMs) return `${Math.floor(diff / day)}天前`
  return fmtTime(s)
}

// stripHtml 去掉 HTML 标签与实体，返回纯文本（用于列表摘要展示）。
export function stripHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}
