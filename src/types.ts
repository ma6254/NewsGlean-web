// 与后端 DTO 对齐的前端类型定义（见 NewsGlean-Server 的 entry_api.go / source_api.go）。

/** 条目（EntryDTO）。 */
export interface Entry {
  id: number
  source_id: number
  guid: string
  url: string
  title: string
  author: string
  published_at: string
  summary: string
  content: string
  content_type: string
  tags: string[]
  extra: Record<string, string>
  fetched_at: string
  read: boolean
  favorite: boolean
  archive: boolean
  read_later: boolean
}

/** 渠道（SourceDTO）。 */
export interface Source {
  id: number
  name: string
  type: string
  config?: { url?: string }
  interval: number
  enabled: boolean
  fail_count: number
  fetch_count: number
  success_count: number
  success_rate: number
  last_elapsed_ms: number
  last_entry_at: string
  last_success_at: string
  last_error: string
  created_at: string
}

/** 新增 / 编辑渠道时提交的载荷。 */
export interface SourcePayload {
  name: string
  type: string
  config: { url: string }
  interval: number
  enabled: boolean
}

/** 条目列表响应体。 */
export interface EntryListResponse {
  items: Entry[]
  total: number
  page: number
  page_size: number
}
