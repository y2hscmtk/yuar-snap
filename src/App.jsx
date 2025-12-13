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
    options: '',
    discountItems: '',
    finalPrice: '',
    packageConfig: '',
    logoImage: null
  })

  const [viewMode, setViewMode] = useState('edit') // 'edit' or 'preview'

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setContractData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setContractData(prev => ({
          ...prev,
          logoImage: reader.result
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleDownloadPDF = () => {
    generatePDF('contract-preview', `contract_${contractData.contractorName || 'draft'}.pdf`)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Yuar Snap Contract Generator</h1>
        <div className="view-controls">
          <button
            className={`btn ${viewMode === 'edit' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('edit')}
          >
            Edit
          </button>
          <button
            className={`btn ${viewMode === 'preview' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('preview')}
          >
            Preview
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className={`view-section ${viewMode === 'edit' ? 'active' : ''}`}>
          <ContractForm
            data={contractData}
            onChange={handleInputChange}
            onImageUpload={handleImageUpload}
          />
        </div>
        <div className={`view-section ${viewMode === 'preview' ? 'active' : ''}`}>
          <div className="preview-actions" style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <button className="btn btn-primary" onClick={handleDownloadPDF}>
              Download PDF
            </button>
          </div>
          <ContractPreview data={contractData} />
        </div>
      </main>
    </div>
  )
}

export default App
