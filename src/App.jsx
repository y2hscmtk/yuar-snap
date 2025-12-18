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

  // Check for shared data in URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sharedData = params.get('data')

    if (sharedData) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(sharedData)
        if (decompressed) {
          const parsedData = JSON.parse(decompressed)
          setContractData(prev => ({ ...prev, ...parsedData }))
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
    const dataString = JSON.stringify(contractData)
    const compressed = LZString.compressToEncodedURIComponent(dataString)
    const url = `${window.location.origin}${window.location.pathname}?data=${compressed}`

    navigator.clipboard.writeText(url).then(() => {
      alert('계약서 링크가 클립보드에 복사되었습니다.\n계약자에게 전달해주세요.')
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
                🔗 계약서 링크 생성 (복사)
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
