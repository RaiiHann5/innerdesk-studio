import { toDataError } from './errors'

/** Supabase caps a response at 1000 rows (max_rows). Anything that reads "everything" has to page, or it silently truncates. */
export const PAGE_SIZE = 1000

interface Page {
  data: unknown[] | null
  error: { code?: string; message?: string } | null
}

/** Reads every page of a query. The query must be ordered by a unique key, or rows can repeat or go missing between pages. */
export async function fetchAll<R>(page: (from: number, to: number) => PromiseLike<Page>): Promise<R[]> {
  const rows: R[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw toDataError(error)
    rows.push(...((data ?? []) as R[]))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}
