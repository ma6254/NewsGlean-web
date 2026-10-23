// 条目正文 HTML 渲染前的 DOMPurify 兜底净化（BUG-001）。
//
// 服务端已在 ingest 层做白名单净化（internal/sanitize），这里作为第二道防线：
// 覆盖修复前入库的存量脏数据，以及未来可能绕过 ingest 净化的写入路径。
// 净化钩子同时给正文图片补 loading="lazy" / decoding="async"（W-24：
// 长文多图不全量加载）；只加属性不改图片地址，不影响 PicViewer 的图片收集。
import DOMPurify from 'dompurify'

// afterSanitizeAttributes：白名单过滤完成后、写回 DOM 前调用，
// 此时残留的都是安全元素，补懒加载属性不会再引入风险。
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node instanceof Element && node.tagName === 'IMG') {
    node.setAttribute('loading', 'lazy')
    node.setAttribute('decoding', 'async')
  }
})

// sanitizeEntryHtml 净化条目正文 HTML，返回可安全注入 innerHTML 的字符串。
//
// DOMPurify 默认配置已剥除 script/事件属性与 javascript: 协议 URL，
// 此处再显式声明禁用清单，与服务端 UGCPolicy 的口径对齐、便于审计：
// 脚本/样式/iframe/表单元素与内联 style 一律丢弃。
export function sanitizeEntryHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'form', 'input', 'svg', 'object', 'embed'],
    FORBID_ATTR: ['style'],
  })
}
