import { useEffect } from 'react'
import '../glow/glow.css'
import LandingHeader from './LandingHeader'
import { useLandingFacts } from './facts'
import Hero from './sections/Hero'
import Problem from './sections/Problem'
import Usages from './sections/Usages'
import HowItWorks from './sections/HowItWorks'
import Services from './sections/Services'
import Benefits from './sections/Benefits'
import AllInOne from './sections/AllInOne'
import Mission from './sections/Mission'
import Pricing from './sections/Pricing'
import Affiliation from './sections/Affiliation'
import ServiceMarquee from './sections/ServiceMarquee'
import Faq from './sections/Faq'
import Cta from './sections/Cta'
import Footer from './sections/Footer'

/**
 * Landing page publique de Numflash, construite sur le design du remix « Glow ».
 * Les chiffres (pays, prix minimum, paliers de recharge, services) viennent du catalogue réel.
 */
export default function LandingPage() {
  const facts = useLandingFacts()

  useEffect(() => {
    const prev = document.title
    document.title = 'Numflash — Numéros virtuels pour vos codes SMS, payés en FCFA'
    return () => {
      document.title = prev
    }
  }, [])

  return (
    <div className="glow-root min-h-screen">
      <LandingHeader />
      <main>
        <Hero facts={facts} />
        <Problem facts={facts} />
        <Usages />
        <HowItWorks facts={facts} />
        <Services />
        <Benefits facts={facts} />
        <AllInOne facts={facts} />
        <Mission />
        <Pricing facts={facts} />
        <Affiliation />
        <ServiceMarquee facts={facts} />
        <Faq facts={facts} />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
