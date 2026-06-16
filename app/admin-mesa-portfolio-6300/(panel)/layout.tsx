import AdminNav from '../_components/AdminNav'

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminNav />
      <main className="admin-main">{children}</main>
    </div>
  )
}
