import React from 'react';
import './ContractForm.css';

const ContractForm = ({ data, onChange, onImageUpload }) => {
    return (
        <div className="contract-form card">
            <h2>Contract Details</h2>
            <div className="form-group">
                <label htmlFor="contractorName">Contractor Name (계약자)</label>
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
                <label htmlFor="contact">Contact (연락처)</label>
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
                <label htmlFor="venue">Venue (예식장)</label>
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
                    <label htmlFor="weddingDate">Wedding Date (예식일)</label>
                    <input
                        type="date"
                        id="weddingDate"
                        name="weddingDate"
                        value={data.weddingDate}
                        onChange={onChange}
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="weddingTime">Time (시간)</label>
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
                <label htmlFor="packageConfig">Basic Package Config (상품 구성)</label>
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
                <label htmlFor="options">Options (추가옵션)</label>
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
                <label htmlFor="discountItems">Discount Items (할인 항목)</label>
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
                <label htmlFor="finalPrice">Final Price (최종 가격)</label>
                <input
                    type="text"
                    id="finalPrice"
                    name="finalPrice"
                    value={data.finalPrice}
                    onChange={onChange}
                    placeholder="500,000원"
                />
            </div>

            <div className="form-group">
                <label htmlFor="logoImage">Logo / Background Image</label>
                <input
                    type="file"
                    id="logoImage"
                    accept="image/*"
                    onChange={onImageUpload}
                />
                <small>Upload a transparent PNG for the background logo.</small>
            </div>
        </div>
    );
};

export default ContractForm;
