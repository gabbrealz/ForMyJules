import { useCallback, useEffect, useState } from "react"

export type CameraState = {
  stream: MediaStream | null
  error: string | null
  isStarting: boolean
  retry: () => void
}

const CAMERA_ERROR = "Unable to access camera. Please check your browser permissions."

/**
 * Owns the webcam stream. The camera is on only while `enabled` is true, and the
 * stream is stopped as soon as it flips to false or the host unmounts.
 */
export function useCamera(enabled: boolean): CameraState {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!enabled) return

    let cancelled = false
    let active: MediaStream | null = null

    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        })
      : Promise.reject(new Error("Camera API unavailable"))

    request
      .then((mediaStream) => {
        // The effect was torn down while the permission prompt was open.
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        active = mediaStream
        setStream(mediaStream)
      })
      .catch((err) => {
        console.error("Error accessing camera:", err)
        if (!cancelled) setError(CAMERA_ERROR)
      })

    return () => {
      cancelled = true
      active?.getTracks().forEach((track) => track.stop())
      setStream(null)
      setError(null)
    }
  }, [enabled, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return {
    stream,
    error,
    isStarting: enabled && !stream && !error,
    retry,
  }
}
