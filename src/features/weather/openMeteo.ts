import type { City } from '@/types/domain'

export interface WeatherData {
  temperature: number
  code: number
  isDay: boolean
  rainChance: number
}

interface ForecastResponse {
  current: { temperature_2m: number; weather_code: number; is_day: number }
  daily: { precipitation_probability_max: Array<number | null> }
}

export async function fetchWeather(city: City, signal?: AbortSignal): Promise<WeatherData> {
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    current: 'temperature_2m,weather_code,is_day',
    daily: 'precipitation_probability_max',
    forecast_days: '1',
    timezone: 'auto',
  })
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal })
  if (!res.ok) throw new Error(`Open-Meteo menjawab ${res.status}`)
  const json = (await res.json()) as ForecastResponse
  return {
    temperature: json.current.temperature_2m,
    code: json.current.weather_code,
    isDay: json.current.is_day === 1,
    rainChance: json.daily.precipitation_probability_max[0] ?? 0,
  }
}
