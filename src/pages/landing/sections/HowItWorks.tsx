import { Globe2, MessageSquareText, Wallet, type LucideIcon } from 'lucide-react'
import { cn, formatFCFA } from '@/lib/utils'
import { PhoneFrame } from '../../glow/Phone'
import { CheckItem, Reveal, spring } from '../../glow/primitives'
import { useBreakpoint } from '../../glow/useBreakpoint'
import { AppScreen, type AppSection, type AppTab } from '../AppScreen'
import type { LandingFacts } from '../facts'
import { ArrowLink, Pill } from '../ui'

interface CardDef {
  theme: 'blue' | 'white' | 'gray'
  pill: { icon: LucideIcon; label: string }
  title: string
  text: string
  items: string[]
  phone: { tab: AppTab; sections: AppSection[] }
  imageFirst: boolean
  sticky: { top: number; pb: number }
  phonePos: { desktop: number; tablet: number }
}

function cards(facts: LandingFacts): CardDef[] {
  return [
    {
      theme: 'blue',
      pill: { icon: MessageSquareText, label: 'Temps réel' },
      title: 'Votre code s’affiche dès qu’il arrive',
      text: 'Inutile d’actualiser la page : le SMS de vérification apparaît automatiquement dans votre espace, avec le code mis en évidence.',
      items: ['Réception automatique', 'Historique de vos codes', 'Remboursé sans SMS'],
      phone: { tab: 'SMS', sections: ['codes', 'numbers'] },
      imageFirst: false,
      sticky: { top: 70, pb: 70 },
      phonePos: { desktop: 6, tablet: 3 },
    },
    {
      theme: 'white',
      pill: { icon: Globe2, label: 'Catalogue' },
      title: `Le bon numéro, dans ${facts.countries} pays`,
      text: 'Choisissez le service, puis le pays : le prix en FCFA et la disponibilité s’affichent avant l’achat.',
      items: ['Prix affiché avant l’achat', 'Stock et prix actualisés en continu', 'Numéro privé, à usage unique'],
      phone: { tab: 'Services', sections: ['services', 'numbers'] },
      imageFirst: true,
      sticky: { top: 100, pb: 35 },
      phonePos: { desktop: 71, tablet: 131 },
    },
    {
      theme: 'gray',
      pill: { icon: Wallet, label: 'Portefeuille' },
      title: 'Rechargez en Mobile Money',
      text: 'Orange Money, MTN, Moov, Wave ou carte bancaire : votre solde est crédité dès que le paiement est confirmé.',
      items: [`Recharge dès ${formatFCFA(facts.topupTiers[0])}`, 'Crédit après confirmation', 'Historique de vos opérations'],
      phone: { tab: 'Solde', sections: ['history', 'wallet'] },
      imageFirst: false,
      sticky: { top: 130, pb: 0 },
      phonePos: { desktop: 6, tablet: 3 },
    },
  ]
}

const THEMES = {
  blue: {
    box: '',
    style: {
      backgroundImage: 'linear-gradient(145deg, #0085ee 0%, rgb(114, 189, 247) 100%)',
      boxShadow:
        'rgba(52, 217, 217, 0.01) 0px 0.602187px 3.01094px 0px inset, rgba(52, 217, 217, 0.03) 0px 2.28853px 11.4427px 0px inset, rgba(52, 217, 217, 0.14) 0px 10px 50px 0px inset',
    },
    title: 'text-[var(--glow-bg)]',
    text: 'text-[var(--glow-bg)]',
    link: 'var(--glow-bg)',
  },
  white: { box: 'bg-white ring-2 ring-inset ring-[rgb(235,235,235)]', style: {}, title: 'text-black', text: 'text-[var(--glow-text)]', link: '#000' },
  gray: { box: 'bg-[var(--glow-bg)] ring-2 ring-inset ring-[rgb(235,235,235)]', style: {}, title: 'text-black', text: 'text-[var(--glow-text)]', link: '#000' },
}

