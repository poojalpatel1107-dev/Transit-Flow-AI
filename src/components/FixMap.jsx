import { useEffect } from 'react'
import { useMap } from 'react-leaflet'

function FixMap() {
  const map = useMap()

  useEffect(() => {
    if (!map) return

    // Invalidate size after a short delay to ensure proper rendering
    const timer = setTimeout(() => {
      map.invalidateSize()
      console.log('Map size invalidated')
    }, 300)

    // Also invalidate on window resize
    const handleResize = () => {
      map.invalidateSize()
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', handleResize)
    }
  }, [map])

  return null
}

export default FixMap
