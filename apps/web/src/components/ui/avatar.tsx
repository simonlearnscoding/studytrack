import { useState } from 'react'

const avatarSize = { 24: 'h-6 w-6 text-[10px]', 30: 'h-8 w-8 text-xs', 34: 'h-9 w-9 text-xs' }

export function Avatar({
  initials,
  color,
  image,
  size = 30,
  dot = false,
}: {
  initials: string
  color: string
  image?: string | null
  size?: 24 | 30 | 34
  dot?: boolean
}) {
  const [failedImage, setFailedImage] = useState<string | null>(null)
  const showImage = Boolean(image) && failedImage !== image

  return (
    <span
      className={`relative flex shrink-0 items-center justify-center rounded-full font-semibold ${avatarSize[size]}`}
      style={showImage ? undefined : { background: `${color}26`, color }}
    >
      {showImage ? (
        <img
          src={image ?? undefined}
          alt=""
          className="h-full w-full rounded-full object-cover"
          onError={() => setFailedImage(image ?? null)}
        />
      ) : (
        initials
      )}
      {dot && (
        <span className="border-background bg-primary absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border-2" />
      )}
    </span>
  )
}
