import { useCallback, useEffect, useRef, useState } from 'react'
import { STORAGE_PREFIX } from '@/lib/config'
import { readJSON, writeJSON } from '@/lib/storage'
import type { City } from '@/types/domain'
import { fetchWeather, type WeatherData } from './openMeteo'

const REFRESH_MS = 30 * 60_000
const CACHE_KEY = `${STORAGE_PREFIX}weather`

interface Cache {
  lat: number
  lon: number
  fetchedAt: number
  data: WeatherData
}

export type WeatherStatus = 'loading' | 'ready' | 'error'

export interface WeatherState {
  data: WeatherData | null
  status: WeatherStatus
  /** True when showing cached data because the latest refresh failed. */
  stale: boolean
  fetchedAt: number | null
  refresh: () => void
}

const readCache = (city: City): Cache | null => {
  const cache = readJSON<Cache>(CACHE_KEY)
  return cache && cache.lat === city.latitude && cache.lon === city.longitude ? cache : null
}

export function useWeather(city: City): WeatherState {
  const [cache, setCache] = useState<Cache | null>(() => readCache(city))
  const [status, setStatus] = useState<WeatherStatus>(() => (readCache(city) ? 'ready' : 'loading'))
  const [stale, setStale] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const load = useCallback(
    async (force: boolean) => {
      const cached = readCache(city)
      setCache(cached)
      if (!force && cached && Date.now() - cached.fetchedAt < REFRESH_MS) {
        setStatus('ready')
        setStale(false)
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      if (!cached) setStatus('loading')
      try {
        const data = await fetchWeather(city, controller.signal)
        const next: Cache = { lat: city.latitude, lon: city.longitude, fetchedAt: Date.now(), data }
        writeJSON(CACHE_KEY, next)
        setCache(next)
        setStatus('ready')
        setStale(false)
      } catch {
        if (controller.signal.aborted) return
        setStale(true)
        setStatus(cached ? 'ready' : 'error')
      }
    },
    [city],
  )

  useEffect(() => {
    void load(false)
    const timer = window.setInterval(() => void load(true), REFRESH_MS)
    const onVisible = () => document.visibilityState === 'visible' && void load(false)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      abortRef.current?.abort()
    }
  }, [load])

  return {
    data: cache?.data ?? null,
    status,
    stale,
    fetchedAt: cache?.fetchedAt ?? null,
    refresh: () => void load(true),
  }
}
