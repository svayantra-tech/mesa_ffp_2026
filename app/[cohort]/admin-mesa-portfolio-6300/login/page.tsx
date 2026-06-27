import LoginForm from './LoginForm'

export default async function LoginPage({ params }: { params: Promise<{ cohort: string }> }) {
  const { cohort } = await params
  return <LoginForm cohort={cohort} />
}
