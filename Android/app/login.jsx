import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Keyboard, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

const LogoImage = require('../assets/logo.png');

import Modal from '../components/templates/Modal'; // Verifique se o caminho está correto

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const handleSubmit = async () => {
    setErrorMessage('');

    // Adicione a validação aqui, já que 'required' foi removido
    if (!email || !password) {
      setErrorMessage('Por favor, preencha todos os campos.');
      return;
    }

    try {
      const loginResponse = await fetch(API_URL + `/usuarios/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha: password }),
      });

      if (!loginResponse.ok) {
        const errorData = await loginResponse.json();
        throw new Error(errorData.message || 'Erro ao fazer login');
      }

      const loginData = await loginResponse.json();
      const token = loginData.token;
      await AsyncStorage.setItem('token', token);

      router.push('./home'); // Navega para a rota /home com Expo Router
    } catch (error) {
      setErrorMessage(error.message);
      Alert.alert('Erro de Login', error.message);
    }
  };

  const handleForgotPassword = () => {
    setIsModalOpen(true);
  };

  const handleSendEmail = async (recoveryEmail) => {
    try {
      await fetch(API_URL + '/usuarios/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      setIsModalOpen(false);
      setIsConfirmationOpen(true);
    } catch (err) {
      setIsModalOpen(false); // Mantém este estado para exibir o modal de confirmação
      setIsConfirmationOpen(true);
      console.error('Erro ao enviar email de recuperação:', err);
    }
  };

  return (
    <KeyboardAwareScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
      enableOnAndroid={true}
      extraScrollHeight={Platform.OS === 'ios' ? 150 : 0}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.loginContainer, keyboardVisible && styles.loginContainerKeyboard]}>
        <View style={[styles.loginLeft, keyboardVisible && styles.loginLeftKeyboard]}>
          <View style={styles.logo}>
            <Image source={LogoImage} style={styles.logoImage} />
            <Text style={styles.logoTitle}>G A L E R I L O O P</Text>
          </View>
        </View>
        {/*
        
        */}
        <View style={[styles.loginRight, keyboardVisible && styles.loginRightKeyboard]}>
          <Text style={styles.welcomeText}>Bem Vindo de Volta!</Text>
          <View style={styles.loginForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Email:</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.loginInput}
                  placeholder="Digite seu email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
                <MaterialIcons name="person" size={24} color="#1e3653" style={styles.inputIcon} />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Senha:</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.loginInput}
                  placeholder="Digite sua senha"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.togglePassword}
                >
                  {showPassword ? <Ionicons name="eye-off" size={24} color="#1e3653" /> : <Ionicons name="eye" size={24} color="#1e3653" />}
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={handleForgotPassword} style={styles.forgotPassword}>
              <Text style={styles.forgotPasswordText}>Esqueceu sua senha?</Text>
            </TouchableOpacity>
            {errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}
            <TouchableOpacity onPress={handleSubmit} style={styles.loginButton}>
              <Text style={styles.loginButtonText}>Entrar</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.footerText}>
            Gostou da ideia?{' '}
            <Text
              style={styles.contactLink}
              onPress={() => router.push('/about')}
            >
              Fale conosco
            </Text>
          </Text>
        </View>

        {/* Primeiro Modal */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <Text style={styles.forgotModalTitle}>Esqueceu a senha?</Text>
          <RecoveryEmailForm onSend={handleSendEmail} />
        </Modal>

        {/* Segundo Modal */}
        <Modal
          isOpen={isConfirmationOpen}
          onClose={() => setIsConfirmationOpen(false)}
        >
          <Text style={styles.confirmationMessage}>
            Caso o email esteja cadastrado, será enviado instruções de como
            resetar a senha.
          </Text>
        </Modal>
      </View>
    </KeyboardAwareScrollView>
  );
};

/**
 * @param {{ onSend: (email: string) => void }} props
 */
const RecoveryEmailForm = ({ onSend }) => {
  const [recoveryEmail, setRecoveryEmail] = useState('');

  return (
    <View style={styles.modalForm}>
      <TextInput
        style={styles.forgotModalInput}
        placeholder="Digite o email atrelado à conta"
        keyboardType="email-address"
        autoCapitalize="none"
        value={recoveryEmail}
        onChangeText={setRecoveryEmail}
      />
      <TouchableOpacity
        style={styles.forgotModalButton}
        onPress={() => onSend(recoveryEmail)}
      >
        <Text style={styles.forgotModalButtonText}>Enviar</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e3e2de',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  loginContainer: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: '#e3e2de',
    minHeight: '100%',
  },
  loginContainerKeyboard: {
    minHeight: 'auto',
  },
  loginLeft: {
    flex: 1.25,
    backgroundColor: '#e3e2de',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loginLeftKeyboard: {
    flex: 0.5,
    paddingVertical: 10,
  },
  logo: {
    alignItems: 'center',
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: 10,
  },
  logoTitle: {
    fontSize: 30,
    color: '#1e3653',
    letterSpacing: 2,
    fontWeight: '800',
    marginTop: 10,
  },
  loginRight: {
    flex: 0.75,
    backgroundColor: '#1e3653',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 100,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },
  loginRightKeyboard: {
    flex: 1,
    paddingBottom: 20,
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  welcomeText: {
    fontSize: 28,
    marginTop: 0,
    marginBottom: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  loginForm: {
    width: '100%',
    maxWidth: 400,
    flexDirection: 'column',
    gap: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputGroup: {
    flexDirection: 'column',
    width: '100%',
  },
  inputLabel: {
    marginBottom: 5,
    fontSize: 16,
    color: 'white',
  },
  inputWrapper: {
    position: 'relative',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    borderWidth: 0,
    borderRadius: 7,
    backgroundColor: '#e3e2de',
    color: '#333',
    fontSize: 16,
  },
  inputIcon: {
    position: 'absolute',
    right: 15,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginTop: -10,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#e3e2de',
    textDecorationLine: 'underline',
  },
  errorMessage: {
    color: 'red',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
  },
  loginButton: {
    backgroundColor: '#e3e2de',
    paddingVertical: 15,
    borderRadius: 10,
    width: '80%',
    alignSelf: 'center',
    marginTop: 10,
  },
  loginButtonText: {
    color: '#1e3653',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  footerText: {
    marginTop: 20,
    marginBottom: 30, // Adicionado marginBottom para criar mais espaço na parte inferior
    fontSize: 14,
    color: 'white',
  },
  contactLink: {
    color: '#e3e2de',
    textDecorationLine: 'underline',
  },
  togglePassword: {
    position: 'absolute',
    right: 15,
    padding: 5,
  },
  forgotModalTitle: {
    color: '#1e3653',
    fontSize: 24,
    marginBottom: 20,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  modalForm: {
    width: '100%',
    alignItems: 'center',
  },
  forgotModalInput: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 40,
    backgroundColor: '#fff',
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  forgotModalButton: {
    width: '70%',
    paddingVertical: 15,
    borderRadius: 30,
    backgroundColor: '#1e3653',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  forgotModalButtonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
    width:100,
  },
  confirmationMessage: {
    marginTop: 20,
    color: '#1e3653',
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 10,
  },
});

export default Login;

