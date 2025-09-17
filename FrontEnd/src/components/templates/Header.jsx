import React, { useEffect, useState } from 'react';
import ContactModal from './ContactModal';
import logo from '../../assets/logo.svg';
import { IoPersonSharp } from "react-icons/io5";
const VITE_API_URL = import.meta.env.VITE_API_URL;
import './Header.css';

export const isAuthenticated = async () => {
  const token = localStorage.getItem('token');

  if (!token) return false;

  try {
    const profileResponse = await fetch(VITE_API_URL + `/usuarios/auth`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!profileResponse.ok) {
      console.error('Erro na autenticação:', profileResponse.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return false;
  }
};

const Header = () => {
  const [isAuth, setIsAuth] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setIsAuth(authStatus);
    };

    checkAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  return (
    <header className="header">
      <div className="header-title">
        <img src={logo} alt="Galeriloop Logo" className="logo-image" onClick={() => window.location.href = "/home"} />
      </div>
      {isAuth && (
        <div className="header-content">
          <div className="pessoa-svg" onClick={() => setProfileMenuOpen(!profileMenuOpen)}>
            <IoPersonSharp />
          </div>
          {profileMenuOpen && (
            <div className="profile-menu">
              <button onClick={() => window.location.href = "/home"}>Home</button>
              <button onClick={() => window.location.href = "/settings"}>Configurações</button>
              <button onClick={handleLogout}>Sair</button>
            </div>
          )}
        </div>
      )}
      {!isAuth && (
        <nav className="header-nav">
          <button className="nav-link" style={{background:'none',border:'none',padding:0,cursor:'pointer'}} onClick={() => setContactModalOpen(true)}>Fale Conosco</button>
          <a href="/" className="nav-link">Login</a>
        </nav>
      )}
      <ContactModal isOpen={contactModalOpen} onClose={() => setContactModalOpen(false)} />
    </header>
  );
};

export default Header;