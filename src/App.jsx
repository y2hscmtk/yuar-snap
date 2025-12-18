import { useState, useEffect } from 'react'
import LZString from 'lz-string'
import ContractForm from './components/ContractForm'
import ContractPreview from './components/ContractPreview'
import SignaturePad from './components/SignaturePad'
import { generatePDF } from './utils/pdfGenerator'
import './App.css'

function App() {
  const [contractData, setContractData] = useState({
    contractorName: '',
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

  // Key mapping for minification
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
          // We assume if it has 'n' (name) or 'd' (date) it's likely minified, 
          // but to be safe we can try to unminify if keys match KEY_MAP values.
          const isMinified = Object.keys(parsedData).some(k => Object.values(KEY_MAP).includes(k));

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

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    // Yield to the event loop to allow the loading overlay to render
    setTimeout(async () => {
      try {
        const formattedDate = contractData.weddingDate ? contractData.weddingDate.replace(/-/g, '') : '날짜미정';
        await generatePDF('contract-preview', `유아르스냅_${contractData.contractorName || '미정'}_${formattedDate}.pdf`)
      } catch (error) {
        console.error('PDF Generation failed', error)
        alert('PDF 생성 중 오류가 발생했습니다.')
      } finally {
        setIsGenerating(false)
      }
    }, 100)
  }

  const generateShareLink = () => {
    const minifiedData = minifyData(contractData)
    const dataString = JSON.stringify(minifiedData)
    const compressed = LZString.compressToEncodedURIComponent(dataString)
    const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`

    navigator.clipboard.writeText(url).then(() => {
      alert('링크가 클립보드에 복사되었습니다.')
    }).catch(() => {
      alert('링크 복사에 실패했습니다. URL을 직접 복사해주세요:\n' + url)
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
