import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function Layout({ children }) {
  return (
    <div className="h-screen flex flex-col">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-muted/20 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
