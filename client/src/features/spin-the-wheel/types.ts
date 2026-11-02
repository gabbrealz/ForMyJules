export interface Entry {
  id: string
  label: string
}

/** What the wheel reports when it stops. */
export interface SpinResult {
  entry: Entry
  /** Position of the winning entry in the list the wheel was spun with. */
  index: number
  /** The pastel colour of the winning slice. */
  color: string
}

/** One row in the Results tab. */
export interface SpinRecord {
  id: string
  label: string
  color: string
}
