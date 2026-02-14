import { useState, useEffect, useRef } from 'react'

export function useGoogleMaps(apiKey: string) {
  const [ready, setReady] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  function loadGoogleMaps(apiKey: string): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve()
    if ((window as any).google?.maps) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null
      if (existing) {
        existing.addEventListener('load', () => resolve())
        existing.addEventListener('error', () => reject(new Error('Google Maps failed to load')))
        return
      }

      const script = document.createElement('script')
      script.dataset.googleMaps = '1'
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry&language=ar`
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error('Google Maps failed to load'))
      document.head.appendChild(script)
    })
  }

  useEffect(() => {
    if (!apiKey) {
      setErrorText('مفتاح Google Maps غير موجود')
      return
    }

    loadGoogleMaps(apiKey)
      .then(() => {
        setReady(true)
        setShouldLoad(true)
      })
      .catch((err) => {
        console.error('Failed to load Google Maps:', err)
        setErrorText('فشل تحميل الخريطة')
      })
  }, [apiKey])

  return { ready, errorText, shouldLoad }
}

