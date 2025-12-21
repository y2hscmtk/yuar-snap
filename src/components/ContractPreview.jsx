import React, { useEffect, useState, useRef } from 'react';
import logo from '../assets/logo.png';
import sign from '../assets/sign.png';
import './ContractPreview.css';

const PRICING = {
    packages: {
        standard: { label: '스탠다드', price: 220000 },
        premium: { label: '프리미엄', price: 270000 },
    },
    options: {
        none: { label: '선택 안함', price: 0 },
        banquet: { label: '원판, 2부 및 연회장 추가', price: 50000 },
        add30min: { label: '30분 추가 촬영', price: 30000 },
    },
    discounts: [
        { id: 'portrait', label: '초상권 2인 동의', price: -20000 },
        { id: 'disagree1', label: '초상권 1인 동의', price: -10000 },
        { id: 'blog_review', label: '블로그 촬영 후기 작성', price: -10000 },
        { id: 'thread_review', label: '스레드 촬영 후기 작성', price: -10000 },
        { id: 'insta_review', label: '인스타그램 촬영 후기 작성', price: -10000 },
        { id: 'blog_contract', label: '블로그 계약 후기 작성', price: -5000 },
        { id: 'thread_contract', label: '스레드 계약 후기 작성', price: -5000 },
        { id: 'insta_contract', label: '인스타그램 계약 후기 작성', price: -5000 },
        { id: 'partner', label: '짝꿍 할인', price: -10000 },
    ]
};

