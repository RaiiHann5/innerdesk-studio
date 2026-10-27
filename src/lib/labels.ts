import type { Priority, ProjectStatus, TaskStatus } from '@/types/domain'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  todo: 'Belum mulai',
  doing: 'Dikerjakan',
  review: 'Review',
  done: 'Selesai',
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  urgent: 'Mendesak',
  high: 'Tinggi',
  medium: 'Sedang',
  low: 'Rendah',
}

export const PROJECT_STATUS_LABEL: Record<ProjectStatus, string> = {
  active: 'Aktif',
  paused: 'Dijeda',
  done: 'Selesai',
}
