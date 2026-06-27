import AdminNav from '../_components/AdminNav'

export default async function PanelLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ cohort: string }>
}) {
  const { cohort } = await params
  return (
    <div className="admin-shell">
      <AdminNav cohort={cohort} />
      <main className="admin-main">{children}</main>
    </div>
  )
}
