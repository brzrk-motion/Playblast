export function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}
