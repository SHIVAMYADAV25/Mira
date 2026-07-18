"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

// next-themes (unmaintained) injects a raw <script> tag for zero-flash
// theme init. It only ever runs during SSR and is harmless, but Next.js
// 16.2+ / React 19 now warn about any literal <script> rendered from a
// component. Filtering just this one known false-positive until
// next-themes ships a fix upstream:
// https://github.com/pacocoursey/next-themes/issues/387
if (typeof window !== "undefined" && !(window as { __themeScriptWarningPatched?: boolean }).__themeScriptWarningPatched) {
  (window as { __themeScriptWarningPatched?: boolean }).__themeScriptWarningPatched = true
  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Encountered a script tag while rendering React component")
    ) {
      return
    }
    originalError(...args)
  }
}

/**
 * Wraps the app with `next-themes` for light/dark/system theme switching.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}