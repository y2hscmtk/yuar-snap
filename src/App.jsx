import { useState, useEffect } from 'react'
import LZString from 'lz-string'
import ContractForm from './components/ContractForm'
import ContractPreview from './components/ContractPreview'
import SignaturePad from './components/SignaturePad'
import EmailDeliveryModal from './components/EmailDeliveryModal'
import NoticeToast from './components/NoticeToast'
import { generatePDF } from './utils/pdfGenerator'
import { shortenUrl } from './utils/urlShortener'
import packageInfo from '../package.json'
import './App.css'

const DEFAULT_CONTRACT_DATA = {
  contractorName: '',
  venue: '',
  contact: '',
  weddingDate: '',
  weddingTime: '',
  packageConfig: 'standard',
  options: 'none',
  hasCustomOption: false,
  customOptions: [],
  discountItems: [],
  finalPrice: '0원',
  signature: null
}

const CONTRACT_FIELD_KEYS = new Set(Object.keys(DEFAULT_CONTRACT_DATA))

const KEY_MAP = {
  contractorName: 'n',
  venue: 'v',
  contact: 'c',
  weddingDate: 'd',
  weddingTime: 't',
  packageConfig: 'p',
  options: 'o',
  hasCustomOption: 'h',
  customOptions: 'co',
  discountItems: 'di',
  finalPrice: 'fp',
  signature: 's'
}

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
)

const MINIFIED_KEYS = new Set(Object.values(KEY_MAP))

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((value || '').trim())

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onloadend = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    const base64 = result.split(',')[1]
    if (!base64) {
      reject(new Error('Failed to convert blob to base64'))
      return
    }
    resolve(base64)
  }
  reader.onerror = () => reject(new Error('Failed to read blob'))
  reader.readAsDataURL(blob)
})

const minifyData = (data) => {
  const minified = {}
  for (const [key, value] of Object.entries(data)) {
    if (!CONTRACT_FIELD_KEYS.has(key)) {
      continue
    }
    // Skip empty or default values to save space
    if (!value || value === '' || value === 'none' || value === false || (Array.isArray(value) && value.length === 0)) {
      continue
    }

    const shortKey = KEY_MAP[key] || key

    if (key === 'customOptions' && Array.isArray(value)) {
      // Minify custom options array
      minified[shortKey] = value.map(opt => ({
        i: opt.id,
        n: opt.name,
        p: opt.price,
        s: opt.sign
      }))
    } else {
      minified[shortKey] = value
    }
  }
  return minified
}

const unminifyData = (minified) => {
  const data = {}
  for (const [key, value] of Object.entries(minified)) {
    const longKey = REVERSE_KEY_MAP[key] || key
    if (!CONTRACT_FIELD_KEYS.has(longKey)) {
      continue
    }

    if (longKey === 'customOptions' && Array.isArray(value)) {
      data[longKey] = value.map(opt => ({
        id: opt.i,
        name: opt.n,
        price: opt.p,
        sign: opt.s
      }))
    } else {
      data[longKey] = value
    }
  }
  return data
}

