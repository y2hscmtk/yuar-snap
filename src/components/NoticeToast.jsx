import { useEffect } from 'react'
import './NoticeToast.css'

function NoticeToast({ notice, onClose }) {
  useEffect(() => {
    if (!notice) return undefined
    const timeoutId = window.setTimeout(() => {
      onClose()
    }, 4200)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [notice, onClose])

  if (!notice) return null

  return (
    <div className={`notice-toast notice-${notice.type || 'info'}`} role="status" aria-live="polite">
      <p className="notice-message">{notice.message}</p>
      <button type="button" className="notice-close" onClick={onClose} aria-label="알림 닫기">
        닫기
      </button>
    </div>
  )
}

export default NoticeToast
