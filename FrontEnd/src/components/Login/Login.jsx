import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdPerson } from "react-icons/md";
import { IoMdEye } from "react-icons/io";
import { IoMdEyeOff } from "react-icons/io";
import "./Login.css";
import logo from "../../assets/logo.svg";
import Modal from "../templates/Modal";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const Login = () => {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      const loginResponse = await fetch(VITE_API_URL + `/usuarios/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha: password }),
      });
      console.log(loginResponse);
      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.message || "Erro ao fazer login");
      }

      const loginData = await loginResponse.json();
      const token = loginData.token;
      localStorage.setItem("token", token);

      navigate("/home");
    } catch (error) {
      setErrorMessage(error.message);
    }
  };

  const handleForgotPassword = () => {
    setIsModalOpen(true);
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    const email = e.target["recovery-email"].value;
  
    // Chama seu backend para disparar o e-mail
    try {
      await fetch(VITE_API_URL + "/usuarios/recover-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      // independentemente de sucesso ou falha na API, mostra modal de confirmação
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
    } catch (err) {
      // Em caso de erro não mostre detalhes pro usuário, por segurança
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
    }
  };

  return (
    <main className="login">
      <section className="login-left">
        <div className="logo">
          <img src={logo} alt="Logo Galeriloop" />
          <h1 className="logo-title">G A L E R I L O O P</h1>
        </div>
      </section>
      <section className="login-right">
        <h2 className="welcome-text">Bem Vindo de Volta!</h2>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email" className="input-label">
              Email:
            </label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                className="login-input"
                placeholder="Digite seu email"
                required
              />
              <span className="input-icon"><MdPerson /></span>
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="password" className="input-label">
              Senha:
            </label>
            <div className="input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="login-input"
                placeholder="Digite sua senha"
                required
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Mostrar ou ocultar senha"
              >
                {showPassword ? <IoMdEyeOff /> :  <IoMdEye />}
              </button>
            </div>
          </div>
          <a className="forgot-password" onClick={handleForgotPassword}>
            Esqueceu sua senha?
          </a>
          {errorMessage && <p className="error-message">{errorMessage}</p>}
          <button type="submit" className="login-button">
            Entrar
          </button>
        </form>
        <p className="footer-text">
          Gostou da ideia?{" "}
          <a href="/About" className="contact-link">
            Fale conosco
          </a>
        </p>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
        <h3 className="forgot-modal-title">Esqueceu a senha?</h3>
        <form onSubmit={handleSendEmail} className="modal-form" style={{width: "100%"}}>
          <input
            type="email"
            id="recovery-email"
            className="forgot-modal-input"
            placeholder="Digite o email atrelado à conta"
            required
          />
          <button type="submit" className="forgot-modal-button">
            Enviar
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isConfirmationOpen}
        onClose={() => setIsConfirmationOpen(false)}
      >
        <p className="confirmation-message">
          Caso o email esteja cadastrado, será enviado instruções de como
          resetar a senha.
        </p>
      </Modal>
    </main>
  );
};

export default Login;
