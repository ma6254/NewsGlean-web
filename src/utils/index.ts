// 通用工具函数。

// fmtTime 把 RFC3339 时间字符串格式化为本地可读时间。
export function fmtTime(s: string | null | undefined): string {
  if (!s) return ''
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString('zh-CN', { hour12: false })
}

// fmtRelativeTime 把 RFC3339 时间格式化为相对时间（如「3分钟前」）。
// 较近的时间用相对表述；超过 thresholdMs（默认 7 天）则回退到完整时间。
export function fmtRelativeTime(
  s: string | null | undefined,
  thresholdMs = 7 * 24 * 60 * 60 * 1000,
): string {
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

// fmtMs 把毫秒时长格式化为可读（不足 1 秒用 ms，否则用 s）。
export function fmtMs(ms: number | null | undefined): string {
  if (ms == null || ms < 0) return ''
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

// stripHtml 去掉 HTML 标签与实体，返回纯文本（用于列表摘要展示）。
export function stripHtml(html: string | null | undefined): string {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return (doc.body.textContent || '').replace(/\s+/g, ' ').trim()
}

// escapeRegExp 转义正则特殊字符，让用户关键词按字面量匹配（搜索高亮用）。
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// splitHighlight 按关键词（不区分大小写）把文本切成「命中/未命中」段落。
// 搜索高亮用：渲染层据此把 hit=true 的段落包 <mark>；关键词为空时原样返回。
export function splitHighlight(
  text: string,
  keyword: string,
): Array<{ text: string; hit: boolean }> {
  const kw = keyword.trim()
  if (!text || !kw) return [{ text, hit: false }]
  const re = new RegExp(`(${escapeRegExp(kw)})`, 'gi')
  return text
    .split(re)
    .filter((p) => p !== '')
    .map((p) => ({
      text: p,
      hit: p.toLowerCase() === kw.toLowerCase(),
    }))
}
