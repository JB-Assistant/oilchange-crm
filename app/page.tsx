import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import LandingPage from './(marketing)/page'

export default async function Home() {
  const { userId } = await auth()
  
  if (userId) {
    redirect('/dashboard')
  }
  
  return <LandingPage />
}
