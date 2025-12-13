import React, { forwardRef, useEffect, useState } from 'react';
import './ContractPreview.css';

const ContractPreview = forwardRef(({ data }, ref) => {
    const [scale, setScale] = useState(1);

    useEffect(() => {
        const handleResize = () => {
            const containerWidth = window.innerWidth;
            // 210mm is approx 794px at 96dpi, adding some padding (40px)
            const targetWidth = 840;

            if (containerWidth < targetWidth) {
                const newScale = (containerWidth - 32) / targetWidth; // 32px for padding
                setScale(Math.max(newScale, 0.3)); // Min scale 0.3
            } else {
                setScale(1);
            }
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Format date nicely
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    };

    return (
        <div className="preview-container">
            <div
                className="contract-scale-wrapper"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    height: scale === 1 ? 'auto' : `${297 * 4 * scale}px`, // Adjust height for scroll
                    marginBottom: '2rem'
                }}
            >
                <div className="contract-paper" id="contract-preview" ref={ref}>
                    {/* Background Logo */}
                    {data.logoImage && (
                        <div className="watermark-container">
                            <img src={data.logoImage} alt="Watermark" className="watermark-img" />
                        </div>
                    )}

                    <div className="contract-content">
                        <header className="contract-header">
                            <h1 className="title">WEDDING SNAP CONTRACT</h1>
                            <p className="subtitle">Yuar Snap (유아르 스냅)</p>
                        </header>

                        <table className="info-table">
                            <tbody>
                                <tr>
                                    <th>계약자</th>
                                    <td>{data.contractorName}</td>
                                    <th>연락처</th>
                                    <td>{data.contact}</td>
                                </tr>
                                <tr>
                                    <th>예식일시</th>
                                    <td colSpan="3">
                                        {formatDate(data.weddingDate)} {data.weddingTime}
                                    </td>
                                </tr>
                                <tr>
                                    <th>예식장</th>
                                    <td colSpan="3">{data.venue}</td>
                                </tr>
                                <tr>
                                    <th>상품구성</th>
                                    <td colSpan="3" className="multi-line">{data.packageConfig}</td>
                                </tr>
                                <tr>
                                    <th>추가옵션</th>
                                    <td colSpan="3" className="multi-line">{data.options}</td>
                                </tr>
                                <tr>
                                    <th>할인항목</th>
                                    <td colSpan="3" className="multi-line">{data.discountItems}</td>
                                </tr>
                                <tr className="total-row">
                                    <th>최종가격</th>
                                    <td colSpan="3">{data.finalPrice}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="contract-body">
                            <h3>제 1 조 [계약의 목적]</h3>
                            <p>본 계약은 "촬영자"(이하 "갑"이라 한다)와 "계약자"(이하 "을"이라 한다) 간의 웨딩 스냅 촬영 용역 제공 및 이에 따른 대금 지급에 관한 제반 사항을 규정함을 목적으로 한다.</p>

                            <h3>제 2 조 [촬영의 범위]</h3>
                            <p>갑은 을이 예약한 예식 일시와 장소에서 계약된 상품 구성에 따라 촬영을 진행한다.</p>

                            <h3>제 3 조 [대금 지급]</h3>
                            <p>을은 갑에게 계약금과 잔금을 정해진 기일 내에 지급하여야 한다.</p>

                            <h3>제 4 조 [환불 규정]</h3>
                            <p>예식일 기준 90일 전 취소 시 계약금 전액 환불, 그 이후는 환불 불가하다.</p>

                            <div className="placeholder-note">
                                (This is a placeholder for the full contract terms. In a real app, this would be the full text from the PDF.)
                            </div>
                        </div>

                        <footer className="contract-footer">
                            <div className="signature-section">
                                <div className="signature-block">
                                    <span>촬영자 (갑):</span>
                                    <span className="signer-name">유아르 스냅</span>
                                    <span className="sign-space">(인)</span>
                                </div>
                                <div className="signature-block">
                                    <span>계약자 (을):</span>
                                    <span className="signer-name">{data.contractorName}</span>
                                    <span className="sign-space">(인)</span>
                                </div>
                            </div>
                            <p className="date-signed">{new Date().toLocaleDateString('ko-KR')} 작성</p>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
});

ContractPreview.displayName = 'ContractPreview';

export default ContractPreview;
