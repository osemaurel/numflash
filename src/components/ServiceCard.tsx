import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import type { ServiceRow } from '@/hooks/useServices'

export default function ServiceCard({ service }: { service: ServiceRow }) {
  return (
    <Link to={`/service/${service.slug}`} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      <Card className="flex h-28 flex-col items-center justify-center gap-2 p-3 transition-colors hover:border-primary">
        {service.logo_url ? (
          <img src={service.logo_url} alt="" className="h-10 w-10 rounded object-contain" loading="lazy" />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-base font-semibold text-primary">
            {service.name_fr.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="line-clamp-1 text-center text-sm font-medium">{service.name_fr}</div>
      </Card>
    </Link>
  )
}
