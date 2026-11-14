import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Icon, SvgImg, spring } from '../primitives'
import { SmallPill } from './Feature4'

const FAQS = [
  {
    q: 'How do international transfers work?',
    a: 'You can send money globally using local or SWIFT transfers. Simply input the recipient’s account details in the app, select the currency, and confirm. Fees vary based on currency, payment method, and plan. Transfers can be instant or take 1-3 business days.',
  },
  {
    q: 'Can I get a debit card with the service?',
    a: 'Yes, we offer a linked debit card (Visa or Mastercard) for spending and ATM withdrawals. You can order it through the app, with delivery in 5-7 business days. Card replacement fees may apply.',
  },
  {
    q: 'What are the ATM withdrawal limits?',
    a: 'ATM withdrawals are subject to monthly limits, which vary by plan (e.g., $200-$1,000 fee-free). Exceeding the limit may incur fees (e.g., 2% per withdrawal). Check the app for your plan’s specifics.',
  },
  {
    q: 'How do I contact customer support?',
    a: 'Reach out via the in-app chat, email, or our website’s support portal. Response times vary, but we aim to resolve issues within 24-48 hours.',
  },
  {
    q: 'Are there fees for currency exchange or transfers?',
    a: 'Currency exchange is often fee-free up to a monthly limit, depending on your plan. Beyond that, a small fee (e.g., 0.5%-1%) may apply, especially for weekend conversions. International transfer fees depend on the currency and plan, starting as low as $0.39 for USD transfers.',
  },
  {
    q: 'Is the service available in my country?',
    a: 'Our services are available in over 45 countries, but features like BNPL or multi-currency accounts may vary by region.',
  },
]

const SH_INSET = 'rgba(0, 0, 0, 0.05) 0px 0.602187px 2.52919px -1.33333px inset, rgba(0, 0, 0, 0.04) 0px 2.28853px 9.61184px -2.66667px inset, rgba(0, 0, 0, 0.01) 0px 10px 42px -4px inset'
const SH_SOFT =
  'rgba(0, 0, 0, 0.18) 0.301094px 0.602187px 0.673266px -1.25px, rgba(0, 0, 0, 0.16) 1.14427px 2.28853px 2.55866px -2.5px, rgba(0, 0, 0, 0.06) 5px 10px 11.1803px -3.75px'

function SupportCard() {
  return (
    <div className="z-[1] flex w-full flex-col items-center overflow-hidden rounded-3xl bg-[var(--glow-bg)] min-[810px]:sticky min-[810px]:top-[30px] min-[810px]:w-[394px] min-[810px]:shrink-0 min-[1200px]:w-[471px]">
      <figure className="relative h-[168px] w-full">
        <div
          className="absolute inset-y-0 left-[5px] right-[5px] opacity-5"
          style={{
            backgroundImage: 'url(/glow/img/pattern-grid.svg)',
            backgroundSize: '63px auto',
            backgroundPosition: 'left top',
            WebkitMaskImage: 'linear-gradient(180deg, #000 0%, transparent 100%)',
            maskImage: 'linear-gradient(180deg, #000 0%, transparent 100%)',
          }}
        />
        <div className="absolute left-1/2 top-[34px] h-[108px] w-[350px] -translate-x-1/2">
          <SvgImg name="faqLines" className="absolute left-[35px] top-[50px] h-[26px] w-[277px]" />
          <div className="absolute left-[125px] top-0 flex h-[100px] w-[100px] items-center justify-center overflow-hidden rounded-[99px] bg-white" style={{ boxShadow: SH_SOFT }}>
            <SvgImg name="faqQuestion" className="h-[58px] w-[58px]" />
          </div>
          <div className="absolute left-0 top-[38px] flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-[69px] bg-white" style={{ boxShadow: SH_SOFT }}>
            <SvgImg name="faqHeadset" className="h-[31px] w-[34px]" />
          </div>
          <div className="absolute left-[280px] top-[38px] flex h-[70px] w-[70px] items-center justify-center overflow-hidden rounded-[69px] bg-white" style={{ boxShadow: SH_SOFT }}>
            <SvgImg name="faqFolder" className="h-6 w-[27px]" />
          </div>
        </div>
      </figure>
      <div className="z-[1] flex w-full flex-col items-center gap-2 px-6 pb-6 text-center">
        <SmallPill icon="supportCircle">Support</SmallPill>
        <h3 className="font-glow-display text-[18px] font-medium leading-[21.6px] text-black">Can’t find what you’re looking for?</h3>
        <p className="text-[15px] leading-[22.5px] tracking-[-0.3px] text-[var(--glow-text)] opacity-90">Feel free to contact us! We’re here to help!</p>
        <a
          href="mailto:info@example.com"
          className="inline-flex items-center justify-center rounded-lg bg-[var(--glow-blue)] px-4 py-3 text-[16px] font-medium leading-[19.2px] text-white transition-colors hover:bg-[var(--glow-blue-dark)]"
        >
          Contact us
        </a>
      </div>
    </div>
  )
}

