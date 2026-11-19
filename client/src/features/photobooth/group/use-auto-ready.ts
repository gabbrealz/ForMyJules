import { useEffect, useState } from "react"

import { useBoothSessionContext } from "../session/booth-session-context"

const isTabVisible = () => document.visibilityState === "visible"

/** Is this tab on screen? A hidden tab can't be trusted to take a photo on time. */
export function useTabVisible(): boolean {
  const [visible, setVisible] = useState(isTabVisible)
  useEffect(() => {
    const onChange = () => setVisible(isTabVisible())
    document.addEventListener("visibilitychange", onChange)
    return () => document.removeEventListener("visibilitychange", onChange)
  }, [])
  return visible
}

/**
 * Tells the group whether this person is ready to be photographed, automatically: the camera
 * window is open, the camera is running and the tab is visible. Nobody presses a "ready" button.
 * Not being ready (or leaving) is reported too, so the leader never counts on someone who has gone.
 */
export function useAutoReady(windowOpen: boolean, cameraRunning: boolean) {
  const { actions, joinStatus } = useBoothSessionContext()
  const visible = useTabVisible()
  const ready = joinStatus === "joined" && windowOpen && cameraRunning && visible

  const { setReady } = actions
  useEffect(() => {
    setReady(ready)
  }, [ready, setReady])
  // Separate, so a change of `ready` sends one message, not "not ready" followed by "ready".
  useEffect(() => () => setReady(false), [setReady])

  return { ready, visible }
}
