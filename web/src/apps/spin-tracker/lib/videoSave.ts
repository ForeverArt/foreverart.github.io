/**
 * 视频保存工具
 * 优先通过 Web Share API 保存到相册（移动端），
 * 不支持时回退到 <a download> 下载。
 */

export type SaveResult = 'shared' | 'downloaded' | 'cancelled' | 'failed'

export async function saveVideoToCameraRoll(blob: Blob, filename: string): Promise<SaveResult> {
  const file = new File([blob], filename, { type: blob.type })

  // 尝试 Web Share API（移动端可存入相册）
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
      return 'shared'
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
      // 其他错误回退到下载
    }
  }

  // 回退：通过 <a download> 下载
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    return 'downloaded'
  } catch {
    return 'failed'
  }
}