export function StickyCard({ c, cta = { to: '/inscription', label: 'Créer un compte' }, sticky = true, total }: { c: CardDef; cta?: { to: string; label: string }; sticky?: boolean; total?: { label: string; amount: number } }) {
  const bp = useBreakpoint()
  const t = THEMES[c.theme]
  const phoneScale = bp === 'desktop' ? 1 : 0.7
  const phoneLeft = bp === 'desktop' ? c.phonePos.desktop : bp === 'tablet' ? c.phonePos.tablet : -137
  const phoneTop = bp === 'desktop' ? 50 : bp === 'tablet' ? 36 : 3
  const pb = bp === 'mobile' || !sticky ? 0 : c.sticky.pb
  return (
    <section className={cn('z-[1] flex w-full justify-center', sticky && 'sticky')} style={{ top: sticky ? c.sticky.top : undefined, paddingBottom: pb }}>
      <div
        className={cn(
          'flex w-full flex-col gap-[31px] overflow-hidden rounded-[48px] min-[810px]:h-[490px] min-[810px]:flex-row min-[810px]:gap-8 min-[1200px]:h-[600px] min-[1200px]:gap-16',
          t.box,
        )}
        style={t.style}
      >
        <div className={cn('flex h-[430px] w-full flex-col justify-between p-8 min-[810px]:h-auto min-[810px]:w-[504px] min-[810px]:shrink-0 min-[810px]:p-10 min-[1200px]:w-[587px] min-[1200px]:p-[50px]', c.imageFirst && 'min-[810px]:order-2')}>
          <div className="flex flex-col items-start gap-3 overflow-hidden">
            <Pill icon={c.pill.icon} tone={c.theme === 'blue' ? 'white' : 'blue'}>
              {c.pill.label}
            </Pill>
            <h2 className={cn('font-glow-display text-balance text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]', t.title)}>
              {c.title}
            </h2>
            <p className={cn('text-[17px] leading-[25.5px] tracking-[-0.34px]', t.text)}>{c.text}</p>
            <ul className="flex flex-col py-1.5">
              {c.items.map((i) => (
                <CheckItem key={i} light={c.theme === 'blue'}>
                  {i}
                </CheckItem>
              ))}
            </ul>
          </div>
          <ArrowLink to={cta.to} color={t.link} className="hidden min-[1200px]:inline-flex">
            {cta.label}
          </ArrowLink>
        </div>
        <div
          className={cn('relative h-[366px] w-full shrink-0 overflow-hidden rounded-3xl min-[810px]:h-auto min-[810px]:w-[424px] min-[1200px]:w-[487px]', c.imageFirst && 'min-[810px]:order-1')}
          style={{ WebkitMaskImage: 'linear-gradient(0deg, transparent 2.25225%, #000 25.6757%)', maskImage: 'linear-gradient(0deg, transparent 2.25225%, #000 25.6757%)' }}
        >
          <div className="absolute z-[1]" style={{ left: phoneLeft, top: phoneTop, width: 410 * phoneScale }}>
            <Reveal replay amount={0} from={{ y: 150 }} transition={spring(0, 0.8)}>
              <PhoneFrame>
                <AppScreen tab={c.phone.tab} sections={c.phone.sections} total={total} />
              </PhoneFrame>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

export type { CardDef }

export default function HowItWorks({ facts }: { facts: LandingFacts }) {
  return (
    <section id="fonctionnement" className="flex scroll-mt-16 flex-col items-center gap-8 px-4 py-12 min-[810px]:gap-0 min-[810px]:px-8">
      <div className="flex w-full max-w-[1138px] flex-col items-center gap-8 min-[810px]:gap-0">
        {cards(facts).map((c) => (
          <StickyCard key={c.pill.label} c={c} />
        ))}
      </div>
    </section>
  )
}
