import type { ReactElement } from 'react'

export type IconName =
  | 'play'
  | 'pause'
  | 'prev'
  | 'next'
  | 'expand'
  | 'settings'
  | 'upload'
  | 'trash'
  | 'up'
  | 'down'
  | 'image'
  | 'close'

const shapes: Record<IconName, ReactElement> = {
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z" fill="currentColor" />,
  pause: (
    <>
      <rect x="7" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" />
      <rect x="13.5" y="5" width="3.5" height="14" rx="1.2" fill="currentColor" />
    </>
  ),
  prev: <path d="M15 6 9 12l6 6" />,
  next: <path d="m9 6 6 6-6 6" />,
  expand: (
    <>
      <path d="M4 9V4h5" />
      <path d="M20 9V4h-5" />
      <path d="M4 15v5h5" />
      <path d="M20 15v5h-5" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9" />
      <path d="M17 7h3" />
      <path d="M4 17h3" />
      <path d="M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5h6v2" />
      <path d="m6 7 1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    </>
  ),
  up: (
    <>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </>
  ),
  down: (
    <>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m5 18 5-5 3 3 3-3 3 3" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
}

type IconProps = {
  name: IconName
  size?: number
  strokeWidth?: number
}

export function Icon({ name, size = 22, strokeWidth = 2 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name]}
    </svg>
  )
}
