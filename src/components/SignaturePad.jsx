import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import './SignaturePad.css';

const SignaturePad = ({ onSave, onCancel }) => {
    const sigCanvas = useRef({});

    const clear = () => {
        sigCanvas.current.clear();
    };

    const save = () => {
        if (sigCanvas.current.isEmpty()) {
            alert('서명을 입력해주세요.');
            return;
        }
        // Use getCanvas() instead of getTrimmedCanvas() to avoid "import_trim_canvas.default is not a function" error
        // This means the signature won't be automatically trimmed of whitespace, but it will work reliably.
        const dataURL = sigCanvas.current.getCanvas().toDataURL('image/png');
        onSave(dataURL);
    };

    return (
        <div className="signature-pad-overlay">
            <div className="signature-pad-container">
                <h3>서명 입력</h3>
                <div className="signature-canvas-wrapper">
                    <SignatureCanvas
                        ref={sigCanvas}
                        canvasProps={{
                            className: 'signature-canvas'
                        }}
                        backgroundColor="rgba(255, 255, 255, 0)"
                    />
                </div>
                <div className="signature-actions">
                    <button className="btn btn-secondary" onClick={clear}>지우기</button>
                    <div className="right-actions">
                        <button className="btn btn-secondary" onClick={onCancel}>취소</button>
                        <button className="btn btn-primary" onClick={save}>서명 완료</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignaturePad;
