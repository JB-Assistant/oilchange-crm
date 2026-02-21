import { createProductClient }  from '@/lib/supabase/server'
import { provisionNewUser }     from '@/lib/supabase/auth'
import { NextResponse }         from 'next/server'

// ← Change these two per app
const APP      = 'otto'
const INDUSTRY = 'auto'
// otto        → auto
// tire_v2     → tire
// fieldagent_ai → field_service
// otto_v2     → auto

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code    = searchParams.get('code')
  const orgName = searchParams.get('org_name') ?? 'My Business'

  if (code) {
    const supabase = await createProductClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)

    if (data?.user) {
      // Check if already onboarded
      const platform = await createProductClient()
      const { data: existing } = await platform
        .from('user_apps')
        .select('id')
        .eq('user_id', data.user.id)
        .eq('app', APP)
        .maybeSingle()

      // First time — create their org
      if (!existing) {
        await provisionNewUser({
          userId:   data.user.id,
          orgName,
          app:      APP,
          industry: INDUSTRY,
        })
      }
    }
  }

  return NextResponse.redirect(new URL('/dashboard', origin))
}
