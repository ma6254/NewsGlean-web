import { splitHighlight } from '../utils'

interface HighlightProps {
  text: string
  keyword?: string
}

// Highlight 把命中关键词的片段用 <mark> 高亮（搜索结果用）。
// 关键词为空或未命中时按原文本输出。
export default function Highlight({ text, keyword }: HighlightProps) {
  if (!keyword || !keyword.trim()) return <>{text}</>
  const parts = splitHighlight(text, keyword)
  return (
    <>
      {parts.map((p, i) =>
        p.hit ? (
          <mark key={i} className="rounded-sm bg-amber-200 text-inherit">
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  )
}
