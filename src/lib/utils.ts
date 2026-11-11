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
