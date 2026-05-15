import type { SessionStatus } from '@/shared/types'

export interface SessionSummary {
  sessionId: string
  status: SessionStatus
  createdAt: string
  updatedAt: string
  sector: string | null
  employeeCount: number | null
  size: string | null
  useCasesCount: number | null
  reportName: string | null
  title: string
}
