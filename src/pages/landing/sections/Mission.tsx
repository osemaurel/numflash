import { LogoMark } from '../ui'

/** Engagement de Numflash, à la place d'un témoignage (aucun avis client inventé). */
export default function Mission() {
  return (
    <section className="relative flex flex-col items-center overflow-hidden px-8 pb-[120px] pt-16 min-[810px]:h-[349px] min-[810px]:flex-row min-[810px]:items-center min-[810px]:justify-center min-[810px]:py-0">
      <div
        className="absolute bottom-0 left-1/2 z-[1] h-px w-[762px] -translate-x-1/2 overflow-hidden"
        style={{ backgroundImage: 'linear-gradient(90deg, rgba(51, 170, 255, 0) 0%, #0085ee 50%, rgba(181, 223, 255, 0) 100%)' }}
      />
      <div
        className="absolute bottom-[-356px] left-1/2 z-[1] h-[409px] w-[864px] -translate-x-1/2 overflow-hidden rounded-full opacity-25 blur-[76px]"
        style={{ backgroundImage: 'linear-gradient(180deg, rgb(51, 170, 255) 0%, rgb(128, 200, 255) 100%)' }}
      />
      <div className="absolute left-1/2 top-[-44px] flex h-48 w-[41px] -translate-x-1/2 items-center justify-center overflow-hidden">
        <p className="font-glow-grover text-[128px] leading-[192px] tracking-[-3.84px] text-[var(--glow-blue)]">“</p>
      </div>
      <div className="flex w-full max-w-[908px] flex-col items-center gap-10 rounded-[32px]">
        <p className="max-w-[600px] text-balance text-center text-[24px] font-medium leading-[33.6px] tracking-[-0.48px] text-black opacity-95 min-[810px]:text-[26px] min-[810px]:leading-[36.4px] min-[810px]:tracking-[-0.52px]">
          Nous avons créé Numflash pour que chacun puisse vérifier ses comptes avec un numéro étranger, en payant simplement depuis son téléphone.
        </p>
        <div className="relative z-[1] flex items-center gap-4 overflow-hidden">
          <span className="flex h-[54px] w-[54px] items-center justify-center rounded-full bg-[var(--glow-blue)]">
            <LogoMark className="h-8 w-8 text-white" />
          </span>
          <div className="flex flex-col items-start justify-center overflow-hidden text-[17px] leading-[25.5px] tracking-[-0.34px] text-[var(--glow-text)]">
            <p className="font-medium">L’équipe Numflash</p>
            <p className="opacity-90">Notre engagement</p>
          </div>
        </div>
      </div>
    </section>
  )
}
