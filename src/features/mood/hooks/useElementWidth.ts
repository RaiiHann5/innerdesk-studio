import { useEffect, useRef, useState } from 'react'

/** Tracks an element's width so an SVG can be drawn at real pixels and its text stays readable. */
export function useElementWidth<T extends HTMLElement>(): [ref: React.RefObject<T>, width: number] {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    setWidth(el.clientWidth)
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return [ref as React.RefObject<T>, width]
}
