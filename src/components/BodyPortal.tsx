'use client'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

export default function BodyPortal({ children }: { children: ReactNode }) {
  // Glass panels create containing blocks that otherwise clip fixed calling overlays.
  return typeof document === 'undefined' ? null : createPortal(children, document.body)
}
