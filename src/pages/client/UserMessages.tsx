import { useEffect, useState } from 'react'
import { Info, Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/*
 * Messages envoyés par l'administration : affichés en haut de l'espace client jusqu'à ce que le
 * client clique sur « J'ai compris ». Une seule lecture à l'ouverture de l'espace (pas de polling).
 */

export interface UserMessage {
  id: string
  title: string
  body: string
  level: 'info' | 'warning'
  created_at: string
}

const dateFmt = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export function MessageCard({
  message,
  onDismiss,
  busy = false,
  preview = false,
}: {
  message: Pick<UserMessage, 'title' | 'body' | 'level'> & { created_at?: string }
  onDismiss?: () => void
  busy?: boolean
  /** Aperçu dans l'administration : bouton inactif. */
  preview?: boolean
}) {
  const warning = message.level === 'warning'
  const I = warning ? TriangleAlert : Info
  return (
    <section
      role={preview ? undefined : 'status'}
      className={cn(
        'flex flex-col gap-3 rounded-[24px] p-4 ring-1 ring-inset min-[810px]:flex-row min-[810px]:items-start min-[810px]:gap-4 min-[810px]:p-5',
        warning ? 'bg-[rgb(255,248,235)] ring-[rgb(253,224,170)]' : 'bg-[rgb(236,246,255)] ring-[rgb(196,226,252)]',
      )}
    >
      <span
        className={cn(
          'hidden h-10 w-10 shrink-0 items-center justify-center rounded-full min-[810px]:flex',
          warning ? 'bg-[rgb(255,236,204)] text-[rgb(178,98,0)]' : 'bg-white text-[var(--glow-blue)]',
        )}
      >
        <I className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn('flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.4px]', warning ? 'text-[rgb(178,98,0)]' : 'text-[var(--glow-blue-dark)]')}>
          <I className="h-4 w-4 shrink-0 min-[810px]:hidden" strokeWidth={2.2} aria-hidden />
          Message de l’équipe Numflash
        </span>
        <h2 className="text-[17px] font-semibold leading-[22px] tracking-[-0.3px] text-black [overflow-wrap:anywhere]">{message.title || 'Titre du message'}</h2>
        <p className="whitespace-pre-line text-[15px] leading-[22px] text-[var(--glow-text)] [overflow-wrap:anywhere]">{message.body || 'Texte du message'}</p>
        {message.created_at ? <span className="pt-0.5 text-[12px] text-[var(--glow-gray)]">{dateFmt.format(new Date(message.created_at))}</span> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        disabled={preview || busy}
        className={cn(
          'inline-flex h-10 shrink-0 items-center justify-center gap-1.5 self-stretch rounded-xl px-4 text-[14px] font-medium text-white transition-colors min-[810px]:self-center',
          warning ? 'bg-[rgb(178,98,0)] hover:bg-[rgb(150,82,0)]' : 'bg-[var(--glow-blue)] hover:bg-[var(--glow-blue-dark)]',
          preview && 'cursor-default',
          busy && 'opacity-70',
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2.2} aria-hidden /> : null}
        J’ai compris
      </button>
    </section>
  )
}

export default function UserMessages() {
  const { user } = useAuth()
  const userId = user?.id
  const [messages, setMessages] = useState<UserMessage[]>([])
  const [busy, setBusy] = useState<string | null>(null)

  useEffect(() => {
    if (!userId) return
    let active = true
    // Filtre explicite sur l'utilisateur : un administrateur peut lire tous les messages (RLS).
    void supabase
      .from('user_messages')
      .select('id, title, body, level, created_at')
      .eq('user_id', userId)
      .is('read_at', null)
      .order('created_at', { ascending: true })
      .limit(5)
      .then(({ data }) => {
        if (active && data) setMessages(data as UserMessage[])
      })
    return () => {
      active = false
    }
  }, [userId])

  async function dismiss(id: string) {
    setBusy(id)
    const { error } = await supabase.rpc('mark_user_message_read', { p_message_id: id })
    setBusy(null)
    if (error) return void toast.error('Le message n’a pas pu être marqué comme lu. Réessayez.')
    setMessages((list) => list.filter((m) => m.id !== id))
  }

  if (messages.length === 0) return null
  return (
    <div className="mb-5 flex flex-col gap-3 min-[810px]:mb-6">
      {messages.map((m) => (
        <MessageCard key={m.id} message={m} busy={busy === m.id} onDismiss={() => void dismiss(m.id)} />
      ))}
    </div>
  )
}
