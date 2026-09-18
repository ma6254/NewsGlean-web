import Router from '@/router'
import { ConfirmProvider } from '@/components/ConfirmDialog'

function App() {
  return (
    <ConfirmProvider>
      <Router />
    </ConfirmProvider>
  )
}

export default App