function FaqItem({ index, q, a, open, onToggle }: { index: number; q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div
      className={cn('relative w-full overflow-hidden rounded-[20px] transition-colors duration-300', open ? 'bg-white' : 'bg-[var(--glow-bg)]')}
      style={{ boxShadow: SH_INSET }}
    >
      {/* Bordure dessinée par-dessus (comme le pseudo-élément du modèle) : n'occupe aucune place */}
      <span className={cn('pointer-events-none absolute inset-0 rounded-[20px] border transition-colors duration-300', open ? 'border-[var(--glow-line)]' : 'border-transparent')} />
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-6 py-[18px] text-left">
        <span className={cn('font-glow-mono w-6 shrink-0 text-[20px] font-bold leading-[20px] transition-colors', open ? 'text-[var(--glow-blue)]' : 'text-black opacity-25')}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="flex-1 text-[14px] font-medium leading-[21px] tracking-[-0.28px] text-[var(--glow-text)] opacity-95">{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={spring(0.2, 0.4)} className="flex h-6 w-6 shrink-0">
          <Icon name="plus" className="h-6 w-6 text-black" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div key="a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={spring(0, 0.4)}>
            <p className="px-6 pb-6 text-[14px] leading-[21px] tracking-[-0.28px] text-[var(--glow-text)] opacity-[0.9025]">{a}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

export default function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="faqs" className="flex scroll-mt-16 flex-col items-center gap-10 px-4 py-12 min-[810px]:gap-16 min-[810px]:px-8">
      <div className="relative z-[1] flex w-full max-w-[1138px] flex-col items-start gap-3.5 min-[1200px]:flex-row min-[1200px]:items-center">
        <div className="flex w-full flex-col items-start gap-3 overflow-hidden min-[1200px]:w-[624px] min-[1200px]:shrink-0">
          <h3 className="font-glow-display text-[16px] font-medium leading-[16px] tracking-[-0.48px] text-[var(--glow-blue)]">FAQs</h3>
          <h2 className="font-glow-display text-[28px] font-medium leading-[30.8px] tracking-[-1.12px] text-black min-[810px]:text-[36px] min-[810px]:leading-[39.6px] min-[810px]:tracking-[-1.44px] min-[1200px]:text-[48px] min-[1200px]:leading-[52.8px] min-[1200px]:tracking-[-1.92px]">
            Got questions?
            <br />
            <span className="text-[var(--glow-blue)]">We’re here to help!</span>
          </h2>
        </div>
        <p className="text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)] min-[810px]:max-w-[500px] min-[1200px]:w-[500px] min-[1200px]:shrink-0 min-[1200px]:ml-auto">
          Get quick answers to common questions about our app, fees, security, and account features. Can't find what you're looking for? Our support team is here to help 24/7.
        </p>
      </div>
      <div className="flex w-full max-w-[1138px] flex-col items-start gap-10 min-[810px]:min-h-[560px] min-[810px]:flex-row">
        <SupportCard />
        <div className="flex w-full flex-col items-center gap-[18px]">
          {FAQS.map((f, i) => (
            <FaqItem key={f.q} index={i} q={f.q} a={f.a} open={open === i} onToggle={() => setOpen((cur) => (cur === i ? null : i))} />
          ))}
        </div>
      </div>
    </section>
  )
}

