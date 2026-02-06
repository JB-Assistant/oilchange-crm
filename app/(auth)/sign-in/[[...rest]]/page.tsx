import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-zinc-600">Sign in to access your dashboard</p>
        </div>
        <SignIn 
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg'
            }
          }}
        />
      </div>
    </div>
  )
}
