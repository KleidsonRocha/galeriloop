import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
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

// Certifique-se de que esta variável de ambiente está configurada no seu ambiente Expo/React Native
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

  // Estados para as configurações do PIX
  const [pixChave, setPixChave] = useState('');
  const [pixNome, setPixNome] = useState('');
  const [pixCidade, setPixCidade] = useState('');
  const [pixMsg, setPixMsg] = useState('');

  const { width } = Dimensions.get('window');
  const isMobile = width < 768; // Definição de mobile para layout adaptativo

  useEffect(() => {
    // Função para buscar as análises
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
          console.error("Erro ao carregar análises: ", response.status, response.statusText);
        }
      } catch (err) {
        setAnalises(null);
        console.error("Erro na requisição de análises: ", err);
      } finally {
        setIsLoadingAnalises(false);
      }
    };

    // Função para buscar as configurações PIX
    const fetchPix = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_URL}/usuarios/pix-config`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const { chave_pix, nome_empresa, cidade } = await response.json();
          setPixChave(chave_pix || "");
          setPixNome(nome_empresa || "");
          setPixCidade(cidade || "");
        } else {
          console.error("Erro ao carregar configurações Pix: ", response.status, response.statusText);
        }
      } catch (error) {
        console.error("Erro na requisição de configurações Pix: ", error);
      }
    };

    fetchAnalises();
    fetchPix();
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
    if (novaSenha && novaSenha !== confirmarNovaSenha) {
      Alert.alert('Erro', 'As novas senhas não coincidem');
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
      ...(senhaAtual && { senhaAtual: senhaAtual }),
      ...(novaSenha && { novaSenha: novaSenha }),
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
        setSenhaAtual('');
        setNovaSenha('');
        setConfirmarNovaSenha('');
        setEmail('');
      } else {
        const errorData = await response.json();
        Alert.alert('Erro', errorData.message || 'Erro ao salvar configurações');
      }
    } catch (error) {
      console.error('Erro na requisição de atualização do usuário: ', error);
      Alert.alert('Erro', 'Erro ao conectar com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePixSubmit = async () => {
    setPixMsg('');
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/usuarios/pix-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          chave_pix: pixChave,
          nome_empresa: pixNome,
          cidade: pixCidade
        })
      });
      const data = await response.json();
      setPixMsg(data.message || "Erro ao atualizar Pix");
      if (response.ok) {
        Alert.alert('Sucesso', data.message || 'Configurações Pix salvas com sucesso');
      } else {
        Alert.alert('Erro', data.message || 'Erro ao salvar configurações Pix');
      }
    } catch (error) {
      console.error("Erro na requisição de atualização Pix: ", error);
      setPixMsg("Erro ao conectar com o servidor");
      Alert.alert('Erro', 'Erro ao conectar com o servidor');
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
          {/* Container Esquerdo - Análises */}
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
                  {renderAnalysisCard(
                    'Top 10 Alvos mais Compartilhados',
                    analises.topAlvos,
                    'topAlvos'
                  )}
                </>
              ) : (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Erro ao carregar análises.</Text>
                  <Text style={styles.errorText}>Verifique sua conexão ou tente novamente mais tarde.</Text>
                </View>
              )}
            </View>
          </View>

          {/* Container Direito - Formulários de Configuração */}
          <View style={[styles.containerRight, isMobile && styles.containerRightMobile]}>
            {/* Formulário de Email e Senha */}
            <View style={styles.formSection}>
              <Text style={styles.formLabel}>Email Cadastrado:</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Digite seu email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#adb5bd" // Cor mais suave para placeholder
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
                  placeholderTextColor="#adb5bd"
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
                  placeholderTextColor="#adb5bd"
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
                  placeholderTextColor="#adb5bd"
                />
              </View>
            </View>

            {/* Seção de Tamanhos de Fotos */}
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
              activeOpacity={0.7} // Feedback visual ao tocar
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Text style={styles.saveButtonText}>Salvar Configurações</Text>
              )}
            </TouchableOpacity>

            {/* Bloco de Configurações PIX */}
            <View style={styles.pixConfigBox}>
              <Text style={styles.pixTitle}>Dados do Pix</Text>
              <View>
                <View style={styles.formSection}>
                  <Text style={styles.pixLabel}>Chave Pix:</Text>
                  <TextInput
                    style={styles.pixInput} // Estilo específico para input PIX
                    value={pixChave}
                    onChangeText={setPixChave}
                    required
                    placeholder="Sua chave Pix"
                    placeholderTextColor="#ced4da" // Placeholder mais claro
                  />
                </View>
                <View style={styles.formSection}>
                  <Text style={styles.pixLabel}>Nome do recebedor:</Text>
                  <TextInput
                    style={styles.pixInput} // Estilo específico para input PIX
                    value={pixNome}
                    onChangeText={setPixNome}
                    required
                    placeholder="Nome da empresa/recebedor"
                    placeholderTextColor="#ced4da"
                  />
                </View>
                <View style={styles.formSection}>
                  <Text style={styles.pixLabel}>Cidade:</Text>
                  <TextInput
                    style={styles.pixInput} // Estilo específico para input PIX
                    value={pixCidade}
                    onChangeText={setPixCidade}
                    required
                    placeholder="Cidade do recebedor"
                    placeholderTextColor="#ced4da"
                  />
                </View>
                <TouchableOpacity
                  onPress={handlePixSubmit}
                  style={styles.pixSaveButton}
                  activeOpacity={0.7} // Feedback visual ao tocar
                >
                  <Text style={styles.pixSaveButtonText}>Salvar Dados Pix</Text>
                </TouchableOpacity>
                {pixMsg && (
                  <View style={styles.pixMessageContainer}>
                    <Text style={[
                        styles.pixMessageText,
                        pixMsg.includes("sucesso") ? styles.pixMessageSuccess : styles.pixMessageError
                    ]}>
                        {pixMsg}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
      <Footer />
    </View>
  );
};

// Define shared styles outside StyleSheet.create
const sharedCardBase = {
  backgroundColor: 'white',
  borderRadius: 12, // Bordas mais arredondadas
  padding: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 }, // Sombra mais proeminente e suave
  shadowOpacity: 0.1,
  shadowRadius: 10,
  elevation: 6, // Elevação para Android
};

const styles = StyleSheet.create({
  // Global & Layout
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Fundo mais claro e suave
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
    padding: 20,
    gap: 20, // Espaçamento entre os containers
  },
  mainLayoutMobile: {
    flexDirection: 'column',
    padding: 15,
    gap: 15,
  },

  // Container Esquerdo (Análises)
  containerLeft: {
    flex: 1,
    ...sharedCardBase, // Usa o objeto sharedCardBase
  },
  containerLeftMobile: {
    marginBottom: 20,
  },
  containerLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24, // Mais espaço
    borderBottomWidth: 1,
    borderBottomColor: '#F0F2F5', // Linha separadora suave
    paddingBottom: 16,
  },
  containerLeftTitle: {
    fontSize: 22, // Tamanho ajustado
    fontWeight: '700', // Mais negrito
    color: '#1e3653',
    marginLeft: 12,
  },
  chartContainer: {
    flex: 1,
  },
  chartCard: {
    backgroundColor: '#F8F9FA', // Fundo levemente diferente para os cards internos
    borderRadius: 8, // Bordas mais arredondadas
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF', // Borda mais clara
  },
  chartTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#343A40', // Cor de texto mais escura para melhor contraste
    marginBottom: 12,
  },
  dataContainer: {
    maxHeight: 200,
  },
  dataItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10, // Mais padding
    borderBottomWidth: 1,
    borderBottomColor: '#DEE2E6', // Borda mais suave
  },
  dataLabel: {
    fontSize: 14,
    color: '#495057',
    flex: 1,
  },
  dataValue: {
    fontSize: 14,
    fontWeight: '700', // Mais negrito
    color: '#1e3653',
  },
  noDataText: {
    fontSize: 14,
    color: '#6C757D', // Cor de texto mais neutra
    textAlign: 'center',
    fontStyle: 'italic',
    paddingVertical: 20,
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
    color: '#6C757D',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545', // Vermelho padrão para erros
    textAlign: 'center',
  },

  // Container Direito (Formulários)
  containerRight: {
    flex: 1,
    ...sharedCardBase, // Usa o objeto sharedCardBase
  },
  formSection: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 8,
  },
  formInput: {
    borderWidth: 1,
    borderColor: '#DEE2E6', // Borda mais clara
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
    color: '#495057',
  },
  passwordSection: {
    marginBottom: 30, // Reduzi um pouco o espaçamento
  },
  photoSizeSection: {
    marginBottom: 30,
    marginTop: 10, // Adicionado um pouco de margem superior
  },
  photoSizeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#343A40',
    marginBottom: 16,
  },
  checkboxGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16, // Espaçamento entre os checkboxes
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    // marginBottom: 12, // Removido pois 'gap' já lida com isso
    minWidth: '45%',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#ADB5BD', // Borda mais clara
    borderRadius: 5, // Levemente arredondado
    marginRight: 10, // Mais espaço
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
    paddingVertical: 15, // Leve ajuste no padding
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, // Sombra um pouco mais forte para botões
    shadowRadius: 5,
    elevation: 4,
    marginBottom: 32,
  },
  saveButtonDisabled: {
    backgroundColor: '#A0AEC0', // Cor mais clara para desabilitado
    shadowOpacity: 0, // Sem sombra quando desabilitado
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 17, // Tamanho ligeiramente menor
    fontWeight: 'bold',
  },

  // PIX Config Box Styles
  pixConfigBox: {
    borderWidth: 0, // Removido borda
    padding: 25, // Mais padding
    marginTop: 32,
    borderRadius: 12, // Bordas arredondadas
    backgroundColor: '#34495E', // Cor de fundo mais escura e moderna para o bloco PIX
    marginBottom: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  pixTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF', // Cor do título branca
    marginBottom: 18, // Mais espaço
    borderBottomWidth: 1,
    borderBottomColor: '#4A6074', // Linha separadora mais clara
    paddingBottom: 12,
  },
  pixLabel: {
    marginBottom: 6,
    color: '#E0E0E0', // Cor do label mais clara
    fontSize: 14,
    fontWeight: '500',
  },
  pixInput: { // Estilo específico para inputs dentro da caixa PIX
    borderWidth: 1,
    borderColor: '#6C7A89', // Borda mais clara
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#2C3E50', // Fundo do input mais escuro
    color: '#FFFFFF', // Texto do input branco
  },
  pixSaveButton: {
    backgroundColor: '#1ABC9C', // Um verde/ciano vibrante para o botão PIX, destacando-o
    borderRadius: 8,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  pixSaveButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: 'bold',
  },
  pixMessageContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  pixMessageText: {
    fontWeight: '600',
    fontSize: 14,
    textAlign: 'center',
  },
  pixMessageSuccess: {
    color: '#2ECC71', // Verde mais vivo para sucesso
  },
  pixMessageError: {
    color: '#E74C3C', // Vermelho mais vivo para erro
  },
});

export default Settings;