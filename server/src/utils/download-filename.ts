import path from "node:path"

function slugifyProjectName(projectName: string): string {
  const slug = projectName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")

  return slug || "project"
}

export function buildVersionDownloadFilename(
  projectName: string,
  versionLabel: string,
  originalFilename: string,
): string {
  const ext = path.extname(originalFilename).toLowerCase()
  const slug = slugifyProjectName(projectName)

  return `${slug}-${versionLabel}${ext}`
}
