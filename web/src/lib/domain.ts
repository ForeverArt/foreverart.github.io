export const FS_DOMAIN = 'app.foreverart.vip'
export const NEWS_DOMAIN = 'news.foreverart.vip'
export const IS_FS_DOMAIN = typeof window !== 'undefined' && window.location.hostname === FS_DOMAIN
export const IS_NEWS_DOMAIN = typeof window !== 'undefined' && window.location.hostname === NEWS_DOMAIN

export function fsUrl(path: string): string {
  return `https://${FS_DOMAIN}${path}`
}
