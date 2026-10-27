export function actionErrorMessage(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : String(error)
  return /Server Action[\s\S]+not found|Failed to find Server Action|older or newer deployment/i.test(message)
    ? 'The application has been updated. Refresh the page before trying again.'
    : fallback
}
