import type { ReactNode } from 'react'
import { ArrowClockwise, CloudSlash, Drop, WifiSlash } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/IconButton'
import { Skeleton } from '@/components/ui/Skeleton'
import { fmt } from '@/lib/date'
import { useNow } from '@/lib/useNow'
import { useSettingsStore } from '@/stores/settings'
import { describeWeather } from '@/features/weather/weatherCodes'
import { useWeather, type WeatherState } from '@/features/weather/useWeather'
import { greetingFor } from '@/lib/greeting'
import sunrise from '@/assets/hero/sunrise.jpg'

function Meta({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="shrink-0">
      <dt className="text-xs text-[#1B1815]/80">{label}</dt>
      <dd className="mt-1 flex h-5 items-center whitespace-nowrap text-sm font-medium tabular-nums">{children}</dd>
    </div>
  )
}

function WeatherTile({ weather }: { weather: WeatherState }) {
  if (weather.status === 'loading') return <Skeleton className="size-14 shrink-0 rounded-card" />
  const Icon = weather.data ? describeWeather(weather.data.code, weather.data.isDay).icon : CloudSlash
  return (
    <span aria-hidden className="grid size-14 shrink-0 place-items-center rounded-card border bg-surface">
      <Icon size={28} />
    </span>
  )
}

function WeatherValue({ weather }: { weather: WeatherState }) {
  if (weather.status === 'loading') return <Skeleton className="h-5 w-32" />

  if (weather.status === 'error' || !weather.data) {
    return (
      <span className="flex items-center gap-1 text-[#1B1815]/80" role="status">
        Tidak tersedia
        <IconButton icon={ArrowClockwise} label="Muat ulang cuaca" onClick={weather.refresh} className="-my-1.5 size-7" />
      </span>
    )
  }

  const { label } = describeWeather(weather.data.code, weather.data.isDay)
  return (
    <span className="flex items-center gap-3">
      <span>
        {Math.round(weather.data.temperature)}°C <span className="font-normal text-[#1B1815]/80">{label}</span>
      </span>
      <span className="flex items-center gap-1 text-[#1B1815]/80">
        <Drop aria-hidden size={14} />
        <span className="sr-only">Peluang hujan</span>
        {weather.data.rainChance}%
      </span>
      {weather.stale && weather.fetchedAt && (
        <span className="flex items-center gap-1 text-[#1B1815]/80" role="status" title="Gagal memperbarui, menampilkan data terakhir">
          <WifiSlash aria-hidden size={14} />
          <span className="sr-only">Data terakhir pukul</span>
          {fmt(new Date(weather.fetchedAt), 'HH.mm')}
        </span>
      )}
    </span>
  )
}

export function DashboardHeader() {
  const userName = useSettingsStore((s) => s.userName)
  const city = useSettingsStore((s) => s.city)
  const weather = useWeather(city)
  const now = useNow(1000)

  return (
    <header className="relative isolate overflow-hidden rounded-card border text-[#1B1815]">
      <img src={sunrise} alt="" aria-hidden decoding="async" className="absolute inset-0 -z-20 size-full object-cover object-[50%_45%]" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-[rgb(255_255_255/0.4)] via-[rgb(255_255_255/0.15)] to-transparent" />
      <div className="relative flex min-h-44 flex-wrap content-end items-end justify-between gap-x-10 gap-y-6 p-4 md:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <WeatherTile weather={weather} />
          <h1 className="text-xl font-bold tracking-tight">
            {greetingFor(now.getHours())}, {userName}
          </h1>
        </div>
        <dl className="flex flex-wrap gap-x-8 gap-y-4">
          <Meta label="Tanggal">
            <time dateTime={fmt(now, 'yyyy-MM-dd')}>{fmt(now, 'EEE, d MMM yyyy')}</time>
          </Meta>
          <Meta label="Jam">
            <time dateTime={fmt(now, 'HH:mm:ss')}>{fmt(now, 'HH.mm.ss')}</time>
          </Meta>
          <Meta label="Cuaca">
            <WeatherValue weather={weather} />
          </Meta>
          <Meta label="Kota">
            <span className="truncate">{city.name}</span>
          </Meta>
        </dl>
      </div>
    </header>
  )
}
