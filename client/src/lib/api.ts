export function getVideoUrl(
  projectId: string,
  version: string,
  filename: string,
): string {
  const encodedFilename = filename
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/")

  return `/video/${encodeURIComponent(projectId)}/${encodeURIComponent(version)}/${encodedFilename}`
}
