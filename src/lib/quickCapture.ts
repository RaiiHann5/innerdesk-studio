import { addDays, getDay, startOfDay } from 'date-fns'
import { toISODate } from '@/lib/date'
import type { Priority, Project } from '@/types/domain'

export interface CaptureResult {
  title: string
  priority: Priority
  projectId?: string
  dueDate?: string
}

const PRIORITY_WORDS: Record<string, Priority> = {
  mendesak: 'urgent',
  urgent: 'urgent',
  tinggi: 'high',
  high: 'high',
  sedang: 'medium',
  medium: 'medium',
  rendah: 'low',
  low: 'low',
}

const WEEKDAYS: Record<string, number> = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 }

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

/**
 * Parses "Kirim invoice !tinggi #batik besok" into structured fields.
 * Recognised: !prioritas, #awalan-nama-project, "hari ini", "besok", "lusa", nama hari.
 * Anything not recognised stays in the title.
 */
export function parseQuickCapture(input: string, projects: Project[], now = new Date()): CaptureResult {
  let text = ` ${input.trim()} `
  const result: CaptureResult = { title: '', priority: 'medium' }
  const today = startOfDay(now)

  text = text.replace(/\s!([\p{L}]+)(?=\s)/gu, (match, word: string) => {
    const priority = PRIORITY_WORDS[word.toLowerCase()]
    if (!priority) return match
    result.priority = priority
    return ' '
  })

  text = text.replace(/\s#([\p{L}\p{N}-]+)(?=\s)/gu, (match, word: string) => {
    const slug = slugify(word)
    const project = projects.find((p) => slugify(p.name).startsWith(slug) || slugify(p.name).split('-').includes(slug))
    if (!project) return match
    result.projectId = project.id
    return ' '
  })

  const dateRules: Array<[RegExp, (m: RegExpMatchArray) => Date]> = [
    [/\s(hari ini)(?=\s)/i, () => today],
    [/\s(besok)(?=\s)/i, () => addDays(today, 1)],
    [/\s(lusa)(?=\s)/i, () => addDays(today, 2)],
    [
      /\s(senin|selasa|rabu|kamis|jumat|sabtu|minggu)(?=\s)/i,
      (m) => {
        const diff = (WEEKDAYS[m[1].toLowerCase()] - getDay(today) + 7) % 7
        return addDays(today, diff === 0 ? 7 : diff)
      },
    ],
  ]
  for (const [pattern, resolve] of dateRules) {
    const match = text.match(pattern)
    if (match) {
      result.dueDate = toISODate(resolve(match))
      text = text.replace(pattern, ' ')
      break
    }
  }

  result.title = text.replace(/\s+/g, ' ').trim()
  return result
}
