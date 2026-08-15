import { Image, MapPinned, Shapes } from 'lucide-vue-next'

export type FeatureId = 'explore' | 'geojson-studio' | 'gis-export'

export interface ToolboxFeature {
  id: FeatureId
  label: string
  description: string
  icon: typeof MapPinned
}

export const features: ToolboxFeature[] = [
  {
    id: 'explore',
    label: 'Map explorer',
    description: 'Search places, inspect coordinates, and switch base layers.',
    icon: MapPinned,
  },
  {
    id: 'geojson-studio',
    label: 'GeoJSON studio',
    description: 'Draw points, lines, and polygons, then copy converted GeoJSON.',
    icon: Shapes,
  },
  {
    id: 'gis-export',
    label: 'GIS to image',
    description: 'Render GeoJSON, select a region, and export a PNG.',
    icon: Image,
  },
]

export function findFeature(id: string) {
  return features.find((feature) => feature.id === id)
}
