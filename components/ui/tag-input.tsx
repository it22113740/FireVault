"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"

type TagInputProps = {
  id?: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  maxTags?: number
  maxLength?: number
  className?: string
  "aria-invalid"?: boolean
}

function TagInput({
  id,
  value,
  onChange,
  placeholder,
  maxTags,
  maxLength,
  className,
  "aria-invalid": ariaInvalid,
}: TagInputProps) {
  const [draft, setDraft] = React.useState("")
  const atLimit = maxTags !== undefined && value.length >= maxTags

  function addTag() {
    const tag = draft.trim()
    setDraft("")
    if (!tag || atLimit) return
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase())
    if (!exists) onChange([...value, tag])
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      addTag()
    } else if (event.key === "Backspace" && draft === "" && value.length > 0) {
      removeTag(value.length - 1)
    }
  }

  return (
    <div
      data-slot="tag-input"
      aria-invalid={ariaInvalid}
      className={cn(
        "flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border border-input bg-transparent px-1.5 py-1 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:bg-input/30",
        className
      )}
    >
      {value.map((tag, index) => (
        <Badge key={tag} variant="secondary" className="gap-1 pr-1">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="rounded-full opacity-60 hover:opacity-100"
            aria-label={`Remove ${tag}`}
          >
            <XIcon />
          </button>
        </Badge>
      ))}
      <input
        id={id}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder={atLimit ? undefined : placeholder}
        disabled={atLimit}
        maxLength={maxLength}
        className="min-w-24 flex-1 bg-transparent px-1 outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
      />
    </div>
  )
}

export { TagInput }
