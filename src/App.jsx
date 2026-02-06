import { useState, useEffect } from 'react'
import LZString from 'lz-string'
import ContractForm from './components/ContractForm'
import ContractPreview from './components/ContractPreview'
import SignaturePad from './components/SignaturePad'
import { generatePDF } from './utils/pdfGenerator'
import { shortenUrl } from './utils/urlShortener'
import './App.css'

const KEY_MAP = {
  contractorName: 'n',
  contractorEmail: 'e',
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
  const [contractData, setContractData] = useState({
    contractorName: '',
    contractorEmail: '',
    venue: '',
    contact: '',
    weddingDate: '',
    weddingTime: '',
    packageConfig: 'standard', // Default to standard
    options: 'none',
    hasCustomOption: false,
    customOptions: [], // Array of { id, name, price, sign }
    discountItems: [], // Array for multiple selections
    finalPrice: '0원', // Number type for calculation
    signature: null, // Data URL of signature
  })

  const [viewMode, setViewMode] = useState('edit') // 'edit', 'preview', 'sign'
  const [isSharedMode, setIsSharedMode] = useState(false)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

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
        alert('잘못된 계약서 링크입니다.')
      }
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setContractData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const sendSignedContractEmail = async (pdfBlob, fileName) => {
    const contractorEmail = contractData.contractorEmail.trim().toLowerCase()
    if (!isValidEmail(contractorEmail)) {
      alert('계약자 이메일이 없어 PDF만 다운로드되었습니다.')
      return false
    }

    const pdfBase64 = await blobToBase64(pdfBlob)
    const response = await fetch('/api/send-contract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contractorEmail,
        fileName,
        pdfBase64,
        contractSummary: {
          contractorName: contractData.contractorName,
          contractorEmail: contractData.contractorEmail,
          contact: contractData.contact,
          weddingDate: contractData.weddingDate,
          weddingTime: contractData.weddingTime,
          venue: contractData.venue,
          finalPrice: contractData.finalPrice
        }
      })
    })

    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      const message = typeof result?.error === 'string' ? result.error : '이메일 전송 실패'
      throw new Error(message)
    }

    return true
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

        const shouldSendEmail = Boolean(contractData.signature && pdfResult?.blob)
        if (shouldSendEmail) {
          try {
            const sent = await sendSignedContractEmail(pdfResult.blob, fileName)
            if (sent) {
              alert('PDF 다운로드 및 이메일 전송이 완료되었습니다.')
            }
          } catch (emailError) {
            console.error('Email send failed', emailError)
            const message = emailError instanceof Error ? emailError.message : '알 수 없는 오류'
            alert(`PDF는 다운로드되었지만 이메일 전송에 실패했습니다.\n${message}`)
          }
        }
      } catch (error) {
        console.error('PDF Generation failed', error)
        alert('PDF 생성 중 오류가 발생했습니다.')
      } finally {
        setIsGenerating(false)
      }
    }, 100)
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

    navigator.clipboard.writeText(copiedUrl).then(() => {
      if (usedFallback) {
        alert(`단축 서비스 장애로 원본 링크가 복사되었습니다.\n\n${copiedUrl}`)
        return
      }
      alert(`링크가 클립보드에 복사되었습니다.\n\n${copiedUrl}`)
    }).catch(() => {
      alert('링크 복사에 실패했습니다. URL을 직접 복사해주세요:\n' + copiedUrl)
    })
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
        />
      )}

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
          <div className="preview-actions" style={{ marginBottom: '1rem', textAlign: 'center', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            {isSharedMode && (
              <button
                className="btn btn-primary"
                onClick={() => setShowSignaturePad(true)}
              >
                {contractData.signature ? '✍️ 서명 수정하기' : '✍️ 서명하기'}
              </button>
            )}

            {!isSharedMode && (
              <button className="btn btn-success" onClick={generateShareLink}>
                🔗 계약서 링크 생성
              </button>
            )}

            {(!isSharedMode || contractData.signature) && (
              <button
                className="btn btn-primary"
                onClick={handleDownloadPDF}
                disabled={isGenerating}
              >
                {isGenerating ? '생성 중...' : 'PDF 다운로드'}
              </button>
            )}
          </div>
          <ContractPreview data={contractData} />
        </div>
      </main>
    </div>
  )
}

export default App
