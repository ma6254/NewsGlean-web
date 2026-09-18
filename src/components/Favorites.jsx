import StateList from './StateList'

// Favorites 是「收藏」页：展示标记为收藏的条目，可一键取消收藏。
export default function Favorites() {
  return (
    <StateList
      title="收藏"
      emptyTitle="暂无收藏"
      emptyHint="在阅读列表或详情页点击「收藏」。"
      loadKind="favorite"
      removeField="favorite"
    />
  )
}
