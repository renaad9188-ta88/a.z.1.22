import { useRef, useState, useEffect } from 'react'
import { BORDER_CENTER } from '../../map/mapHelpers'
import { loadGoogleMaps } from '../utils'

export function useMapInitialization(
  apiKey: string,
  inViewRef: React.RefObject<HTMLDivElement>,
  mapElRef: React.RefObject<HTMLDivElement>
) {
  const mapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null)

  const [ready, setReady] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.setMap(null))
    markersRef.current = []
  }

  const clearPolyline = () => {
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
  }

  const clearDirections = () => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null)
      directionsRendererRef.current = null
    }
  }

  const clearMap = () => {
    clearMarkers()
    clearPolyline()
    clearDirections()
  }

  const initMap = () => {
    if (!mapElRef.current || !(window as any).google?.maps) return
    const googleMaps = (window as any).google.maps as typeof google.maps

    if (!mapRef.current) {
      mapRef.current = new googleMaps.Map(mapElRef.current, {
        center: BORDER_CENTER,
        zoom: 10,
        mapTypeId: googleMaps.MapTypeId.ROADMAP,
        mapTypeControl: false,
        zoomControl: true,
        zoomControlOptions: {
          position: googleMaps.ControlPosition.LEFT_CENTER,
        },
        streetViewControl: false,
        fullscreenControl: true,
        gestureHandling: 'greedy',
        scrollwheel: true,
      })
    }
  }

  // Lazy-load Google Maps only when the map area is in view
  useEffect(() => {
    if (!inViewRef.current) return
    const el = inViewRef.current
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShouldLoad(true)
          obs.disconnect()
        }
      },
      { root: null, threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [inViewRef])

  // Load Google Maps when shouldLoad is true
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        if (!apiKey) {
          setErrorText('مفتاح Google Maps غير موجود')
          return
        }
        if (!shouldLoad) return
        await loadGoogleMaps(apiKey)
        if (!mounted) return
        setReady(true)
      } catch (e) {
        console.error(e)
        if (!mounted) return
        setErrorText('تعذّر تحميل الخريطة')
      }
    })()
    return () => {
      mounted = false
    }
  }, [apiKey, shouldLoad])

  return {
    mapRef,
    markersRef,
    polylineRef,
    directionsRendererRef,
    directionsServiceRef,
    ready,
    errorText,
    shouldLoad,
    clearMap,
    clearMarkers,
    clearPolyline,
    clearDirections,
    initMap,
  }
}



