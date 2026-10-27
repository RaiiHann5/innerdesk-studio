import { Navigate, createBrowserRouter, useLocation } from 'react-router-dom'
import CalendarPage from '@/features/calendar/CalendarPage'
import DashboardPage from '@/features/dashboard/DashboardPage'
import FocusPage from '@/features/focus/FocusPage'
import ProjectDetailPage from '@/features/projects/ProjectDetailPage'
import ProjectsPage from '@/features/projects/ProjectsPage'
import SettingsPage from '@/features/settings/SettingsPage'
import TasksPage from '@/features/tasks/TasksPage'
import { AppShell } from './AppShell'

/** Mood and journal are one page now. Old links such as /mood?date=2026-10-05 keep their day. */
function MoodRedirect() {
  const { search } = useLocation()
  return <Navigate to={`/journal${search}`} replace />
}

const loadNotes = async () => ({ Component: (await import('@/features/notes/NotesPage')).default })
const loadNote = async () => ({ Component: (await import('@/features/notes/NotePage')).default })

// Loaded on demand, and nothing at startup reads it: finance data is only touched once this page opens.
const loadFinancePage = async () => ({ Component: (await import('@/features/finance/FinancePage')).default })

const loadHabits = async () => ({ Component: (await import('@/features/habits/HabitsPage')).default })

const loadHabitDetail = async () => ({ Component: (await import('@/features/habits/detail/HabitDetailPage')).default })

const loadLibrary = async () => ({ Component: (await import('@/features/library/LibraryPage')).default })
const loadLibraryDetail = async () => ({ Component: (await import('@/features/library/detail/LibraryDetailPage')).default })

const loadVault = async () => ({ Component: (await import('@/features/vault/VaultPage')).default })

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'projects/:id', element: <ProjectDetailPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'focus', element: <FocusPage /> },
      { path: 'mood', element: <MoodRedirect /> },
      // Loaded on demand: the editors bring TipTap with them, which no other page needs.
      { path: 'notes', lazy: loadNotes },
      { path: 'notes/:noteId', lazy: loadNote },
      { path: 'journal', lazy: async () => ({ Component: (await import('@/features/journal/JournalPage')).default }) },
      // Loaded on demand, and nothing at startup reads it: the vault is only touched once this page opens.
      { path: 'library', lazy: loadLibrary },
      { path: 'library/film/:itemId', lazy: loadLibraryDetail },
      { path: 'library/buku/:itemId', lazy: loadLibraryDetail },
      { path: 'habits', lazy: loadHabits },
      { path: 'habits/:habitId', lazy: loadHabitDetail },
      { path: 'vault', lazy: loadVault },
      { path: 'vault/pengaturan', lazy: loadVault },
      { path: 'vault/:itemId', lazy: loadVault },
      { path: 'finance', lazy: loadFinancePage },
      { path: 'settings', element: <SettingsPage /> },
      { path: '*', element: <Navigate to="/dashboard" replace /> },
    ],
  },
])
