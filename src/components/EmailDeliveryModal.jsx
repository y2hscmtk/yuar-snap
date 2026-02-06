import { useMemo, useState } from 'react'
import './EmailDeliveryModal.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function EmailDeliveryModal({ hasSignature, isSending, onClose, onSubmit }) {
  const [email, setEmail] = useState('')
  const [isTouched, setIsTouched] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email])
  const isEmailValid = EMAIL_REGEX.test(normalizedEmail)
  const canSubmit = hasSignature && isEmailValid && !isSending
  const showInvalidMessage = isTouched && !isEmailValid && normalizedEmail.length > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsTouched(true)
    setSubmitError('')
    if (!canSubmit) return

    try {
      await onSubmit(normalizedEmail)
    } catch (error) {
      const message = error instanceof Error ? error.message : '이메일 전송 중 오류가 발생했습니다.'
      setSubmitError(message)
    }
  }

  return (
    <div className="email-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="email-modal-title">
      <div className="email-modal-container">
        <h3 id="email-modal-title">서명 완료본 이메일 받기</h3>
        <p className="email-modal-description">
          서명을 완료하신 후, [이메일 전송] 버튼을 누르면 입력하신 이메일로 PDF 파일이 전송됩니다.
        </p>
        <form onSubmit={handleSubmit} className="email-modal-form">
          <label htmlFor="delivery-email">이메일 주소</label>
          <input
            id="delivery-email"
            type="email"
            autoComplete="email"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => setIsTouched(true)}
            className={showInvalidMessage ? 'input-invalid' : ''}
          />
          {showInvalidMessage && (
            <p className="email-modal-error">유효한 이메일 주소를 입력해주세요.</p>
          )}
          {!hasSignature && (
            <p className="email-modal-note">서명 완료 후 이메일 전송이 가능합니다.</p>
          )}
          {submitError && (
            <p className="email-modal-error">{submitError}</p>
          )}
          <div className="email-modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSending}>
              취소
            </button>
            <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
              {isSending ? '전송 중...' : '이메일 전송'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default EmailDeliveryModal
