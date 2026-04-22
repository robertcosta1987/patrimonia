import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileWizard } from '@/components/profile/profile-wizard'

export default async function PerfilPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('investor_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Perfil do Investidor</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {profile
            ? 'Seu perfil atual. Você pode atualizá-lo a qualquer momento.'
            : 'Responda o questionário para receber análises compatíveis com seu perfil.'
          }
        </p>
      </div>
      <ProfileWizard initialProfile={profile} userId={user.id} />
    </div>
  )
}
