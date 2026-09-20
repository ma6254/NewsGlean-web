import StateList from '../../components/StateList'
import './index.css'

// Archive 是「归档」页：展示标记为归档的条目，可一键取消归档。
export default function Archive() {
  return (
    <StateList
      title="归档"
      emptyTitle="暂无归档"
      emptyHint="在阅读列表或详情页点击「归档」，条目将从收件箱移入此处。"
      loadKind="archive"
      removeField="archive"
    />
  )
}
