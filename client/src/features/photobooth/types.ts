export type PhotoLayout = {
  id: string
  name: string
  /** How many photos this layout needs. */
  shots: number
}

export type CameraFilter = {
  id: string
  name: string
  /** Value for the CSS / canvas `filter` property. */
  css: string
}

export type Experience = {
  filterId: string
  /** Seconds of countdown before each photo. */
  intervalSeconds: number
}
