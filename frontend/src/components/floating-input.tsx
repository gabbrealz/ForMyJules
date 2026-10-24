import { useId, type ComponentProps, type ReactNode } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { cn } from "cn"

type FloatingInputProps = Omit<ComponentProps<"input">, "placeholder"> & {
  /** Rests inside the field like a placeholder, then floats up when focused or filled. */
  label: string
  /** Rendered inside the border at the right edge (e.g. a <PasswordToggle />). */
  endAdornment?: ReactNode
}

// Literal class strings so Tailwind can see them. The label sits after the input
// in the DOM, which is what lets `peer-*` react to the input's state:
//  - focus
//  - filled (the single-space placeholder stops matching :placeholder-shown)
//  - browser autofill, which doesn't always clear :placeholder-shown
const LABEL_FLOATED = [
  "peer-focus:-translate-y-2.5 peer-focus:scale-80",
  "peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-80",
  "peer-autofill:-translate-y-2.5 peer-autofill:scale-80",
]

/**
 * Bordered input with a floating label inside the border.
 *
 * The wrapper owns the border, fill and focus ring so the toggle button and the
 * input share one outline. Surface and border come from the `field` tokens in
 * globals.css, which are deliberately stronger than `--input` so the field
 * reads as its own object on top of the card.
 */
export function FloatingInput({
  label,
  id,
  className,
  endAdornment,
  disabled,
  ...props
}: FloatingInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const invalid =
    props["aria-invalid"] === true || props["aria-invalid"] === "true"

  return (
    <div
      data-slot="floating-input"
      data-invalid={invalid ? true : undefined}
      className={cn(
        "relative h-14 rounded-xl border-[1.5px] bg-field",
        "shadow-[inset_0_1px_2px_oklch(0.29_0.035_52/0.08)]",
        "transition-[border-color,background-color,box-shadow] duration-200 motion-reduce:transition-none",
        "focus-within:bg-card focus-within:ring-4",
        invalid
          ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/25"
          : "border-field-border hover:not-focus-within:border-muted-foreground focus-within:border-primary focus-within:ring-ring/30",
        disabled && "opacity-60",
        className
      )}
    >
      <input
        {...props}
        id={inputId}
        disabled={disabled}
        // A single space keeps :placeholder-shown working without showing text.
        placeholder=" "
        className={cn(
          "peer size-full min-w-0 rounded-[inherit] bg-transparent px-4 pt-5 pb-1.5 text-base text-foreground outline-none",
          "disabled:cursor-not-allowed",
          // Stop the browser's yellow/blue autofill fill from covering the field surface.
          "autofill:shadow-[inset_0_0_0_100px_var(--card)] autofill:[-webkit-text-fill-color:var(--foreground)]",
          endAdornment && "pr-12"
        )}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "pointer-events-none absolute inset-y-0 left-4 flex origin-left items-center text-base whitespace-nowrap",
          "transition-[translate,scale,color] duration-200 ease-out motion-reduce:transition-none",
          invalid ? "text-destructive" : "text-muted-foreground peer-focus:text-primary",
          ...LABEL_FLOATED
        )}
      >
        {label}
      </label>
      {endAdornment}
    </div>
  )
}

type PasswordToggleProps = {
  shown: boolean
  onToggle: () => void
  /** Accessible name, e.g. "Show password" / "Hide password". */
  label: string
}

/** Eye button that sits inside a <FloatingInput endAdornment={...} />. */
export function PasswordToggle({ shown, onToggle, label }: PasswordToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className="absolute inset-y-0 right-2 my-auto grid size-9 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {shown ? <EyeOffIcon className="size-4.5" /> : <EyeIcon className="size-4.5" />}
    </button>
  )
}
