import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import Footer from '../components/templates/Footer';
import Header from '../components/templates/Header';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [senhaAtual, setSenhaAtual] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState('');
  const [tamanhoFotos, setTamanhoFotos] = useState({});
  const [analises, setAnalises] = useState(null);
  const [isLoadingAnalises, setIsLoadingAnalises] = useState(true);

  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  useEffect(() => {
    const fetchAnalises = async () => {
      setIsLoadingAnalises(true);
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/album/analises`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setAnalises(data);
        } else {
          setAnalises(null);
        }
      } catch (err) {
        setAnalises(null);
      } finally {
        setIsLoadingAnalises(false);
      }
    };
    fetchAnalises();
  }, []);

  const handleTamanhoFotosChange = (tamanho) => {
    setTamanhoFotos((prev) => ({
      ...prev,
      [tamanho]: !prev[tamanho],
    }));
  };

  const validarFormulario = () => {
    if (!email) {
      Alert.alert('Erro', 'Email é obrigatório');
      return false;
    }
    if (!email.includes('@')) {
      Alert.alert('Erro', 'Email inválido');
      return false;
    }
    if (novaSenha !== confirmarNovaSenha) {
      Alert.alert('Erro', 'As senhas não coincidem');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    if (!validarFormulario()) {
      setIsLoading(false);
      return;
    }
    const dadosParaEnviar = {
      email: email,
      senhaAtual: senhaAtual,
      novaSenha: novaSenha,
      tamanhoFotos: tamanhoFotos,
    };
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/usuarios/updateUsuario`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(dadosParaEnviar),
      });

      if (response.ok) {
        Alert.alert('Sucesso', 'Configurações salvas com sucesso');
        setEmail('');
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarNovaSenha('');
      } else {
        Alert.alert('Erro', 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro ', error);
      Alert.alert('Erro', 'Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const renderAnalysisCard = (title, data, type) => {
    if (!data || data.length === 0) {
      return (
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.noDataText}>Nenhum dado disponível</Text>
        </View>
      );
    }

    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{title}</Text>
        <ScrollView style={styles.dataContainer}>
          {data.map((item, index) => (
            <View key={index} style={styles.dataItem}>
              <Text style={styles.dataLabel}>
                {type === 'expiracao' ? item.data : 
                 type === 'tipoAlvo' ? item.tipo_alvo :
                 type === 'topAlvos' ? item.alvo_id : 'Item'}
              </Text>
              <Text style={styles.dataValue}>
                {type === 'expiracao' ? `${item.quantidade} links` :
                 type === 'tipoAlvo' ? `${item.quantidade}` :
                 type === 'topAlvos' ? `${item.quantidade} links` : item.quantidade}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderCheckbox = (id, label, checked) => (
    <TouchableOpacity
      key={id}
      style={styles.checkboxContainer}
      onPress={() => handleTamanhoFotosChange(id)}
    >
      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
        {checked && <MaterialIcons name="check" size={16} color="white" />}
      </View>
      <Text style={styles.checkboxLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={[styles.mainLayout, isMobile && styles.mainLayoutMobile]}>
          {/* Container Left - Analytics */}
          <View style={[styles.containerLeft, isMobile && styles.containerLeftMobile]}>
            <View style={styles.containerLeftHeader}>
              <MaterialIcons name="data-usage" size={32} color="#1e3653" />
              <Text style={styles.containerLeftTitle}>Gerenciador de Links</Text>
            </View>
            
            <View style={styles.chartContainer}>
              {isLoadingAnalises ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#1e3653" />
                  <Text style={styles.loadingText}>Carregando análises...</Text>
                </View>
              ) : analises ? (
                <>
                  {renderAnalysisCard(
                    'Links por Tipo de Alvo',
                    analises.porTipoAlvo,
                    'tipoAlvo'
                  )}
                  {renderAnalysisCard(
                    'Expiração dos Links',
                    analises.porExpiracao,
                    'expiracao'
                  )}

                </>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Erro ao carregar análises.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Container Right - Settings Form */}
          <View style={[styles.containerRight, isMobile && styles.containerRightMobile]}>
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email Cadastrado:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Digite seu email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.passwordSection}>
              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Senha Atual:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Digite sua senha atual"
                  value={senhaAtual}
                  onChangeText={setSenhaAtual}
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Nova Senha:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Digite sua nova senha"
                  value={novaSenha}
                  onChangeText={setNovaSenha}
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formLabel}>Confirmar Nova Senha:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Confirme sua nova senha"
                  value={confirmarNovaSenha}
                  onChangeText={setConfirmarNovaSenha}
                  secureTextEntry
                  placeholderTextColor="#999"
                />
              </View>
            </View>

            <View style={styles.photoSizeSection}>
              <Text style={styles.photoSizeTitle}>Selecione os tamanhos das fotos</Text>
              <View style={styles.checkboxGrid}>
                {renderCheckbox('A4', 'A4', !!tamanhoFotos.A4)}
                {renderCheckbox('CartaoPostal', 'Cartão Postal', !!tamanhoFotos.CartaoPostal)}
                {renderCheckbox('A3', 'A3', !!tamanhoFotos.A3)}
                {renderCheckbox('Quadro', 'Quadro', !!tamanhoFotos.Quadro)}
                {renderCheckbox('Poster', 'Poster', !!tamanhoFotos.Poster)}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <Footer />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    gap: 20,
  },
  mainLayoutMobile: {
    flexDirection: 'column',
    padding: 15,
    gap: 15,
  },
  
  // Container Left (Analytics)
  containerLeft: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  containerLeftMobile: {
    marginBottom: 20,
  },
  containerLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  containerLeftTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3653',
    marginLeft: 12,
  },
  chartContainer: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e3653',
    marginBottom: 12,
  },
  dataContainer: {
    maxHeight: 200,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dataLabel: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e3653',
  },
  noDataText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6c757d',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#dc3545',
    textAlign: 'center',
  },

  // Container Right (Form)
  containerRight: {
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  containerRightMobile: {
    // Estilos específicos para mobile se necessário
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3653',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#495057',
  },
  passwordSection: {
    marginBottom: 50,
  },
  photoSizeSection: {
    marginBottom: 30,
  },
  photoSizeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3653',
    marginBottom: 16,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    minWidth: '45%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ced4da',
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  checkboxChecked: {
    backgroundColor: '#1e3653',
    borderColor: '#1e3653',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#495057',
  },
  saveButton: {
    backgroundColor: '#1e3653',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 200,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {

    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Settings;

