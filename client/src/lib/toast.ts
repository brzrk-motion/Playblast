import { toast } from "sonner"

const DEFAULT_DURATION_MS = 3000

export function showToast(message: string) {
  toast(message, { duration: DEFAULT_DURATION_MS })
}

export function showSuccessToast(message: string) {
  toast.success(message, { duration: DEFAULT_DURATION_MS })
}

export function showErrorToast(message: string) {
  toast.error(message, { duration: DEFAULT_DURATION_MS })
}

export function showLoadingToast(message: string) {
  return toast.loading(message)
}

export function dismissToast(id: string | number) {
  toast.dismiss(id)
}

export function humanizeApiError(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}
