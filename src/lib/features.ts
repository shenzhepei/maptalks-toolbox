import { Image, Layers3, MapPinned, Shapes, type LucideIcon } from 'lucide-react'

export type FeatureId = 'explore' | 'geojson-studio' | 'layer-lab' | 'gis-export'

export interface ToolboxFeature {
  id: FeatureId
  label: string
  description: string
  icon: LucideIcon
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
    id: 'layer-lab',
    label: 'Layer lab',
    description: 'Load and inspect custom XYZ, WMS, and ArcGIS tile services.',
    icon: Layers3,
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
