import { useEffect } from 'react'
import './glow.css'
import GlowHeader from './GlowHeader'
import Hero from './sections/Hero'
import Feature1 from './sections/Feature1'
import Feature2 from './sections/Feature2'
import Feature3 from './sections/Feature3'
import Partners from './sections/Partners'
import Feature4 from './sections/Feature4'
import Feature5 from './sections/Feature5'
import Testimonial from './sections/Testimonial'
import Pricing from './sections/Pricing'
import Logos from './sections/Logos'
import Faq from './sections/Faq'
import Cta from './sections/Cta'
import Footer from './sections/Footer'

/**
 * Duplicata de la landing page « Glow » (glow.framer.media), servant de base
 * au futur design de Numflash. Page publique, chargée à la demande.
 */
export default function GlowPage() {
  useEffect(() => {
    const prevTitle = document.title
    document.title = 'Glow — Fintech Mobile App Landing Page Template'
    return () => {
      document.title = prevTitle
    }
  }, [])

  return (
    <div className="glow-root min-h-screen">
      <GlowHeader />
      <main>
        <Hero />
        <Feature1 />
        <Feature2 />
        <Feature3 />
        <Partners />
        <Feature4 />
        <Feature5 />
        <Testimonial />
        <Pricing />
        <Logos />
        <Faq />
        <Cta />
      </main>
      <Footer />
    </div>
  )
}
