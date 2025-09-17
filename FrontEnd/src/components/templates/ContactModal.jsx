
import React, { useState } from 'react';
import Modal from './Modal';
import { useState as useStateReact } from 'react';
import './ContactModal.css';

const VITE_API_URL = import.meta.env.VITE_API_URL;


const ContactModal = ({ isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState({ open: false, success: false, message: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    try {
      const res = await fetch(`${VITE_API_URL}/contato`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, mensagem })
      });
      if (!res.ok) throw new Error('Erro ao enviar mensagem');
      setFeedbackModal({ open: true, success: true, message: 'Mensagem enviada com sucesso!' });
      setEmail('');
      setMensagem('');
    } catch (err) {
      setFeedbackModal({ open: true, success: false, message: 'Erro ao enviar mensagem. Tente novamente.' });
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        
        <form className="contact-modal-form" onSubmit={handleSubmit}>
          <h2 className="contact-modal-title">Ficou interessado em nosso aplicativo?<br/>Entre em contato conosco!</h2>
          <label className="contact-modal-label">Email:</label>
          <input
            className="contact-modal-input"
            type="email"
            placeholder="Digite um email para contato"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
          <label className="contact-modal-label">Mensagem:</label>
          <textarea
            className="contact-modal-textarea"
            placeholder="Digite sua mensagem"
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
            required
          />
          <button className="contact-modal-send-btn" type="submit" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar'}
          </button>
        </form>
      </Modal>
      <Modal isOpen={feedbackModal.open} onClose={() => setFeedbackModal({ ...feedbackModal, open: false })}>
        <div className={feedbackModal.success ? "contact-feedback-modal" : "contact-feedback-modal error"}>
          <div className="contact-feedback-header">
            <h2 className={feedbackModal.success ? "contact-feedback-title" : "contact-feedback-title error"}>
              {feedbackModal.success ? 'Sucesso!' : 'Erro'}
            </h2>
            <button
              onClick={() => setFeedbackModal({ ...feedbackModal, open: false })}
              className="contact-feedback-close-icon"
              title="Fechar"
            >
              ✖
            </button>
          </div>
          <div className={feedbackModal.success ? "contact-feedback-message" : "contact-feedback-message error"}>
            {feedbackModal.message}
          </div>
          <div className="contact-feedback-footer">
            <button className="contact-feedback-close-btn" onClick={() => setFeedbackModal({ ...feedbackModal, open: false })}>
              Fechar
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ContactModal;
