import { Drop } from '@phosphor-icons/react'
import { useSettingsStore } from '@/stores/settings'
import { useWeather } from '@/features/weather/useWeather'
import { describeWeather } from '@/features/weather/weatherCodes'

/** Today's weather in one line, from the same Open-Meteo data as the dashboard header. Renders nothing while loading or when unavailable. */
export function DayWeather() {
  const city = useSettingsStore((s) => s.city)
  const { data } = useWeather(city)
  if (!data) return null
  const { icon: Icon, label } = describeWeather(data.code, data.isDay)

  return (
    <p className="flex items-center gap-2 text-sm text-muted tabular-nums">
      <Icon size={18} aria-hidden />
      <span>
        <span className="font-medium text-ink">{Math.round(data.temperature)}°C</span> {label}
      </span>
      <span className="flex items-center gap-1">
        <Drop size={14} aria-hidden />
        <span className="sr-only">Peluang hujan</span>
        {data.rainChance}%
      </span>
    </p>
  )
}
