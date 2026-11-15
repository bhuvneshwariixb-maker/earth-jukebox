
export type ClimateRecord = {
  date: string
  temperature_celsius: number | null
  rainfall_mm: number | null
}

export type ClimateResponse = {
  source: string
  latitude: number
  longitude: number
  units: {
    temperature: string
    rainfall: string
  }
  records: ClimateRecord[]
}

export type SoundRecord = {
  date: string
  frequency_hz: number
  duration_seconds: number
  temperature_celsius: number
  rainfall_mm: number
}

export type SonificationResponse = {
  location: {
    latitude: number
    longitude: number
  }
  source: string
  sonification: {
    sonification_method: string
    sound_records: SoundRecord[]
  }
}

export type HapticsResponse = {
  accessibility: string
  haptics: {
    event: string
    label: string
    pattern_ms: number[]
    unit: string
  }
}
export type SeaIceRecord = {
  date: string
  extent_million_sq_km: number
  missing_million_sq_km: number
}

export type SeaIceResponse = {
  source: string
  hemisphere: string
  unit: string
  records: SeaIceRecord[]
}

export type SeaIceSoundRecord = {
  date: string
  frequency_hz: number
  duration_seconds: number
  amplitude: number
  extent_million_sq_km: number
  daily_change_million_sq_km: number
}

export type SeaIceSonificationResponse = {
  source: string
  hemisphere: string
  sonification: {
    sonification_method: string
    dataset: string
    sound_records: SeaIceSoundRecord[]
  }
}

type ClimateQuery = {
  latitude: number
  longitude: number
  startDate: string
  endDate: string
}

function buildQuery(params: ClimateQuery) {
  const query = new URLSearchParams({
    latitude: String(params.latitude),
    longitude: String(params.longitude),
    start_date: params.startDate,
    end_date: params.endDate,
  })

  return query.toString()
}

async function readResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const body = await response.json()
      message = body.detail || message
    } catch {
      // Keep the original error message.
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export async function getClimateData(
  params: ClimateQuery,
): Promise<ClimateResponse> {
  const response = await fetch(
    `/api/nasa/climate?${buildQuery(params)}`,
    { cache: 'no-store' },
  )

  return readResponse<ClimateResponse>(response)
}

export async function getSonification(
  params: ClimateQuery,
): Promise<SonificationResponse> {
  const response = await fetch(
    `/api/nasa/sonify?${buildQuery(params)}`,
    { cache: 'no-store' },
  )

  return readResponse<SonificationResponse>(response)
}

export async function getClimateAudio(
  params: ClimateQuery,
): Promise<Blob> {
  const response = await fetch(
    `/api/nasa/sonify/audio?${buildQuery(params)}`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    let message = `Audio request failed (${response.status})`

    try {
      const body = await response.json()
      message = body.detail || message
    } catch {
      // Keep the original error message.
    }

    throw new Error(message)
  }

  return response.blob()
}

export async function getHaptics(
  eventType: string,
): Promise<HapticsResponse> {
  const query = new URLSearchParams({ event_type: eventType })

  const response = await fetch(
    `/api/nasa/haptics?${query.toString()}`,
    { cache: 'no-store' },
  )

  return readResponse<HapticsResponse>(response)
}
export async function getSeaIceData(
  hemisphere: 'north' | 'south',
  startDate: string,
  endDate: string,
): Promise<SeaIceResponse> {
  const query = new URLSearchParams({
    hemisphere,
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `/api/nasa/sea-ice?${query.toString()}`,
    { cache: 'no-store' },
  )

  return readResponse<SeaIceResponse>(response)
}

export async function getSeaIceAudio(
  hemisphere: 'north' | 'south',
  startDate: string,
  endDate: string,
): Promise<Blob> {
  const query = new URLSearchParams({
    hemisphere,
    start_date: startDate,
    end_date: endDate,
  })

  const response = await fetch(
    `/api/nasa/sea-ice/sonify/audio?${query.toString()}`,
    { cache: 'no-store' },
  )

  if (!response.ok) {
    throw new Error(`Sea Ice audio request failed (${response.status})`)
  }

  return response.blob()
}