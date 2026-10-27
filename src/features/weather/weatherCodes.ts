import { Cloud, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSnow, CloudSun, Moon, Sun, type Icon } from '@phosphor-icons/react'

export interface WeatherCondition {
  label: string
  icon: Icon
}

/** WMO weather interpretation codes used by Open-Meteo. */
export function describeWeather(code: number, isDay: boolean): WeatherCondition {
  if (code === 0) return { label: 'Cerah', icon: isDay ? Sun : Moon }
  if (code === 1) return { label: 'Cerah berawan', icon: isDay ? CloudSun : CloudMoon }
  if (code === 2) return { label: 'Berawan sebagian', icon: isDay ? CloudSun : CloudMoon }
  if (code === 3) return { label: 'Mendung', icon: Cloud }
  if (code === 45 || code === 48) return { label: 'Berkabut', icon: CloudFog }
  if (code >= 51 && code <= 57) return { label: 'Gerimis', icon: CloudRain }
  if (code >= 61 && code <= 65) return { label: code === 65 ? 'Hujan lebat' : 'Hujan', icon: CloudRain }
  if (code === 66 || code === 67) return { label: 'Hujan beku', icon: CloudRain }
  if (code >= 71 && code <= 77) return { label: 'Salju', icon: CloudSnow }
  if (code >= 80 && code <= 82) return { label: 'Hujan lokal', icon: CloudRain }
  if (code === 85 || code === 86) return { label: 'Hujan salju', icon: CloudSnow }
  if (code >= 95) return { label: 'Hujan petir', icon: CloudLightning }
  return { label: 'Tidak diketahui', icon: Cloud }
}
