import { Gift } from 'lucide-react'
import { formatFCFA } from '@/lib/utils'
import { Reveal, spring } from '../../glow/primitives'
import { AFFILIATE_REWARD_XOF } from '../facts'
import { StickyCard, type CardDef } from './HowItWorks'
import { PrimaryLink } from '../ui'

const CARD: CardDef = {
  theme: 'blue',
  pill: { icon: Gift, label: 'Programme d’affiliation' },
  title: `${formatFCFA(AFFILIATE_REWARD_XOF)} à chaque achat de vos filleuls`,
  text: 'Partagez votre lien de parrainage. Vos gains s’accumulent sans limite et se retirent en Mobile Money : Orange Money, MTN, Moov ou Wave.',
  items: ['Lien de parrainage unique', 'Filleuls illimités, gains cumulables', 'Suivi de vos gains en temps réel'],
  phone: { tab: 'Affiliation', sections: ['link', 'referrals'] },
  imageFirst: false,
  sticky: { top: 0, pb: 0 },
  phonePos: { desktop: 6, tablet: 3 },
}

const STEPS = [
  { title: 'Partagez votre lien', text: 'Récupérez votre lien de parrainage dans votre espace et envoyez-le à vos proches.' },
  { title: 'Vos filleuls achètent', text: `Chaque numéro acheté par un filleul vous rapporte ${formatFCFA(AFFILIATE_REWARD_XOF)}.` },
  { title: 'Retirez vos gains', text: 'Demandez un retrait en Mobile Money : le paiement est effectué sous 24 h.' },
]

export default function Affiliation() {
  return (
    <section id="affiliation" className="flex scroll-mt-16 flex-col items-center gap-5 px-4 py-12 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col gap-5">
        <StickyCard c={CARD} sticky={false} cta={{ to: '/inscription', label: 'Devenir affilié' }} total={{ label: 'Gains d’affiliation', amount: 6500 }} />
        <div className="grid w-full grid-cols-1 gap-5 min-[810px]:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} from={{ y: 60 }} transition={spring(0, 0.5, i * 0.1)} amount={0.5} className="flex flex-col gap-3 rounded-3xl bg-[var(--glow-bg)] p-6">
              <span className="font-glow-mono text-[20px] font-bold leading-[20px] text-[var(--glow-blue)]">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] text-black">{s.title}</h3>
              <p className="text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90">{s.text}</p>
            </Reveal>
          ))}
        </div>
        {/* Le lien de la carte n'apparaît qu'en grand écran (comme le modèle) : bouton dédié ailleurs. */}
        <PrimaryLink to="/inscription" large className="w-full min-[1200px]:hidden">
          Devenir affilié
        </PrimaryLink>
      </div>
    </section>
  )
}
