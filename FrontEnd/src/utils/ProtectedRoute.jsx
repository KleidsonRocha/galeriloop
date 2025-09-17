import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const VITE_API_URL = import.meta.env.VITE_API_URL;

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
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao verificar autenticação:', error);
    return false;
  }
};

const ProtectedRoute = ({ children }) => {
  const [isAuth, setIsAuth] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setIsAuth(authStatus);
    };

    checkAuth();
  }, []);

  if (isAuth === null) {
    // Enquanto a autenticação está sendo verificada, você pode exibir um carregamento
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div className="loading-spinner"></div>
      <p style={{ marginLeft: '10px', fontSize: '1.2rem', color: '#555' }}>Verificando autenticação...</p>
      </div>
    );
  }

  if (!isAuth) {
    alert('Você precisa estar autenticado para acessar esta página.');
    // Redireciona para a página de login
    return <Navigate to="/login" />;
  }

  // Se o usuário estiver autenticado, renderiza os componentes filhos
  return children;
};

export default ProtectedRoute;