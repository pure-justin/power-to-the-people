import { useState, useEffect } from 'react'

let googleMapsPromise = null

function loadGoogleMaps() {
  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    // Check if already loaded
    if (window.google?.maps?.places) {
      resolve(window.google.maps)
      return
    }

    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

    if (!apiKey) {
      console.warn('Google Maps API key not configured. Address autocomplete will be disabled.')
      reject(new Error('Google Maps API key not configured'))
      return
    }

    // Create callback function
    const callbackName = '__googleMapsCallback_' + Date.now()
    window[callbackName] = () => {
      delete window[callbackName]
      resolve(window.google.maps)
    }

    // Create and append script
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => {
      delete window[callbackName]
      googleMapsPromise = null
      reject(new Error('Failed to load Google Maps'))
    }

    document.head.appendChild(script)
  })

  return googleMapsPromise
}

export function useGoogleMaps() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState(null)
  const [maps, setMaps] = useState(null)

  useEffect(() => {
    loadGoogleMaps()
      .then((googleMaps) => {
        setMaps(googleMaps)
        setIsLoaded(true)
      })
      .catch((err) => {
        setError(err.message)
        setIsLoaded(false)
      })
  }, [])

  return { isLoaded, error, maps }
}

export default useGoogleMaps
