import { describe, expect, it } from 'vitest'
import { convertFromGcj02, formatCoordinate, parseCoordinate } from './coordinates'

describe('coordinates', () => {
  it('parses valid coordinates', () => {
    expect(parseCoordinate('120.1551, 30.2741')).toEqual([120.1551, 30.2741])
    expect(parseCoordinate('-73.9,40.7')).toEqual([-73.9, 40.7])
  })

  it('rejects malformed and out-of-range coordinates', () => {
    expect(parseCoordinate('120')).toBeNull()
    expect(parseCoordinate('east, north')).toBeNull()
    expect(parseCoordinate('181, 30')).toBeNull()
    expect(parseCoordinate('120, 91')).toBeNull()
  })

  it('formats and converts GCJ-02 coordinates', () => {
    const source: [number, number] = [120.1551, 30.2741]
    const result = convertFromGcj02(source)
    expect(result.gcj02).toBe(source)
    expect(result.wgs84).toHaveLength(2)
    expect(result.bd09).toHaveLength(2)
    expect(formatCoordinate(source)).toBe('120.155100, 30.274100')
  })
})