const ContractPreview = ({ data }) => {
    const ref = useRef(null);
    const [scale, setScale] = useState(1);
    const [pageCount, setPageCount] = useState(1);

    useEffect(() => {
        const handleCalculations = () => {
            const containerWidth = window.innerWidth;
            // 210mm is approx 794px at 96dpi, adding some padding (40px)
            const targetWidth = 840;

            if (containerWidth < targetWidth) {
                const newScale = (containerWidth - 32) / targetWidth; // 32px for padding
                setScale(Math.max(newScale, 0.3)); // Min scale 0.3
            } else {
                setScale(1);
            }

            if (ref.current) {
                const height = ref.current.scrollHeight;
                // A4 height in px at 96dpi is approx 1123px (297mm)
                // We use a slightly smaller value to be safe or just use the mm conversion
                // 1mm = 3.7795px
                const pageHeightPx = 1122.5;
                const pages = Math.ceil(height / pageHeightPx);
                setPageCount(Math.max(pages, 1));
            }
        };

        handleCalculations();
        window.addEventListener('resize', handleCalculations);

        // Recalculate when fonts are loaded to ensure correct height
        document.fonts.ready.then(handleCalculations);

        // Recalculate when data changes
        // We removed ResizeObserver to prevent potential loops/crashes
        // Since content height mainly changes with data, this should be sufficient

        return () => {
            window.removeEventListener('resize', handleCalculations);
        };
    }, [data]);

    // Format date nicely
    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
    };

    // Helper to get label from ID with price
    const getPackageDisplay = (key) => {
        const pkg = PRICING.packages[key];
        if (!pkg) return key;
        return `${pkg.label} (${pkg.price.toLocaleString()}원)`;
    };

    const getOptionDisplay = () => {
        const items = [];

        // 1. Selected Predefined Option
        const key = data.options;
        if (key && key !== 'none' && PRICING.options[key]) {
            const opt = PRICING.options[key];
            const label = opt.price === 0 ? opt.label : `${opt.label} (+${opt.price.toLocaleString()}원)`;
            items.push(<div key="std">{label}</div>);
        }

        // 2. Custom Options
        if (data.hasCustomOption && Array.isArray(data.customOptions)) {
            data.customOptions.forEach(opt => {
                if (opt.name) {
                    const price = Number(opt.price) || 0;
                    const sign = opt.sign === -1 ? '-' : '+';
                    const label = price === 0 ? opt.name : `${opt.name} (${sign}${price.toLocaleString()}원)`;
                    items.push(<div key={`custom-${opt.id}`}>{label}</div>);
                }
            });
        }

        if (items.length === 0) return '-';
        return items;
    };

    const getDiscountDisplay = (ids) => {
        if (!Array.isArray(ids) || ids.length === 0) return '-';
        return ids.map(id => {
            const item = PRICING.discounts.find(d => d.id === id);
            if (!item) return id;
            return (
                <div key={id} className="discount-item">
                    {item.label} ({item.price.toLocaleString()}원)
                </div>
            );
        });
    };

    return (
        <div className="preview-container">
            <div
                className="contract-scale-wrapper"
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'top center',
                    height: scale === 1 ? 'auto' : `${297 * pageCount * scale}mm`, // Approximate height
                    marginBottom: '2rem'
                }}
            >
                <div className="contract-paper" id="contract-preview" ref={ref}>
                    {/* Paged Background Layer */}
                    <div className="page-background-layer">
                        {Array.from({ length: pageCount }).map((_, index) => (
                            <div
                                key={`bg-${index}`}
                                className="page-watermark"
                                style={{ top: `${index * 297}mm` }}
                            >
                                <img src={logo} alt="Watermark" />
                            </div>
                        ))}
                    </div>

                    {/* Visual Page Dividers (Preview Only) */}
                    <div className="page-divider-layer">
                        {Array.from({ length: pageCount - 1 }).map((_, index) => (
                            <div
                                key={`div-${index}`}
                                className="page-divider"
                                style={{ top: `${(index + 1) * 297}mm` }}
                            >
                                <span>Page {index + 1} / {index + 2}</span>
                            </div>
                        ))}
                    </div>

                    <div className="contract-content">
                        <header className="contract-header">
                            <h1 className="title">유아르 아이폰스냅 촬영 계약서</h1>
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
                                    <th>예식장/홀</th>
                                    <td colSpan="3">{data.venue}</td>
                                </tr>
                                <tr>
                                    <th>상품구성</th>
                                    <td colSpan="3">
                                        <div className="split-cell">
                                            <span className="package-label">{getPackageDisplay(data.packageConfig)}</span>
                                            <span className="deposit-note">예약금 100,000원 포함</span>
                                        </div>
                                    </td>
                                </tr>
                                <tr>
                                    <th>추가옵션</th>
                                    <td colSpan="3" className="multi-line">{getOptionDisplay()}</td>
                                </tr>
                                <tr>
                                    <th>할인항목</th>
                                    <td colSpan="3" className="multi-line">
                                        {getDiscountDisplay(data.discountItems)}
                                    </td>
                                </tr>
                                <tr className="total-row">
                                    <th>최종가격</th>
                                    <td colSpan="3">{data.finalPrice}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="contract-body">
                            <h3>제 1 조 [목적]</h3>
                            <p>본 계약은 ‘유아르스냅’이 ‘계약자’에게 아이폰을 이용한 웨딩 스냅 촬영 서비스를 제공하고, 이에 대한 대금 지급 및 기타 제반 사항을 규정함을 목적으로 합니다.</p>
                            <p>아이폰 스냅은 DSLR 촬영과는 다른 자연스럽고 감정 중심의 기록 촬영으로, 촬영 환경(조명, 공간, 예식 진행 등)에 따라 화질 및 색감에 제한이 있을 수 있음을 ‘계약자’는 충분히 인지하고 이에 동의합니다.</p>

                            <h3>제 2 조 [계약의 효력]</h3>
                            <ol>
                                <li>본 계약은 ‘계약자’가 ‘유아르스냅’에게 예약금을 입금한 시점부터 효력이 발생합니다.</li>
                                <li>예약금 입금이 완료된 경우, 별도의 서명 절차 없이 본 계약의 모든 조항에 동의한 것으로 간주합니다.</li>
                                <li>예약금 입금 후 6시간 이내 확인되지 않을 경우 해당 예약은 자동 취소될 수 있습니다.</li>
                            </ol>

                            <h3>제 3 조 [촬영 범위 및 구성]</h3>
                            <ol>
                                <li>‘유아르스냅’은 계약된 예식 일시 및 장소에서 계약된 상품 구성에 따라 촬영을 진행합니다.</li>
                                <li>촬영 컷 수는 현장 상황에 따라 달라질 수 있으며, 최소 제공 컷 수는 상품 안내 기준을 따릅니다.</li>
                                <li>예식장, 주례자, 메인 촬영 작가, 진행 요원의 촬영 제한 요청이 있을 경우 이를 우선적으로 따릅니다.</li>
                            </ol>
                            <h3>제 4 조 [상품 변경, 일정 변경 및 환불 규정]</h3>
                            <ol>
                                <li>예약 일정 변경은 1회에 한하여 가능하며, 일정 마감 시 변경이 불가할 수 있습니다.</li>
                                <li>본 계약은 타인에게 양도할 수 없습니다.</li>
                                <li>환불 규정은 아래와 같습니다.
                                    <ul className="sub-list">
                                        <li>계약 후 3일 이내: 전액 환불</li>
                                        <li>계약 후 3일 이후: 위약금 50,000원 제외 후 환불</li>
                                        <li>본식 60일 전 취소: 위약금 제외 후 50% 환불</li>
                                        <li>본식 30일 전 ~ 당일 취소: 환불 불가</li>
                                    </ul>
                                </li>
                            </ol>

                            <h3>제 5 조 [촬영 대금 및 결제 조건]</h3>
                            <ol>
                                <li>예약금 입금 후 예약이 확정됩니다.</li>
                                <li>계좌: KB국민은행 82820204338624 (최유진)</li>
                                <li>잔금은 본식 당일 내 전액 지급하여야 합니다.</li>
                                <li>잔금 미지급 시 결과물 전달이 제한될 수 있습니다.</li>
                            </ol>

                            <h3>제 6 조 [보정 범위]</h3>
                            <ol>
                                <li>보정 포함 항목:
                                    <ul className="sub-list">
                                        <li>색감, 밝기, 전체 톤 보정</li>
                                        <li>자연스러운 피부 정리</li>
                                    </ul>
                                </li>
                                <li>보정 불포함 항목:
                                    <ul className="sub-list">
                                        <li>합성 및 배경 제거</li>
                                        <li>과도한 리터칭 요청</li>
                                    </ul>
                                </li>
                            </ol>

                            <h3>제 7 조 [결과물 전달 및 데이터 보관]</h3>
                            <ol>
                                <li>사진 원본은 촬영 종료 후 24시간 이내 제공을 원칙으로 합니다.</li>
                                <li>
                                    <div>보정본은 ‘계약자’가 셀렉사진 전달 날을 기준으로 7일 이내 제공됩니다.</div>
                                    <div className="sub-text">(‘계약자’의 사정으로 셀렉이 어려워 ‘유아르스냅’에게 셀렉을 위임한 경우, 보정본 전달 기준일은 본식 촬영일을 기준으로 합니다.)</div>
                                </li>
                                <li>천재지변, 장비 손상, 질병 등 불가항력적인 사유로 전달이 지연될 경우, ‘유아르스냅’은 즉시 ‘계약자’에게 이를 고지하며, 가능한 한 빠른 시일 내 결과물을 전달하도록 합니다.</li>
                                <li>촬영 데이터의 보관 기간은 최종 결과물 전달 완료일로부터 2주간이며, 해당 기간 경과 후에는 사전 고지 없이 영구 삭제될 수 있습니다.</li>
                            </ol>

                            <h3>제 8 조 [저작권 및 초상권]</h3>
                            <ol>
                                <li>촬영 결과물에 대한 저작권은 ‘유아르스냅’에게 귀속됩니다.</li>
                                <li>‘계약자’는 촬영 결과물을 개인 소장, 개인 SNS 게시, 개인적 인쇄 등 비상업적 목적에 한하여 사용할 수 있습니다.</li>
                                <li>촬영 결과물에 포함된 인물의 초상권은 ‘계약자’에게 귀속됩니다.</li>
                                <li>
                                    <div>‘유아르스냅’은 촬영 결과물을 포트폴리오, SNS, 홈페이지 등 홍보 목적으로 사용할 수 있습니다.</div>
                                    <div className="sub-text">(‘계약자’가 초상권 사용에 대해 비동의를 요청한 경우, 얼굴 식별이 불가능한 모자이크 처리된 사진 또는 뒷모습 사진에 한하여 업로드될 수 있습니다.)</div>
                                </li>
                            </ol>

                            <h3>제 9 조 [면책 조항]</h3>
                            <ol>
                                <li>
                                    <div>‘유아르스냅’의 일방적 취소 또는 사전 고지 없는 당일 노쇼 발생 시, 계약금의 3배를 배상합니다.</div>
                                    <div className="sub-text">(갑작스러운 질병, 사고, 직계가족의 장례 등 불가피한 사유 발생 시 사전 고지한 경우 계약금은 전액 환불됩니다.)</div>
                                </li>
                                <li>
                                    <div>예식장 조명, 공간 제약, 촬영 제한, 장비 오류 등 불가항력적 사유로 인한 일부 결과물의 품질 저하에 대해 ‘유아르스냅’은 책임을 지지 않습니다.</div>
                                    <div className="sub-text">(‘유아르스냅’의 명백한 과실이 인정될 경우 상호 협의 하에 일부 환불 또는 이에 상응하는 보상으로 조정할 수 있습니다.)</div>
                                </li>
                                <li>예식 지연, 현장 진행 상황 등에 따라 촬영 시간은 일부 변동될 수 있습니다.</li>
                            </ol>

                            <h3>제 10 조 [할인 및 페이백 조건]</h3>
                            <ol>
                                <li>할인 또는 페이백 조건이 포함된 상품의 경우, ‘계약자’는 성실한 후기 작성을 성실히 이행하여야 합니다.</li>
                                <li>다음에 해당하는 후기는 할인 또는 페이백 조건으로 인정되지 않으며, ‘유아르스냅’은 재작성을 요청할 수 있습니다.
                                    <ul className="sub-list">
                                        <li>1~2줄의 성의 없는 후기</li>
                                        <li>AI를 활용하여 전체 내용을 자동 생성한 후기</li>
                                        <li>동일하거나 반복적인 문구로 작성된 후기</li>
                                    </ul>
                                </li>
                                <li>
                                    <div>계약 후기는 계약 체결일로부터 1개월 이내에 작성하여야 하며, 작성된 후기는 게시일로부터 6개월 이상 게시 상태로 유지하여야 합니다.</div>
                                    <div>촬영 후기는 본식 촬영일로부터 6개월 이내에 작성하여야 하며, 작성된 후기는 게시일로부터 6개월 이상 게시 상태로 유지하여야 합니다.</div>
                                    <div>짝꿍 할인은 신규 계약자에 한하여 적용되며, 이미 계약이 완료된 계약자 간에는 적용되지 않습니다.</div>
                                    <div className="sub-text">(예: 신규 계약 희망자 + 계약 완료자 → 적용 가능 / 계약 완료자 + 계약 완료자 → 적용 불가)</div>
                                </li>
                                <li>후기 작성, 짝꿍 할인 등 할인 조건이 촬영 전 이행된 경우에는 잔금에서 차감 처리되며, 촬영 후 이행된 경우에는 페이백 방식으로 지급됩니다.</li>
                                <li>현금영수증 발행이 필요한 경우, 페이백 적용 전 금액으로 기존 발행된 현금영수증을 취소한 후, 페이백 적용 금액 기준으로 재발행됩니다.</li>
                            </ol>

                            <h3>제 11 조 [기타 조항]</h3>
                            <ol>
                                <li>본 계약서에 명시되지 않은 사항은 관계 법령 및 상호 협의에 따릅니다.</li>
                                <li>본 계약은 ‘유아르스냅’과 ‘계약자’의 상호 신뢰를 바탕으로 체결되며, 양 당사자는 성실히 본 계약을 이행합니다.</li>
                            </ol>
                        </div>

                        <footer className="contract-footer">
                            <p className="agreement-text">
                                {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}, 위 내용에 상호 동의하여 본 계약을 체결합니다.
                            </p>
                            <div className="signature-section">
                                <div className="signature-block">
                                    <span className="label">계약자 서명 :</span>
                                    <div className="signer-wrapper">
                                        <span className="signer-name">{data.contractorName}</span>
                                        {data.signature && (
                                            <img src={data.signature} alt="서명" className="client-signature-img" />
                                        )}
                                    </div>
                                </div>
                                <div className="signature-block">
                                    <span className="label">유아르스냅 서명 :</span>
                                    <div className="signer-wrapper">
                                        <span className="signer-name">최유진</span>
                                        <img src={sign} alt="인" className="signature-stamp" />
                                    </div>
                                </div>
                            </div>
                        </footer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContractPreview;
