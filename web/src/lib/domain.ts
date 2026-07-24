export const FS_DOMAIN = 'app.foreverart.vip'
export const IS_FS_DOMAIN = typeof window !== 'undefined' && window.location.hostname === FS_DOMAIN

export function fsUrl(path: string): string {
  return `https://${FS_DOMAIN}${path}`
}
