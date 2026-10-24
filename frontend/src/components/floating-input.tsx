import { useId, type ComponentProps, type ReactNode } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { cn } from "cn"

type FloatingInputProps = Omit<ComponentProps<"input">, "placeholder"> & {
  /** Rests inside the field like a placeholder, then floats onto the border when focused or filled. */
  label: string
  /** Rendered inside the field at the right edge (e.g. a <PasswordToggle />). */
  endAdornment?: ReactNode
}

// Literal class strings so Tailwind can see them. The label comes after the
// input in the DOM, so `peer-*` can react to the input's state with no React state:
//  - focus
//  - filled (the single-space placeholder stops matching :placeholder-shown)
//  - browser autofill, which doesn't always clear :placeholder-shown
// -translate-y-6 is half the field height (h-12): it moves the label's centre
// from the middle of the field up onto the top border line.
const LABEL_FLOATED = [
  "peer-focus:-translate-y-6 peer-focus:scale-75",
  "peer-[:not(:placeholder-shown)]:-translate-y-6 peer-[:not(:placeholder-shown)]:scale-75",
  "peer-autofill:-translate-y-6 peer-autofill:scale-75",
]

export function FloatingInput({
  label,
  id,
  className,
  endAdornment,
  ...props
}: FloatingInputProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const invalid =
    props["aria-invalid"] === true || props["aria-invalid"] === "true"

  return (
    <div className="relative">
      <input
        // Spread first so our wiring can't be overridden, and so the caller's
        // onChange/onFocus/onBlur are left alone (the label needs none of them).
        {...props}
        id={inputId}
        // A single space keeps :placeholder-shown working without showing text.
        placeholder=" "
        className={cn(
          "peer h-12 w-full min-w-0 rounded-lg border-[1.5px] bg-field px-4 text-base text-foreground outline-none",
          "shadow-[inset_0_1px_2px_oklch(0.29_0.035_52/0.08)]",
          "transition-[border-color,box-shadow] duration-200 motion-reduce:transition-none",
          "focus:ring-3 disabled:cursor-not-allowed disabled:opacity-60",
          // Stop the browser's autofill fill from covering the field surface.
          "autofill:shadow-[inset_0_0_0_100px_var(--field)] autofill:[-webkit-text-fill-color:var(--foreground)]",
          invalid
            ? "border-destructive focus:ring-destructive/25"
            : "border-field-border hover:not-focus:border-muted-foreground focus:border-primary focus:ring-ring/20",
          endAdornment && "pr-12",
          className
        )}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3 flex origin-left items-center text-base whitespace-nowrap",
          "transition-[translate,scale,color] duration-200 ease-out motion-reduce:transition-none",
          "peer-disabled:opacity-60",
          invalid
            ? "text-destructive"
            : "text-muted-foreground peer-focus:text-primary",
          ...LABEL_FLOATED
        )}
      >
        {/*
          The patch that breaks the border behind the floated label. When floated
          the label's centre sits on the border's outer edge, so the hard stop at
          50% leaves the top half see-through (it overlaps the card) and fills the
          bottom half with the field colour (it hides the border line). This is
          why it keeps working on the translucent login card; a solid
          bg-card/bg-background patch would show up as a visible tab. At rest the
          patch is identical to the field behind it, so it's invisible.
        */}
        <span className="bg-linear-to-b from-transparent from-50% to-field to-50% px-1">
          {label}
        </span>
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
