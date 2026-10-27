const HAS_SCHEME = /^([a-z][a-z0-9+.-]*:|\/|#)/i

/** Adds https:// to an address typed without a scheme. */
export const withScheme = (address: string) => (HAS_SCHEME.test(address) ? address : `https://${address}`)

/** The web search for a piece of selected text. Long selections are cut so the address stays usable. */
export const searchUrl = (text: string) => `https://www.google.com/search?q=${encodeURIComponent(text.trim().replace(/\s+/g, ' ').slice(0, 200))}`
