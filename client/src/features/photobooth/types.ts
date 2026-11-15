export type PhotoLayout = {
  id: string
  name: string
  /** How many photos this layout needs. */
  shots: number
  /** Columns the photos are arranged in; rows follow from `shots`. */
  columns: number
}

export type CameraFilter = {
  id: string
  name: string
  /** Value for the CSS / canvas `filter` property. */
  css: string
}

export type TimeInterval = {
  id: string
  seconds: number
}

export type Experience = {
  filterId: string
  intervalId: string
  /** Cut the person out of the camera background (live, on the GPU). */
  removeBackground: boolean
}
