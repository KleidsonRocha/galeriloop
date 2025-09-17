import React from 'react';
import './Modal.css';

const Modal = ({ isOpen, onClose, children, disableClose }) => {
  if (!isOpen) return null;

  return (
    <div className="custom-modal">
      <div className="custom-modal-content">
        {!disableClose && (
          <button className="custom-modal-close-icon" onClick={onClose}>
            ✖
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default Modal;