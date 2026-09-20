import StateList from '../../components/StateList'
import './index.css'

// ReadLater 是「稍后再阅」页：展示标记为稍后再阅的条目，可一键移除。
export default function ReadLater() {
  return (
    <StateList
      title="稍后再阅"
      emptyTitle="暂无稍后再阅"
      emptyHint="在阅读列表或详情页点击「稍后再阅」收藏条目。"
      loadKind="read-later"
      removeField="read_later"
    />
  )
}
