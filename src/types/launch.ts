export interface ImageFormat {
  url: string
  width?: number
  height?: number
}

export interface ImageField {
  url: string
  formats?: {
    thumbnail?: ImageFormat
    small?: ImageFormat
    medium?: ImageFormat
    large?: ImageFormat
  }
}

export interface LaunchTile {
  id: number
  correlationId?: string
  documentId?: string
  title: string
  link?: string
  // URL to an external webcast (e.g. https://x.com/SpaceX/status/[videoId])
  webcastUrl?: string
  missionStatus?: string
  vehicle?: string
  launchSite?: string
  launchDate: string
  launchTime?: string | null
  imageDesktop?: ImageField | null
  imageMobile?: ImageField | null
  // If the future_missions map indicates the T-zero is paused, this will be set
  tZeroPaused?: boolean
  // Human-readable stopclock value when paused (e.g. "T+00:05:12"), if available
  tZeroValue?: string | null
}