function App() {
  const [contractData, setContractData] = useState(DEFAULT_CONTRACT_DATA)
  const appVersion = `v${packageInfo.version}`

  const [viewMode, setViewMode] = useState('edit') // 'edit', 'preview', 'sign'
  const [isSharedMode, setIsSharedMode] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [showEmailDeliveryModal, setShowEmailDeliveryModal] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [notice, setNotice] = useState(null)
  const hasCompletedSignature = typeof contractData.signature === 'string' &&
    contractData.signature.trim().startsWith('data:image/')

  // Check for shared data in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedData = params.get('data')

    if (sharedData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedData)
        if (decompressed) {
          const parsedData = JSON.parse(decompressed)
          // Check if data is minified (has short keys) or legacy (long keys)
          const isMinified = Object.keys(parsedData).some(k => MINIFIED_KEYS.has(k));

          const restoredData = isMinified ? unminifyData(parsedData) : parsedData;

          setContractData(prev => ({ ...prev, ...restoredData }))
          setIsSharedMode(true)
          setViewMode('preview')
        }
      } catch (error) {
        console.error('Failed to parse shared data', error)
        setNotice({ type: 'error', message: '잘못된 계약서 링크입니다.' })
      }
    }
  }, [])

  const showNotice = (message, type = 'info') => {
    setNotice({
      id: Date.now(),
      type,
      message
    })
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setContractData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const sendSignedContractEmail = async (pdfBlob, fileName, recipientEmail) => {
    const normalizedRecipientEmail = (recipientEmail || '').trim().toLowerCase()
    if (!hasCompletedSignature) {
      throw new Error('서명 완료 후 이메일 전송이 가능합니다.')
    }
    if (!isValidEmail(normalizedRecipientEmail)) {
      throw new Error('유효한 이메일 주소를 입력해주세요.')
    }

    const pdfBase64 = await blobToBase64(pdfBlob)
    const response = await fetch('/api/send-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractorEmail: normalizedRecipientEmail,
        fileName,
        pdfBase64,
        contractSummary: {
          contractorName: contractData.contractorName,
          contact: contractData.contact,
          weddingDate: contractData.weddingDate,
          weddingTime: contractData.weddingTime,
          venue: contractData.venue,
          finalPrice: contractData.finalPrice
        }
      })
    })

    const rawResponseText = await response.text()
    let result = {}
    if (rawResponseText) {
      try {
        result = JSON.parse(rawResponseText)
      } catch {
        result = {}
      }
    }

    if (!response.ok) {
      const errorMessage = typeof result?.error === 'string' ? result.error : '이메일 전송 실패'
      const detailMessage = typeof result?.details === 'string' ? result.details : ''
      const hintMessage = typeof result?.hint === 'string' ? result.hint : ''
      const fallbackBody = !detailMessage && !hintMessage && rawResponseText
        ? rawResponseText.trim()
        : ''
      const composed = [errorMessage, detailMessage || fallbackBody, hintMessage]
        .filter(Boolean)
        .join('\n')

      throw new Error(composed || `이메일 전송 실패 (HTTP ${response.status})`)
    }
  }

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    // Yield to the event loop to allow the loading overlay to render
    setTimeout(async () => {
      try {
        const formattedDate = contractData.weddingDate ? contractData.weddingDate.replace(/-/g, '') : '날짜미정'
        const fileName = `유아르스냅_${contractData.contractorName || '미정'}_${formattedDate}.pdf`
        const pdfResult = await generatePDF('contract-preview', fileName)
        if (!pdfResult?.blob) {
          throw new Error('PDF 생성 결과를 확인할 수 없습니다.')
        }
      } catch (error) {
        console.error('PDF Generation failed', error)
        showNotice('PDF 생성 중 오류가 발생했습니다.', 'error')
      } finally {
        setIsGenerating(false)
      }
    }, 100)
  }

  const handleEmailDelivery = async (email) => {
    setIsSendingEmail(true)
    try {
      const formattedDate = contractData.weddingDate ? contractData.weddingDate.replace(/-/g, '') : '날짜미정'
      const fileName = `유아르스냅_${contractData.contractorName || '미정'}_${formattedDate}.pdf`
      const pdfResult = await generatePDF('contract-preview', fileName, { save: false })
      if (!pdfResult?.blob) {
        throw new Error('PDF 생성에 실패했습니다.')
      }
      await sendSignedContractEmail(pdfResult.blob, fileName, email)
      setShowEmailDeliveryModal(false)
      showNotice('입력하신 이메일로 서명 완료 PDF를 전송했습니다.', 'success')
    } finally {
      setIsSendingEmail(false)
    }
  }

  const generateShareLink = async () => {
    const minifiedData = minifyData(contractData)
    const dataString = JSON.stringify(minifiedData)
    const compressed = LZString.compressToEncodedURIComponent(dataString)
    const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`

    const shortUrl = await shortenUrl(url);
    const isLocalHost = ['localhost', '127.0.0.1'].includes(window.location.hostname)
    const copiedUrl = shortUrl || url
    const usedFallback = !isLocalHost && copiedUrl === url

    try {
      await navigator.clipboard.writeText(copiedUrl)
      if (usedFallback) {
        showNotice(`단축 서비스 장애로 원본 링크가 복사되었습니다.\n${copiedUrl}`, 'info')
        return
      }
      showNotice(`링크가 클립보드에 복사되었습니다.\n${copiedUrl}`, 'success')
    } catch {
      showNotice(`링크 복사에 실패했습니다. 아래 URL을 직접 복사해주세요.\n${copiedUrl}`, 'error')
    }
  }

  const handleSignatureComplete = (signatureData) => {
    setContractData(prev => ({ ...prev, signature: signatureData }))
    setShowSignaturePad(false)
  }

  return (
    <div className="app-container">
      {isGenerating && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>PDF 생성 중입니다...</p>
        </div>
      )}

      {showSignaturePad && (
        <SignaturePad
          onSave={handleSignatureComplete}
          onCancel={() => setShowSignaturePad(false)}
          onNotify={showNotice}
        />
      )}

      {showEmailDeliveryModal && (
        <EmailDeliveryModal
          hasSignature={hasCompletedSignature}
          isSending={isSendingEmail}
          onClose={() => setShowEmailDeliveryModal(false)}
          onSubmit={handleEmailDelivery}
        />
      )}

      <NoticeToast
        notice={notice}
        onClose={() => setNotice(null)}
      />

      <header className="app-header">
        <h1>유아르 스냅 {isSharedMode ? '(전자 서명)' : ''}</h1>
        <div className="view-controls">
          {!isSharedMode && (
            <>
              <button
                className={`btn ${viewMode === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('edit')}
                disabled={isGenerating}
              >
                작성
              </button>
              <button
                className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('preview')}
                disabled={isGenerating}
              >
                미리보기
              </button>
            </>
          )}
        </div>
      </header>

      <main className="app-main">
        {!isSharedMode && (
          <div className={`view-section ${viewMode === 'edit' ? 'active' : ''}`}>
            <ContractForm
              data={contractData}
              onChange={handleInputChange}
            />
          </div>
        )}

        <div className={`view-section ${viewMode === 'preview' ? 'active' : ''}`}>
          <div className="preview-actions">
            {isSharedMode && (
              <button
                className="btn btn-primary"
                onClick={() => setShowSignaturePad(true)}
                disabled={isGenerating || isSendingEmail}
              >
                {hasCompletedSignature ? '✍️ 서명 수정하기' : '✍️ 서명하기'}
              </button>
            )}

            {isSharedMode && (
              <button
                className="btn btn-primary"
                onClick={() => setShowEmailDeliveryModal(true)}
                disabled={!hasCompletedSignature || isGenerating || isSendingEmail}
              >
                📧 이메일 전송
              </button>
            )}

            {!isSharedMode && (
              <button className="btn btn-success" onClick={generateShareLink}>
                🔗 계약서 링크 생성
              </button>
            )}

            {(!isSharedMode || hasCompletedSignature) && (
              <button
                className="btn btn-primary"
                onClick={handleDownloadPDF}
                disabled={isGenerating || isSendingEmail}
              >
                {isGenerating ? '생성 중...' : 'PDF 다운로드'}
              </button>
            )}
          </div>
          <ContractPreview data={contractData} />
          {isSharedMode && (
            <div className="shared-bottom-meta" role="contentinfo">
              <span className="meta-item">
                문의: <a href="mailto:y2_12@naver.com">y2_12@naver.com</a>
              </span>
              <span className="meta-item">Version {appVersion}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

export default App
