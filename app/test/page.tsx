// apps/cleanbuddy/app/test/page.tsx
import { createProductClient } from '@/lib/supabase/server'

export default async function TestPage() {
  const supabase = await createProductClient()
  const { data, error } = await supabase.from('businesses').select('*')

  return (
    <div>
      <h1>OttoManagerPro DB Test</h1>
      {error
        ? <p style={{color:'red'}}>Error: {error.message}</p>
        : <p style={{color:'green'}}>✅ Connected — {data?.length ?? 0} businesses</p>
      }
    </div>
  )
}