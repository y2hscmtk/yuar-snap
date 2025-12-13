import React from 'react';
import './ContractForm.css';

const ContractForm = ({ data, onChange }) => {
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
                <label htmlFor="venue">예식장</label>
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
                <textarea
                    id="packageConfig"
                    name="packageConfig"
                    value={data.packageConfig}
                    onChange={onChange}
                    rows="3"
                    placeholder="원본형 / 보정형 / 영상형 등"
                />
            </div>

            <div className="form-group">
                <label htmlFor="options">추가옵션</label>
                <textarea
                    id="options"
                    name="options"
                    value={data.options}
                    onChange={onChange}
                    rows="2"
                    placeholder="2인 촬영, 연회장 촬영 등"
                />
            </div>

            <div className="form-group">
                <label htmlFor="discountItems">할인 항목</label>
                <textarea
                    id="discountItems"
                    name="discountItems"
                    value={data.discountItems}
                    onChange={onChange}
                    rows="2"
                    placeholder="짝꿍 할인, 후기 할인 등"
                />
            </div>

            <div className="form-group">
                <label htmlFor="finalPrice">최종 가격</label>
                <input
                    type="text"
                    id="finalPrice"
                    name="finalPrice"
                    value={data.finalPrice}
                    onChange={onChange}
                    placeholder="500,000원"
                />
            </div>
        </div>
    );
};

export default ContractForm;
