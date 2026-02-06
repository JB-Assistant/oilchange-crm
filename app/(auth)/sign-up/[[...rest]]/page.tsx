import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Start your free trial</h1>
          <p className="text-zinc-600">No credit card required. 14 days free.</p>
        </div>
        <SignUp 
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
