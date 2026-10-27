import type { City, CurrencyCode } from '@/types/domain'

export const APP_NAME = 'Innerdesk Studio'
export const DEFAULT_USER_NAME = 'Raihan'
export const DEFAULT_CITY: City = {
  name: 'Jakarta',
  country: 'Indonesia',
  latitude: -6.2146,
  longitude: 106.8451,
}
export const STORAGE_PREFIX = 'pos:v1:'
/** Monday. Becomes a setting later; every calendar view reads it from here. */
export const WEEK_STARTS_ON = 1 as const
/** Every finance total is expressed in this currency. Other currencies are converted with the rate stored on each transaction. */
export const BASE_CURRENCY: CurrencyCode = 'IDR'
