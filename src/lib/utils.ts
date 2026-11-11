import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const THIN_NBSP = ' '

export function formatFCFA(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—'
  const n = Math.trunc(value)
  const sign = n < 0 ? '-' : ''
  const digits = Math.abs(n).toString()
  const groups: string[] = []
  for (let i = digits.length; i > 0; i -= 3) {
    groups.unshift(digits.slice(Math.max(0, i - 3), i))
  }
  return `${sign}${groups.join(THIN_NBSP)} FCFA`
}

const dateTimeFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : dateTimeFormatter.format(d)
}

// crypto.randomUUID n'existe pas sur certains navigateurs Android anciens.
export function uuidv4(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
