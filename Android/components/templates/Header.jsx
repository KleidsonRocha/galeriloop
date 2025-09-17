// components/templates/Header.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router'; // Importar router do expo-router
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// Importe um ícone para pessoa, por exemplo, de 'react-native-vector-icons'
// import Icon from 'react-native-vector-icons/Ionicons'; // Exemplo

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const isAuthenticated = async () => {
  const token = await AsyncStorage.getItem('token');

  if (!token) return false;

  try {
    const profileResponse = await fetch(API_URL + `/usuarios/auth`, {
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
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const authStatus = await isAuthenticated();
      setIsAuth(authStatus);
    };

    checkAuth();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    // Navegação para a tela de login usando expo-router.replace para substituir a tela atual
    router.replace('/login'); 
  };

  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity onPress={() => router.push('/home')}> {/* Usar router.push para navegar */}
        {/* Substitua o logo.svg por uma imagem local ou um componente de imagem */}
        {/* <Image source={require('../../assets/logo.png')} style={styles.logoImage} /> */}
        <Text style={styles.logoText}>Galeriloop</Text>
      </TouchableOpacity>
      {isAuth ? (
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => setProfileMenuOpen(!profileMenuOpen)} style={styles.pessoaSvg}>
            {/* <Icon name="person" size={24} color="white" /> */}
            <Text style={styles.iconPlaceholder}>Pessoa</Text>
          </TouchableOpacity>
          {profileMenuOpen && (
            <View style={styles.profileMenu}>
              <TouchableOpacity onPress={() => { setProfileMenuOpen(false); router.push('/home'); }} style={styles.menuButton}><Text style={styles.menuButtonText}>Home</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setProfileMenuOpen(false); router.push('/settings'); }} style={styles.menuButton}><Text style={styles.menuButtonText}>Configurações</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setProfileMenuOpen(false); handleLogout(); }} style={styles.menuButton}><Text style={styles.menuButtonText}>Sair</Text></TouchableOpacity>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.headerNav}>
          <TouchableOpacity onPress={() => router.push('/about')} style={styles.navLink}><Text style={styles.navLinkText}>Fale Conosco</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/login')} style={styles.navLink}><Text style={styles.navLinkText}>Login</Text></TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: '#1e3653',
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    zIndex: 999, // Garante que o header fique sobre outros elementos
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: 40,
    height: 40,
    marginRight: 10,
  },
  logoText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  pessoaSvg: {
    padding: 5,
  },
  iconPlaceholder: {
    color: 'white',
    fontSize: 16,
  },
  profileMenu: {
    position: 'absolute',
    top: 45, // Ajuste para não sobrepor o ícone
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 5, // Sombra para Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000, // zIndex mais alto para o menu aparecer sobre o header
  },
  menuButton: {
    padding: 12,
    width: 150, // Largura fixa para melhor aparência
  },
  menuButtonText: {
    color: '#333',
    fontSize: 16,
  },
  headerNav: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  navLink: {
    marginLeft: 15,
  },
  navLinkText: {
    color: 'white',
    fontSize: 16,
  },
});

export default Header;
