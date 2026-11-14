import EarthJukebox from '@/components/EarthJukebox'
import { appAuth } from '@/lib/app-auth'

export default async function HomePage() {
  const user = await appAuth.currentUser()
  return <EarthJukebox initialUser={user} />
}
