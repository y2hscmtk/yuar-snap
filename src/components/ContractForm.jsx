import React, { useEffect } from 'react';
import './ContractForm.css';

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

const ContractForm = ({ data, onChange }) => {

    // Calculate price whenever dependencies change
    useEffect(() => {
        let total = 0;

        // Package Price
        if (data.packageConfig && PRICING.packages[data.packageConfig]) {
            total += PRICING.packages[data.packageConfig].price;
        }

        // Option Price
        if (data.options && PRICING.options[data.options]) {
            total += PRICING.options[data.options].price;
        }

        // Custom Option Price (Additive)
        if (data.hasCustomOption) {
            total += Number(data.customOptionPrice) || 0;
        }

        // Discount Price
        if (Array.isArray(data.discountItems)) {
            data.discountItems.forEach(itemId => {
                const discount = PRICING.discounts.find(d => d.id === itemId);
                if (discount) {
                    total += discount.price;
                }
            });
        }

        // Update parent state with formatted price
        // We use a custom event-like object to reuse the existing onChange handler
        // or we can just assume the parent passed a setter. 
        // Since the parent uses `e.target`, we mimic it.
        // However, calling onChange inside useEffect can cause loops if not careful.
        // We only want to update if the calculated price is different from data.finalPrice
        // But data.finalPrice is a string with commas, total is a number.

        const formattedTotal = total.toLocaleString('ko-KR') + '원';
        if (data.finalPrice !== formattedTotal) {
            onChange({ target: { name: 'finalPrice', value: formattedTotal } });
        }
    }, [data.packageConfig, data.options, data.discountItems, onChange, data.finalPrice]);

    const handleCheckboxChange = (e) => {
        const { value, checked } = e.target;
        let newDiscounts = [...(data.discountItems || [])];

        if (checked) {
            newDiscounts.push(value);
        } else {
            newDiscounts = newDiscounts.filter(item => item !== value);
        }

        onChange({ target: { name: 'discountItems', value: newDiscounts } });
    };

    return (
        <div className="contract-form card">
            <h2>계약서 정보 입력</h2>
            <div className="form-group">
                <label htmlFor="contractorName">계약자 (신랑/신부)</label>
                <input
                    type="text"
                    id="contractorName"
                    name="contractorName"
                    value={data.contractorName}
                    onChange={onChange}
                    placeholder="홍길동"
                />
            </div>

            <div className="form-group">
                <label htmlFor="contact">연락처</label>
                <input
                    type="text"
                    id="contact"
                    name="contact"
                    value={data.contact}
                    onChange={onChange}
                    placeholder="010-1234-5678"
                />
            </div>

            <div className="form-group">
                <label htmlFor="venue">예식장/홀</label>
                <input
                    type="text"
                    id="venue"
                    name="venue"
                    value={data.venue}
                    onChange={onChange}
                    placeholder="XX호텔 YY홀"
                />
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="weddingDate">예식일</label>
                    <input
                        type="date"
                        id="weddingDate"
                        name="weddingDate"
                        value={data.weddingDate}
                        onChange={onChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="weddingTime">예식시간</label>
                    <input
                        type="time"
                        id="weddingTime"
                        name="weddingTime"
                        value={data.weddingTime}
                        onChange={onChange}
                    />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="packageConfig">상품 구성</label>
                <select
                    id="packageConfig"
                    name="packageConfig"
                    value={data.packageConfig}
                    onChange={onChange}
                >
                    {Object.entries(PRICING.packages).map(([key, pkg]) => (
                        <option key={key} value={key}>
                            {pkg.label} ({pkg.price.toLocaleString()}원)
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label htmlFor="options">추가옵션</label>
                <select
                    id="options"
                    name="options"
                    value={data.options}
                    onChange={onChange}
                >
                    {Object.entries(PRICING.options).map(([key, opt]) => (
                        <option key={key} value={key}>
                            {opt.label} {opt.price !== 0 && `(+${opt.price.toLocaleString()}원)`}
                        </option>
                    ))}
                </select>

                <div className="custom-option-toggle">
                    <label className="checkbox-label">
                        <input
                            type="checkbox"
                            checked={data.hasCustomOption || false}
                            onChange={(e) => onChange({ target: { name: 'hasCustomOption', value: e.target.checked } })}
                        />
                        직접 입력 추가
                    </label>
                </div>

                {data.hasCustomOption && (
                    <div className="custom-option-inputs">
                        <input
                            type="text"
                            name="customOptionName"
                            value={data.customOptionName}
                            onChange={onChange}
                            placeholder="추가 항목명"
                            className="custom-input"
                        />
                        <input
                            type="number"
                            name="customOptionPrice"
                            value={data.customOptionPrice}
                            onChange={onChange}
                            placeholder="추가 금액"
                            className="custom-input"
                        />
                    </div>
                )}
            </div>

            <div className="form-group">
                <label>할인 상품 (중복 선택 가능)</label>
                <div className="checkbox-group">
                    {PRICING.discounts.map((discount) => (
                        <label key={discount.id} className="checkbox-label">
                            <input
                                type="checkbox"
                                name="discountItems"
                                value={discount.id}
                                checked={(data.discountItems || []).includes(discount.id)}
                                onChange={handleCheckboxChange}
                            />
                            {discount.label} ({discount.price.toLocaleString()}원)
                        </label>
                    ))}
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="finalPrice">최종 가격</label>
                <input
                    type="text"
                    id="finalPrice"
                    name="finalPrice"
                    value={data.finalPrice}
                    readOnly
                    className="readonly-input"
                />
            </div>
        </div>
    );
};

export default ContractForm;
