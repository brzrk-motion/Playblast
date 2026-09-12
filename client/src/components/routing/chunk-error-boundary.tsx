import { Component, type ReactNode } from "react"
import { PageError } from "@/components/feedback/page-error"

const CHUNK_LOAD_ERROR =
  /Failed to fetch dynamically imported module|Loading chunk|error loading dynamically imported module/i

interface ChunkErrorBoundaryProps {
  children: ReactNode
}

interface ChunkErrorBoundaryState {
  error: Error | null
}

export class ChunkErrorBoundary extends Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState {
    if (!CHUNK_LOAD_ERROR.test(error.message)) {
      throw error
    }

    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-svh items-center justify-center p-6">
          <PageError
            title="This page failed to load"
            message={this.state.error.message}
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }

    return this.props.children
  }
}
