// 通用工具函数。

// fmtTime 把 RFC3339 时间字符串格式化为本地可读时间。
export function fmtTime(s) {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', { hour12: false })
}

// stripHtml 去掉 HTML 标签与实体，返回纯文本（用于列表摘要展示）。
export function stripHtml(html) {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}
