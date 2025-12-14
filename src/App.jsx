import { useState } from 'react'
import ContractForm from './components/ContractForm'
import ContractPreview from './components/ContractPreview'
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
    customOptionName: '',
    customOptionPrice: 0,
    discountItems: [], // Array for multiple selections
    finalPrice: '0원', // Number type for calculation
  })

  const [viewMode, setViewMode] = useState('edit') // 'edit' or 'preview'

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setContractData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const [isGenerating, setIsGenerating] = useState(false)

  const handleDownloadPDF = async () => {
    setIsGenerating(true)
    // Yield to the event loop to allow the loading overlay to render
    setTimeout(async () => {
      try {
        await generatePDF('contract-preview', `contract_${contractData.contractorName || 'draft'}.pdf`)
      } catch (error) {
        console.error('PDF Generation failed', error)
        alert('PDF 생성 중 오류가 발생했습니다.')
      } finally {
        setIsGenerating(false)
      }
    }, 100)
  }

  return (
    <div className="app-container">
      {isGenerating && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>PDF 생성 중입니다...</p>
        </div>
      )}
      <header className="app-header">
        <h1>유아르 스냅</h1>
        <div className="view-controls">
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
        </div>
      </header>

      <main className="app-main">
        <div className={`view-section ${viewMode === 'edit' ? 'active' : ''}`}>
          <ContractForm
            data={contractData}
            onChange={handleInputChange}
          />
        </div>
        <div className={`view-section ${viewMode === 'preview' ? 'active' : ''}`}>
          <div className="preview-actions" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleDownloadPDF}
              disabled={isGenerating}
            >
              {isGenerating ? '생성 중...' : 'PDF 다운로드'}
            </button>
          </div>
          <ContractPreview data={contractData} />
        </div>
      </main>
    </div>
  )
}

export default App
