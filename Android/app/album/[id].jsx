import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Dimensions
} from 'react-native';

import Footer from '../../components/templates/Footer';
import Header from '../../components/templates/Header';
import Modal from '../../components/templates/Modal'; // Assumindo que este Modal é um wrapper simples

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const COLORS = {
  primary: '#1E3653',
  secondary: '#2A4B7C',
  accent: '#FFD700',
  background: '#F0F2F5',
  cardBackground: '#FFFFFF',
  textPrimary: '#333333',
  textSecondary: '#6C757D',
  danger: '#D82B00',
  success: '#28A745',
  warning: '#FFC107',
  info: '#17A2B8',
  border: '#CED4DA',
  lightGray: '#E9ECEF',
  darkGray: '#495057',
};

const SPACING = {
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
};

const BORDER_RADIUS = {
  small: 4,
  medium: 8,
  large: 12,
  extraLarge: 20,
};

const SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 1.00,
    elevation: 1,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.23,
    shadowRadius: 2.62,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 4.65,
    elevation: 8,
  },
};

const getImageUrl = (image) => {
  if (!image || !image.dados) {
    return 'https://via.placeholder.com/300x200?text=Imagem+Indispon%C3%ADvel';
  }


  if (typeof image.dados === 'string') {
    if (image.dados.startsWith('data:') || image.dados.startsWith('http')) {
      return image.dados;
    }

    return `data:${image.tipo_mime || 'image/jpeg'};base64,${image.dados}`;
  }


  if (typeof image.dados === 'object' && image.dados.type === 'Buffer' && Array.isArray(image.dados.data)) {
    try {

      const base64String = btoa(String.fromCharCode(...image.dados.data));
      return `data:${image.tipo_mime || 'image/jpeg'};base64,${base64String}`;
    } catch (e) {
      console.error('Erro ao converter Buffer para base64 em React Native:', e);
      return 'https://via.placeholder.com/300x200?text=Erro+de+Processamento';
    }
  }

  // Para dados que são apenas um array de bytes (comum em alguns retornos)
  if (Array.isArray(image.dados)) {
    try {
      // Mesma observação sobre btoa aqui
      const base64String = btoa(String.fromCharCode(...image.dados));
      return `data:${image.tipo_mime || 'image/jpeg'};base64,${base64String}`;
    } catch (e) {
      console.error('Erro ao converter array de bytes para base64 em React Native:', e);
      return 'https://via.placeholder.com/300x200?text=Erro+de+Processamento';
    }
  }

  console.warn(
    'Formato de dados de imagem inesperado. Esperava string base64, Buffer JSON ou array de bytes:',
    typeof image.dados,
    image.dados
  );
  return 'https://via.placeholder.com/300x200?text=Erro+de+Processamento';
};


const UnavailableImageCard = ({ image }) => (
  <View style={styles.imageCardUnavailable}>
    <View style={styles.placeholderImage}>
      <Text style={styles.unavailableIcon}>⚠️</Text>
      <Text style={styles.unavailableText}>Imagem temporariamente indisponível</Text>
    </View>
    <View style={styles.imageInfo}>
      <Text style={styles.imageName}>{image.nome || 'Sem nome'}</Text>
      {image.fisica && image.digital ? (
        <Text style={styles.imageBadge}>Física e Digital</Text>
      ) : image.fisica ? (
        <Text style={[styles.imageBadge, styles.imageBadgePhysical]}>Física</Text>
      ) : image.digital ? (
        <Text style={[styles.imageBadge, styles.imageBadgeDigital]}>Digital</Text>
      ) : null}
    </View>
  </View>
);

const StatusIndicator = ({ isRefreshing }) => {
  return (
    <View style={styles.statusIndicator}>
      <View style={[styles.statusDot, isRefreshing ? styles.statusDotRefreshing : styles.statusDotIdle]}></View>
      <Text style={styles.statusText}>
        {isRefreshing ? 'Atualizando...' : `Atualizado`}
      </Text>
    </View>
  );
};

const MultiSelectSubalbums = ({ options, selectedValues, onSelectionChange, disabled = false }) => {
  const toggleSelection = (value) => {
    if (disabled) return;

    const isSelected = selectedValues.includes(value);
    let newSelection;

    if (isSelected) {
      newSelection = selectedValues.filter(v => v !== value);
    } else {
      newSelection = [...selectedValues, value];
    }

    onSelectionChange(newSelection);
  };

  return (
    <View style={styles.multiSelectContainer}>
      <ScrollView style={styles.multiSelectScrollView} showsVerticalScrollIndicator={false}>
        {options.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.multiSelectItem,
                isSelected && styles.multiSelectItemSelected,
                disabled && styles.multiSelectItemDisabled
              ]}
              onPress={() => toggleSelection(option.value)}
              disabled={disabled}
            >
              <View style={[styles.multiSelectCheckbox, isSelected && styles.multiSelectCheckboxSelected]}>
                {isSelected && <MaterialIcons name="check" size={16} color="white" />}
              </View>
              <Text style={[
                styles.multiSelectLabel,
                isSelected && styles.multiSelectLabelSelected,
                disabled && styles.multiSelectLabelDisabled
              ]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
      {options.length === 0 && (
        <Text style={styles.multiSelectEmptyText}>Nenhum subálbum disponível</Text>
      )}
    </View>
  );
};

const AlbumDetails = () => {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState(null);
  const [album, setAlbum] = useState(null);
  const [subalbuns, setSubalbuns] = useState([]);
  const [subgroupName, setSubgroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [modalAlbum, setModalAlbum] = useState(false);
  const [modalSubAlbum, setModalSubAlbum] = useState(false);
  const [selectedSubalbuns, setSelectedSubalbuns] = useState([]);
  const [image, setImage] = useState(null);
  const [isFisica, setIsFisica] = useState(false);
  const [isDigital, setIsDigital] = useState(true);
  const inputRef = useRef(null);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const imageCache = useRef(new Map());
  const [precoDigital, setPrecoDigital] = useState(null);
  const [precoFisica, setPrecoFisica] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [editPrecoDigital, setEditPrecoDigital] = useState(null);
  const [editPrecoFisica, setEditPrecoFisica] = useState(null);
  const [editIsFisica, setEditIsFisica] = useState(false);
  const [editIsDigital, setEditIsDigital] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [albumLink, setAlbumLink] = useState(null);
  const [subalbumLinks, setSubalbumLinks] = useState([]);
  const [linksCopied, setLinksCopied] = useState({});
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [selectedImageSubalbuns, setSelectedImageSubalbuns] = useState([]);
  const [allSubalbumOptions, setAllSubalbumOptions] = useState([]);
  const [deleteAlbumConfirmation, setDeleteAlbumConfirmation] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Estados para paginação ---
  const [currentPage, setCurrentPage] = useState(1);
  const [totalImagesCount, setTotalImagesCount] = useState(0); // Total de imagens no álbum
  const IMAGES_PER_PAGE = 10; // Quantidade de imagens por página
  // --- Fim dos estados de paginação ---

  const subalbumOptions = subalbuns.map(subalbum => ({
    value: subalbum.id,
    label: subalbum.nome,
  }));

  // Renomeada e ajustada para a nova lógica de paginação
  const fetchImages = async (pageToLoad) => {
    try {
      setError(null);
      setLoading(true);

      const token = await AsyncStorage.getItem('token');
      // Adiciona os parâmetros de paginação (page e limit) à URL
      const response = await fetch(`${API_URL}/fotos/getAlbumsPhotos?albumId=${id}&page=${pageToLoad}&limit=${IMAGES_PER_PAGE}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        if (response.status === 404) { // Álbum vazio ou não existe
          setImages([]);
          setTotalImagesCount(0);
          return;
        }
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      const responseData = await response.json();
      console.log('Resposta do backend (com paginação):', responseData);

      const fetchedImages = responseData.images || [];
      const totalAvailableImages = responseData.totalImages || 0;

      setImages(fetchedImages); // Sempre substitui as imagens
      setTotalImagesCount(totalAvailableImages); // Atualiza o total de imagens

      // Verifica se o formato da resposta mudou (devido ao Circuit Breaker fallback)
      if (responseData.message && responseData.images) {
        console.log('Modo de contingência ativado:', responseData.message);
        setMessage({ text: responseData.message, type: 'warning' });
      }

    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      setError('Não foi possível carregar as imagens. Tente novamente mais tarde.');
      setMessage({ text: 'Erro ao carregar imagens', type: 'error' });
      setImages([]);
      setTotalImagesCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Ajustada para resetar a página e recarregar
  const refreshImages = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      setMessage({ text: 'Atualizando imagens...', type: 'info' });

      // Se a página atual não for 1, definimos para 1. O useEffect fará a chamada.
      // Se já for 1, chamamos fetchImages(1) diretamente para garantir o refresh.
      if (currentPage !== 1) {
        setCurrentPage(1); // Isso vai disparar o useEffect para buscar a página 1
      } else {
        await fetchImages(1); // Se já está na página 1, força o recarregamento
      }

      setMessage({ text: 'Imagens atualizadas com sucesso!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setError('Falha ao atualizar as imagens. Tente novamente.');
      setMessage({ text: 'Erro ao atualizar imagens', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Único useEffect para carregar detalhes e imagens. Dispara quando 'id' ou 'currentPage' muda.
  useEffect(() => {
    fetchAlbumDetails();
    fetchImages(currentPage); // Busca as imagens para a página atual
  }, [id, currentPage]); // Dependências: id do álbum e página atual


  useEffect(() => {
    if (subalbuns.length > 0) {
      // setSelectedSubalbuns(subalbuns.map(s => s.id)); // Removido, pois é para adicionar imagem
      const options = subalbuns.map(subalbum => ({
        value: subalbum.id,
        label: subalbum.nome
      }));
      setAllSubalbumOptions(options);
    }
  }, [subalbuns]);

  useEffect(() => {
    return () => {
      // Limpeza de cache de imagens - adaptado para React Native
      // Em React Native, URLs de blob criadas com createObjectURL não são usadas
      // O cache de imagem aqui se refere a um Map in-memory, então limpar faz sentido.
      imageCache.current.clear();
    };
  }, [images]);

  const fetchAlbumDetails = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/album/getAlbum/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar detalhes do álbum');
      }

      const data = await response.json();
      setAlbum(data.album);
      console.log(data.album);

      setSubalbuns(data.subalbuns);
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao carregar detalhes do álbum', type: 'error' });
    }
  };

  const handleDeleteAlbum = async () => {
    if (isDeletingAlbum) return;

    try {
      setIsDeletingAlbum(true);
      setMessage({ text: 'Excluindo álbum...', type: 'info' });

      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/album/deleteAlbum/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir o álbum');
      }

      setMessage({ text: 'Álbum excluído com sucesso!', type: 'success' });

      setTimeout(() => {
        router.push('/home');
      }, 1500);

    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao excluir o álbum', type: 'error' });
    } finally {
      setIsDeletingAlbum(false);
      setDeleteAlbumConfirmation(false);
    }
  };

  const handleSubmitSubalbum = async () => {
    if (!subgroupName.trim()) {
      setMessage({ text: 'Por favor, insira pelo menos um nome de subálbum', type: 'error' });
      return;
    }

    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/album/createSubAlbum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumId: id,
          subgroupName: subgroupName
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao criar subálbuns');
      }

      const data = await response.json();
      setMessage({ text: data.message || 'Subálbuns criados com sucesso!', type: 'success' });
      setSubgroupName('');
      fetchAlbumDetails();
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao criar subálbuns', type: 'error' });
    } finally {
      setIsLoading(false);
      setModalSubAlbum(false);
    }
  };

  const handleImageUpload = async () => {
    if (!image) {
      setMessage({ text: 'Por favor, selecione uma imagem', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage({ text: '', type: '' });

    const formData = new FormData();
    formData.append('image', {
      uri: image.uri,
      name: image.fileName || 'image.jpg',
      type: image.type || 'image/jpeg',
    });
    formData.append('albumId', id);
    formData.append('subalbumIds', JSON.stringify(selectedSubalbuns));
    formData.append('fisica', isFisica);
    formData.append('digital', isDigital);
    formData.append('precoDigital', precoDigital !== null ? precoDigital : (album?.preco_digital_padrao || 0));
    formData.append('precoFisica', precoFisica !== null ? precoFisica : (album?.preco_fisica_padrao || 0));

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/fotos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar a imagem');
      }

      const data = await response.text();
      setMessage({ text: data || 'Imagem enviada com sucesso!', type: 'success' });
      setImage(null);
      setPreviewImage(null);
      setSelectedSubalbuns([]);
      setModalAlbum(false);

      refreshImages();
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao enviar a imagem', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  // CORREÇÃO APLICADA AQUI: Função de seleção de imagem mais robusta
  const handleImageChange = async () => {
    try {
      // 1. Solicitar permissões da biblioteca de mídia
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permissão Necessária',
          'Para selecionar uma imagem, você precisa conceder permissão para acessar a galeria de fotos.'
        );
        return;
      }

      // 2. Abrir o seletor de imagens
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 1,
      });

      // 3. Lidar com o resultado
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        setImage(selectedImage); // Armazena o objeto completo da imagem
        setPreviewImage(selectedImage.uri); // Define a URI para o preview
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao tentar selecionar a imagem. Por favor, tente novamente.');
    }
  };

  const handlePreviewClick = () => {
    // Reutiliza a mesma função para manter a consistência
    handleImageChange();
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setEditPrecoDigital(image.preco_digital || album?.preco_digital_padrao || 0);
    setEditPrecoFisica(image.preco_fisica || album?.preco_fisica_padrao || 0);
    setEditIsFisica(image.fisica || false);
    setEditIsDigital(image.digital || true);

    fetchImageSubalbums(image.id);

    setEditModalOpen(true);
  };

  const handleUpdateImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setMessage({ text: 'Atualizando imagem...', type: 'info' });

    try {
      const subalbumIds = selectedImageSubalbuns.map(option => option.value);
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/fotos/updatePhoto`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          imageId: selectedImage.id,
          fisica: editIsFisica,
          digital: editIsDigital,
          precoDigital: editPrecoDigital,
          precoFisica: editPrecoFisica,
          subalbumIds: subalbumIds
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar a imagem');
      }

      setMessage({ text: 'Imagem atualizada com sucesso!', type: 'success' });
      setEditModalOpen(false);

      refreshImages();
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao atualizar a imagem', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setMessage({ text: 'Excluindo imagem...', type: 'info' });

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/fotos/delete/${selectedImage.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao excluir a imagem');
      }

      setMessage({ text: 'Imagem excluída com sucesso!', type: 'success' });
      refreshImages();
      setEditModalOpen(false);
      setDeleteConfirmation(false);
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao excluir a imagem', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFavoriteImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/fotos/favoritePhoto`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ imageId: selectedImage.id }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erro ao favoritar imagem');
      }

      Alert.alert('Sucesso', 'Imagem favoritada com sucesso!');
      refreshImages();
    } catch (error) {
      Alert.alert('Erro', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImageSubalbums = async (imageId) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/fotos/getImageSubalbums/${imageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar subálbuns da imagem');
      }

      const data = await response.json();

      const selectedSubalbumOptions = data.map(subalbumId => ({
        value: subalbumId,
        label: subalbuns.find(s => s.id === subalbumId)?.nome || `Subálbum ${subalbumId}`
      }));

      setSelectedImageSubalbuns(selectedSubalbumOptions);
    } catch (error) {
      console.error('Erro ao buscar subálbuns da imagem:', error);
      setMessage({ text: 'Erro ao buscar subálbuns da imagem', type: 'error' });
    }
  };

  const generateLinks = async () => {
    setIsGeneratingLinks(true);
    setMessage({ text: 'Processando links de acesso...', type: 'info' });

    try {
      const token = await AsyncStorage.getItem('token');
      const albumResponse = await fetch(`${API_URL}/album/generateShareLink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          albumId: id,
          isSubalbum: false
        }),
      });

      if (!albumResponse.ok) {
        throw new Error('Erro ao processar link do álbum');
      }

      const albumData = await albumResponse.json();
      setAlbumLink({
        url: albumData.shareLink,
        isNew: albumData.message.includes('Novo'),
        expiresAt: albumData.expiresAt
      });

      if (subalbuns.length > 0) {
        const subalbumLinksArray = [];

        for (const subalbum of subalbuns) {
          const subalbumResponse = await fetch(`${API_URL}/album/generateShareLink`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              albumId: subalbum.id,
              isSubalbum: true
            }),
          });

          if (!subalbumResponse.ok) {
            console.error(`Erro ao processar link para o subálbum ${subalbum.nome}`);
            continue;
          }

          const subalbumData = await subalbumResponse.json();
          subalbumLinksArray.push({
            id: subalbum.id,
            nome: subalbum.nome,
            url: subalbumData.shareLink,
            isNew: subalbumData.message.includes('Novo'),
            expiresAt: subalbumData.expiresAt
          });
        }

        setSubalbumLinks(subalbumLinksArray);
      }

      setShareLinkModalOpen(true);
      setMessage({ text: 'Links processados com sucesso!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao processar links de acesso', type: 'error' });
    } finally {
      setIsGeneratingLinks(false);
    }
  };

  const copyToClipboard = async (text, id) => {
    try {
      await Clipboard.setStringAsync(text);

      setLinksCopied(prev => ({ ...prev, [id]: true }));

      setTimeout(() => {
        setLinksCopied(prev => ({ ...prev, [id]: false }));
      }, 2000);

      Alert.alert('Sucesso', 'Link copiado para a área de transferência!');
    } catch (err) {
      console.error('Erro ao copiar texto: ', err);
      setMessage({ text: 'Erro ao copiar link', type: 'error' });
    }
  };

  const formatExpirationDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' às ' + date.toLocaleTimeString();
  };

  const filteredImages = images.filter(image =>
    image.nome && image.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calcula o número total de páginas
  const totalPages = Math.ceil(totalImagesCount / IMAGES_PER_PAGE);

  return (
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.navControler}>
          <View style={styles.navControlerSearch}>
            <TouchableOpacity style={styles.navControlerButtonSearch}>
              <AntDesign name="search1" size={20} color={COLORS.lightGray} />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Pesquisar"
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholderTextColor={COLORS.textSecondary}
            />
            <TouchableOpacity style={styles.navControlerButtonClear} onPress={() => setSearchTerm('')}>
              <Ionicons name="close" size={24} color={COLORS.lightGray} />
            </TouchableOpacity>
          </View>

          <View style={styles.navControlerButtons}>
            <TouchableOpacity onPress={() => setDeleteAlbumConfirmation(true)} style={styles.navControlerButtonDelete}>
              <Text style={styles.navControlerButtonText}>Excluir Álbum</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalAlbum(true)} style={styles.navControlerButtonAdd}>
              <Text style={styles.navControlerButtonText}>Adicionar Imagem</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalSubAlbum(true)} style={styles.navControlerButtonAdd}>
              <Text style={styles.navControlerButtonText}>Adicionar SubÁlbum</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={generateLinks}
              disabled={isGeneratingLinks}
              style={[styles.navControlerButtonShare, isGeneratingLinks && styles.navControlerButtonDisabled]}
            >
              {isGeneratingLinks ? <ActivityIndicator size="small" color={COLORS.lightGray} /> : <Text style={styles.navControlerButtonText}>Links de Acesso</Text>}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusContainer}>
          <StatusIndicator isRefreshing={isRefreshing} />
        </View>

        {message.text && (
          <View style={[styles.alert, message.type === 'success' ? styles.alertSuccess : message.type === 'warning' ? styles.alertWarning : styles.alertDanger]}>
            <Text style={styles.alertText}>{message.text}</Text>
          </View>
        )}

        <View style={styles.albumDetailsContainer}>
          {loading && images.length === 0 && totalImagesCount === 0 ? (
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Carregando imagens...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorMessage}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : images.length === 0 && !loading ? (
            <View style={styles.emptyMessage}>
              <Text style={styles.emptyMessageText}>Não há imagens neste álbum</Text>
            </View>
          ) : (
            <View style={styles.imageGrid}>
              {filteredImages.map((image, index) => {
                if (!image.dados && typeof image.dados !== 'string') {
                  return <UnavailableImageCard key={`${image.id}-${index}`} image={image} />;
                }

                return (
                  <TouchableOpacity key={`${image.id}-${index}`} style={styles.imageCard} onPress={() => handleImageClick(image)}>
                    <Image
                      source={{ uri: getImageUrl(image) }}
                      alt={image.nome || 'Imagem do álbum'}
                      style={styles.albumImage}
                      resizeMode="cover"
                      onError={(e) => {
                        console.error(`Erro ao carregar imagem ${image.id}:`, e.nativeEvent.error);
                      }}
                    />
                    <View style={styles.imageInfo}>
                      <Text style={styles.imageName}>{image.nome}</Text>
                      {image.fisica && image.digital ? (
                        <Text style={styles.imageBadge}>Física e Digital</Text>
                      ) : image.fisica ? (
                        <Text style={[styles.imageBadge, styles.imageBadgePhysical]}>Física</Text>
                      ) : image.digital ? (
                        <Text style={[styles.imageBadge, styles.imageBadgeDigital]}>Digital</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Controles de Paginação */}
          {totalImagesCount > 0 && totalPages > 1 && (
            <View style={styles.paginationControls}>
              <TouchableOpacity
                onPress={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || loading}
                style={[styles.paginationButton, (currentPage === 1 || loading) && styles.paginationButtonDisabled]}
              >
                <Text style={styles.paginationButtonText}>Anterior</Text>
              </TouchableOpacity>
              <Text style={styles.paginationPageInfo}>
                Página {currentPage} de {totalPages}
              </Text>
              <TouchableOpacity
                onPress={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || loading}
                style={[styles.paginationButton, (currentPage === totalPages || loading) && styles.paginationButtonDisabled]}
              >
                <Text style={styles.paginationButtonText}>Próxima</Text>
              </TouchableOpacity>
            </View>
          )}
          {loading && images.length > 0 && (
            <View style={styles.loadingIndicatorSmall}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingTextSmall}>Carregando imagens da página {currentPage}...</Text>
            </View>
          )}
        </View>

        {/* Modal de adicionar subalbum */}
        <Modal isOpen={modalSubAlbum} onClose={() => setModalSubAlbum(false)}>
          <View style={styles.modalSubAlbumContainer}>
            <Text style={styles.modalTitle}>Adicionar Subálbum</Text>
            <View style={styles.modalSubAlbumForm}>
              <View style={styles.modalSubAlbumField}>
                <Text style={styles.modalSubAlbumLabel}>
                  Nome do Subálbum:
                </Text>
                <TextInput
                  style={styles.modalSubAlbumInput}
                  value={subgroupName}
                  onChangeText={setSubgroupName}
                  editable={!isLoading}
                  placeholder="Nome do Subálbum"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={styles.modalSubAlbumActions}>
                <TouchableOpacity
                  style={[styles.modalSubAlbumButton, isLoading && styles.modalSubAlbumButtonDisabled]}
                  onPress={handleSubmitSubalbum}
                  disabled={isLoading}
                >
                  {isLoading ? <ActivityIndicator size="small" color={COLORS.lightGray} /> : <Text style={styles.modalSubAlbumButtonText}>Salvar Subálbum</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Modal de adicionar imagem ao álbum */}
        <Modal isOpen={modalAlbum} onClose={() => setModalAlbum(false)}>
          {/* CORREÇÃO APLICADA AQUI: O ScrollView agora está dentro de um wrapper para gerenciar altura */}
          <View style={styles.modalAddImageWrapper}>
            <ScrollView style={styles.modalAddImageScrollView} contentContainerStyle={styles.modalAddImageScrollViewContent}>
              <Text style={styles.modalTitle}>Adicionar Imagem ao Álbum</Text>
              <View style={styles.imageUploadContainer}>
                <Text style={styles.imageUploadLabel}>
                  Selecione a Imagem:
                </Text>
                <TouchableOpacity onPress={handleImageChange} style={styles.imageUploadButton}>
                  <Text style={styles.imageUploadButtonText}>Selecionar Imagem</Text>
                </TouchableOpacity>
                {previewImage && (
                  <View style={styles.imageUploadPreviewWrapper}>
                    <TouchableOpacity onPress={handlePreviewClick}>
                      <Image
                        source={{ uri: previewImage }}
                        alt="Preview"
                        style={styles.imageUploadPreview}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <View style={styles.subalbumSelectorContainer}>
                <Text style={styles.imageSubAlbumLabel}>
                  Adicionar aos Subálbuns:
                </Text>
                <MultiSelectSubalbums
                  options={subalbumOptions}
                  selectedValues={selectedSubalbuns}
                  onSelectionChange={setSelectedSubalbuns}
                  disabled={isLoading}
                />
              </View>
              <View style={styles.mediaOptionsContainer}>
                <Text style={styles.mediaOptionsLabel}>Opções de Mídia:</Text>
                <View style={styles.mediaOptionsList}>
                  <View style={styles.mediaOptionItem}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setIsDigital(!isDigital)}
                      disabled={isLoading}
                    >
                      <View style={[styles.checkbox, isDigital && styles.checkboxChecked]}>
                        {isDigital && <MaterialIcons name="check" size={16} color="white" />}
                      </View>
                      <Text style={styles.checkboxLabel}>Mídia Digital</Text>
                    </TouchableOpacity>

                    {isDigital && (
                      <View style={styles.mediaPriceField}>
                        <Text style={styles.mediaPriceLabel}>Preço Digital:</Text>
                        <TextInput
                          style={styles.priceInput}
                          keyboardType="numeric"
                          value={precoDigital !== null ? String(precoDigital) : String(album?.preco_digital_padrao || 0)}
                          onChangeText={text => setPrecoDigital(parseFloat(text) || 0)}
                          editable={!isLoading}
                          placeholderTextColor={COLORS.textSecondary}
                        />
                      </View>
                    )}
                  </View>

                  <View style={styles.mediaOptionItem}>
                    <TouchableOpacity
                      style={styles.checkboxContainer}
                      onPress={() => setIsFisica(!isFisica)}
                      disabled={isLoading}
                    >
                      <View style={[styles.checkbox, isFisica && styles.checkboxChecked]}>
                        {isFisica && <MaterialIcons name="check" size={16} color="white" />}
                      </View>
                      <Text style={styles.checkboxLabel}>Mídia Física</Text>
                    </TouchableOpacity>

                    {isFisica && (
                      <View style={styles.mediaPriceField}>
                        <Text style={styles.mediaPriceLabel}>Preço Físico:</Text>
                        <TextInput
                          style={styles.priceInput}
                          keyboardType="numeric"
                          value={precoFisica !== null ? String(precoFisica) : String(album?.preco_fisica_padrao || 0)}
                          onChangeText={text => setPrecoFisica(parseFloat(text) || 0)}
                          editable={!isLoading}
                          placeholderTextColor={COLORS.textSecondary}
                        />
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.modalFormActions}>
                <TouchableOpacity
                  style={[styles.modalFormButtonCancel, isLoading && styles.modalFormButtonDisabled]}
                  onPress={() => setModalAlbum(false)}
                  disabled={isLoading}
                >
                  <Text style={styles.modalFormButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalFormButtonSubmit, (isLoading || !image) && styles.modalFormButtonDisabled]}
                  onPress={handleImageUpload}
                  disabled={isLoading || !image}
                >
                  {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalFormButtonText}>Enviar Imagem</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Modal de edição de imagem */}
        <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
          {/* CORREÇÃO APLICADA AQUI: O ScrollView agora está dentro de um wrapper para gerenciar altura */}
          <View style={styles.modalEditImageWrapper}>
            <ScrollView style={styles.modalEditImageScrollView} contentContainerStyle={styles.modalEditImageScrollViewContent}>
              <Text style={styles.modalTitle}>Editar Imagem</Text>

              {selectedImage && (
                <>
                  <View style={styles.editImagePreviewContainer}>
                    <Image
                      source={{ uri: getImageUrl(selectedImage) }}
                      alt={selectedImage.nome || 'Imagem do álbum'}
                      style={styles.editImagePreview}
                      resizeMode="contain"
                    />
                  </View>

                  <View style={styles.editImageFormContainer}>
                    <View style={styles.mediaOptionsContainer}>
                      <Text style={styles.mediaOptionsLabel}>Opções de Mídia:</Text>
                      <View style={styles.mediaOptionsList}>
                        <View style={styles.mediaOptionItem}>
                          <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setEditIsDigital(!editIsDigital)}
                            disabled={isLoading}
                          >
                            <View style={[styles.checkbox, editIsDigital && styles.checkboxChecked]}>
                              {editIsDigital && <MaterialIcons name="check" size={16} color="white" />}
                            </View>
                            <Text style={styles.checkboxLabel}>Mídia Digital</Text>
                          </TouchableOpacity>

                          {editIsDigital && (
                            <View style={styles.mediaPriceField}>
                              <Text style={styles.mediaPriceLabel}>Preço Digital:</Text>
                              <TextInput
                                style={styles.priceInput}
                                keyboardType="numeric"
                                value={editPrecoDigital !== null ? String(editPrecoDigital) : String(album?.preco_digital_padrao || 0)}
                                onChangeText={text => setEditPrecoDigital(parseFloat(text) || 0)}
                                editable={!isLoading}
                                placeholderTextColor={COLORS.textSecondary}
                              />
                            </View>
                          )}
                        </View>

                        <View style={styles.mediaOptionItem}>
                          <TouchableOpacity
                            style={styles.checkboxContainer}
                            onPress={() => setEditIsFisica(!editIsFisica)}
                            disabled={isLoading}
                          >
                            <View style={[styles.checkbox, editIsFisica && styles.checkboxChecked]}>
                              {editIsFisica && <MaterialIcons name="check" size={16} color="white" />}
                            </View>
                            <Text style={styles.checkboxLabel}>Mídia Física</Text>
                          </TouchableOpacity>

                          {editIsFisica && (
                            <View style={styles.mediaPriceField}>
                              <Text style={styles.mediaPriceLabel}>Preço Físico:</Text>
                              <TextInput
                                style={styles.priceInput}
                                keyboardType="numeric"
                                value={editPrecoFisica !== null ? String(editPrecoFisica) : String(album?.preco_fisica_padrao || 0)}
                                onChangeText={text => setEditPrecoFisica(parseFloat(text) || 0)}
                                editable={!isLoading}
                                placeholderTextColor={COLORS.textSecondary}
                              />
                            </View>
                          )}
                        </View>
                      </View>
                    </View>

                    <View style={styles.subalbumSelectorContainer}>
                      <Text style={styles.imageSubAlbumLabel}>Subálbuns da Imagem:</Text>
                      <MultiSelectSubalbums
                        options={allSubalbumOptions}
                        selectedValues={selectedImageSubalbuns.map(item => item.value)}
                        onSelectionChange={(newSelection) => {
                          const newSelectedImageSubalbuns = newSelection.map(value => ({
                            value,
                            label: allSubalbumOptions.find(opt => opt.value === value)?.label || `Subálbum ${value}`
                          }));
                          setSelectedImageSubalbuns(newSelectedImageSubalbuns);
                        }}
                        disabled={isLoading}
                      />
                      <Text style={styles.subalbunsHelpText}>
                        Selecione os subálbuns em que esta imagem deve aparecer.
                      </Text>
                    </View>

                    <View style={styles.modalFormActions}>
                      <TouchableOpacity
                        style={[styles.modalFormButtonSubmit, isLoading && styles.modalFormButtonDisabled]}
                        onPress={handleFavoriteImage}
                        disabled={isLoading || !selectedImage}
                      >
                        <Text style={styles.modalFormButtonText}>Favoritar Imagem</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.modalFormButtonDelete, isLoading && styles.modalFormButtonDisabled]}
                        onPress={() => setDeleteConfirmation(true)}
                        disabled={isLoading}
                      >
                        <Text style={styles.modalFormButtonText}>Excluir Imagem</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.modalFormActions}>
                      <TouchableOpacity
                        style={[styles.modalFormButtonSubmit, isLoading && styles.modalFormButtonDisabled]}
                        onPress={handleUpdateImage}
                        disabled={isLoading}
                      >
                        {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalFormButtonText}>Salvar Alterações</Text>}
                      </TouchableOpacity>
                    </View>
                  </View>
                </>
              )}
            </ScrollView>
          </View>
        </Modal>

        {/* Modal de confirmação de exclusão */}
        <Modal isOpen={deleteConfirmation} onClose={() => setDeleteConfirmation(false)}>
          <View style={styles.deleteConfirmationContainer}>
            <Text style={styles.modalTitle}>Confirmar Exclusão</Text>
            <Text style={styles.modalText}>Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita.</Text>

            <View style={styles.deleteConfirmationActions}>
              <TouchableOpacity
                style={[styles.modalFormButtonCancel, isLoading && styles.modalFormButtonDisabled]}
                onPress={() => setDeleteConfirmation(false)}
                disabled={isLoading}
              >
                <Text style={styles.modalFormButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalFormButtonDelete, isLoading && styles.modalFormButtonDisabled]}
                onPress={handleDeleteImage}
                disabled={isLoading}
              >
                {isLoading ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalFormButtonText}>Confirmar Exclusão</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de links de compartilhamento */}
        <Modal isOpen={shareLinkModalOpen} onClose={() => setShareLinkModalOpen(false)}>
          <View style={styles.shareLinksModalWrapper}>
            <Text style={styles.modalTitle}>Links de Acesso ao Álbum</Text>

            <ScrollView style={styles.shareLinksScrollView} contentContainerStyle={styles.shareLinksContentContainer}>
              {albumLink && (
                <View style={[styles.shareLinkItem, albumLink.isNew ? styles.newLink : styles.existingLink]}>
                  <View style={styles.shareLinkHeader}>
                    <Text style={styles.shareLinkTitle}>Link do Álbum Principal: {album?.nome}</Text>
                    <Text style={styles.shareLinkDescription}>
                      Este link dá acesso a todas as fotos do álbum
                      {albumLink.isNew ?
                        <Text style={[styles.linkStatus, styles.linkStatusNew]}> Novo link criado</Text> :
                        <Text style={[styles.linkStatus, styles.linkStatusExisting]}> Link existente recuperado</Text>
                      }
                    </Text>
                    <Text style={styles.shareLinkExpiration}>
                      Expira em: {formatExpirationDate(albumLink.expiresAt)}
                    </Text>
                  </View>
                  <View style={styles.shareLinkInputGroup}>
                    <TextInput
                      style={styles.shareLinkInput}
                      value={albumLink.url}
                      editable={false}
                      selectTextOnFocus={true}
                    />
                    <TouchableOpacity
                      onPress={() => copyToClipboard(albumLink.url, 'album')}
                      style={[styles.shareLinkCopyButton, linksCopied['album'] && styles.shareLinkCopyButtonCopied]}
                    >
                      <Text style={styles.shareLinkCopyButtonText}>{linksCopied['album'] ? 'Copiado ✓' : 'Copiar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {subalbumLinks.length > 0 && (
                <View style={styles.shareLinkDivider}>
                  <Text style={styles.shareLinkDividerText}>Links de Subálbuns</Text>
                </View>
              )}

              {subalbumLinks.map(subalbum => (
                <View
                  style={[styles.shareLinkItem, subalbum.isNew ? styles.newLink : styles.existingLink]}
                  key={subalbum.id}
                >
                  <View style={styles.shareLinkHeader}>
                    <Text style={styles.shareLinkTitle}>Subálbum: {subalbum.nome}</Text>
                    <Text style={styles.shareLinkDescription}>
                      Este link dá acesso apenas às fotos deste subálbum
                      {subalbum.isNew ?
                        <Text style={[styles.linkStatus, styles.linkStatusNew]}> Novo link criado</Text> :
                        <Text style={[styles.linkStatus, styles.linkStatusExisting]}> Link existente recuperado</Text>
                      }
                    </Text>
                    <Text style={styles.shareLinkExpiration}>
                      Expira em: {formatExpirationDate(subalbum.expiresAt)}
                    </Text>
                  </View>
                  <View style={styles.shareLinkInputGroup}>
                    <TextInput
                      style={styles.shareLinkInput}
                      value={subalbum.url}
                      editable={false}
                      selectTextOnFocus={true}
                    />
                    <TouchableOpacity
                      onPress={() => copyToClipboard(subalbum.url, subalbum.id)}
                      style={[styles.shareLinkCopyButton, linksCopied[subalbum.id] && styles.shareLinkCopyButtonCopied]}
                    >
                      <Text style={styles.shareLinkCopyButtonText}>{linksCopied[subalbum.id] ? 'Copiado ✓' : 'Copiar'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={styles.shareLinksFooter}>
              <Text style={styles.shareLinksNote}>
                <Ionicons name="information-circle" size={16} color={COLORS.textSecondary} /> Os links expiram após 7 dias da data de criação e podem ser compartilhados com seus clientes para que eles visualizem as fotos sem precisar fazer login.
              </Text>
              <TouchableOpacity
                onPress={() => setShareLinkModalOpen(false)}
                style={styles.modalFormButtonSubmit}
              >
                <Text style={styles.modalFormButtonText}>Fechar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Modal de confirmação de exclusão do álbum */}
        <Modal isOpen={deleteAlbumConfirmation} onClose={() => setDeleteAlbumConfirmation(false)}>
          <View style={styles.deleteConfirmationContainer}>
            <Text style={styles.modalTitle}>Confirmar Exclusão do Álbum</Text>
            <Text style={styles.modalText}>
              Tem certeza que deseja excluir o álbum <Text style={{ fontWeight: 'bold' }}>{album?.nome}</Text>?
              Esta ação excluirá o álbum, todos os seus subálbuns e todas as fotos associadas.
              Esta ação não pode ser desfeita.
            </Text>

            <View style={styles.deleteConfirmationActions}>
              <TouchableOpacity
                style={[styles.modalFormButtonCancel, isDeletingAlbum && styles.modalFormButtonDisabled]}
                onPress={() => setDeleteAlbumConfirmation(false)}
                disabled={isDeletingAlbum}
              >
                <Text style={styles.modalFormButtonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalFormButtonDelete, isDeletingAlbum && styles.modalFormButtonDisabled]}
                onPress={handleDeleteAlbum}
                disabled={isDeletingAlbum}
              >
                {isDeletingAlbum ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.modalFormButtonText}>Confirmar Exclusão</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
      <Footer />
    </View>
  );
};

// Estilos base para os wrappers dos modais
const modalWrapperBase = {
  width: '100%',
  alignSelf: 'center',
  backgroundColor: COLORS.cardBackground,
  borderRadius: BORDER_RADIUS.large,
  ...SHADOWS.large,
};

// Estilos base para o contentContainerStyle dos ScrollViews dentro dos modais
const modalScrollContentBase = {
  flexGrow: 1,
  paddingHorizontal: SPACING.medium,
  paddingBottom: SPACING.medium,
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: SPACING.extraLarge * 2,
  },
  navControler: {
    flexDirection: 'column',
    marginVertical: SPACING.large,
    paddingHorizontal: SPACING.medium,
    gap: SPACING.medium,
  },
  navControlerSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
  },
  searchInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardBackground,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderLeftWidth: 0,
    borderRightWidth: 0,
  },
  navControlerButtonSearch: {
    height: 40,
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: BORDER_RADIUS.small,
    borderBottomLeftRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.medium,
  },
  navControlerButtonClear: {
    height: 40,
    backgroundColor: COLORS.primary,
    borderTopRightRadius: BORDER_RADIUS.small,
    borderBottomRightRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.medium,
  },
  navControlerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.small,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  navControlerButtonDelete: {
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.small + 2,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  navControlerButtonAdd: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small + 2,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  navControlerButtonShare: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small + 2,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  navControlerButtonDisabled: {
    opacity: 0.6,
  },
  navControlerButtonText: {
    color: COLORS.lightGray,
    fontSize: 14,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: SPACING.medium,
    paddingBottom: SPACING.small,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.small / 2,
  },
  statusDotRefreshing: {
    backgroundColor: COLORS.warning,
  },
  statusDotIdle: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  alert: {
    marginHorizontal: SPACING.medium,
    marginBottom: SPACING.medium,
    padding: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    ...SHADOWS.small,
  },
  alertSuccess: {
    backgroundColor: '#D4EDDA',
    borderColor: COLORS.success,
    borderWidth: 1,
  },
  alertWarning: {
    backgroundColor: '#FFF3CD',
    borderColor: COLORS.warning,
    borderWidth: 1,
  },
  alertDanger: {
    backgroundColor: '#F8D7DA',
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  alertText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlign: 'center',
  },
  albumDetailsContainer: {
    flex: 1,
    paddingHorizontal: SPACING.medium,
  },
  loadingIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.extraLarge,
  },
  loadingText: {
    marginTop: SPACING.medium,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  errorMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.extraLarge,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.danger,
    textAlign: 'center',
  },
  emptyMessage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.extraLarge,
  },
  emptyMessageText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between', // Para distribuir as imagens uniformemente
    gap: SPACING.small, // Espaçamento entre as imagens
  },
  imageCard: {
    width: '48%', // Aproximadamente metade da largura para duas colunas
    backgroundColor: COLORS.cardBackground,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.medium,
    marginBottom: SPACING.small, // Espaçamento inferior entre as linhas
  },
  imageCardUnavailable: {
    width: '48%',
    backgroundColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.medium,
    marginBottom: SPACING.small,
  },
  albumImage: {
    width: '100%',
    height: 180,
  },
  imageInfo: {
    padding: SPACING.medium,
  },
  imageName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.small / 2,
  },
  imageBadge: {
    fontSize: 12,
    color: COLORS.lightGray,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.small / 2,
    paddingVertical: 2,
    borderRadius: BORDER_RADIUS.small,
    textAlign: 'center',
    overflow: 'hidden',
  },
  imageBadgePhysical: {
    backgroundColor: COLORS.textSecondary,
  },
  imageBadgeDigital: {
    backgroundColor: COLORS.info,
  },
  placeholderImage: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.lightGray,
  },
  unavailableIcon: {
    fontSize: 30,
    marginBottom: SPACING.small / 2,
  },
  unavailableText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Estilos comuns para títulos e textos de modais
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.large,
    textAlign: 'center',
    paddingHorizontal: SPACING.medium, // Garante padding para o título dentro do modal
  },
  modalText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.medium,
    paddingHorizontal: SPACING.medium, // Garante padding para o texto dentro do modal
  },

  // Modal SubAlbum (Conteúdo simples, não exige ScrollView interno)
  modalSubAlbumContainer: {
    ...modalWrapperBase,
    maxWidth: 900,
    maxHeight: '80%',
    padding: SPACING.medium, // Padding aplicado diretamente ao container do modal
  },
  modalSubAlbumForm: {
    width: '100%',
  },
  modalSubAlbumField: {
    marginBottom: SPACING.medium,
  },
  modalSubAlbumLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.small,
  },
  modalSubAlbumInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.medium,
    paddingVertical: SPACING.small + 2,
    fontSize: 16,
    backgroundColor: COLORS.background,
    color: COLORS.textPrimary,
  },
  modalSubAlbumActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.large,
  },
  modalSubAlbumButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  modalSubAlbumButtonDisabled: {
    opacity: 0.6,
  },
  modalSubAlbumButtonText: {
    color: COLORS.lightGray,
    fontSize: 16,
    fontWeight: 'bold',
  },

  // Modal Add Image
  modalAddImageWrapper: { // Wrapper principal do modal de adicionar imagem
    ...modalWrapperBase,
    maxWidth: Dimensions.get('window').width * 0.95, // 95% da largura da tela
    maxHeight: Dimensions.get('window').height * 0.85, // 85% da altura da tela
    flex: 1, // Permite que o wrapper preencha a altura disponível
    // Remover padding vertical aqui para que o ScrollView gerencie
  },
  modalAddImageScrollView: { // Estilo para o componente ScrollView
    flex: 1, // Permite que o ScrollView ocupe o espaço restante
  },
  modalAddImageScrollViewContent: { // Estilo para o contentContainerStyle do ScrollView
    ...modalScrollContentBase,
    paddingTop: SPACING.large, // Adiciona padding no topo do conteúdo rolável
  },
  imageUploadContainer: {
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  imageUploadLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.small,
  },
  imageUploadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small + 2,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    marginBottom: SPACING.small,
    ...SHADOWS.small,
  },
  imageUploadButtonText: {
    color: COLORS.lightGray,
    fontSize: 16,
  },
  imageUploadPreviewWrapper: {
    marginTop: SPACING.small,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
  },
  imageUploadPreview: {
    width: 150,
    height: 120,
  },
  subalbumSelectorContainer: {
    marginBottom: SPACING.medium,
  },
  imageSubAlbumLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.small,
  },
  mediaOptionsContainer: {
    marginBottom: SPACING.medium,
  },
  mediaOptionsLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginBottom: SPACING.small,
  },
  mediaOptionsList: {
    flexDirection: 'column',
    gap: SPACING.small,
  },
  mediaOptionItem: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    padding: SPACING.small,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.background,
    ...SHADOWS.small,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.small,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.small,
    marginRight: SPACING.small / 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxLabel: {
    fontSize: 14,
    color: COLORS.darkGray,
  },
  mediaPriceField: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.small / 2,
    alignSelf: 'stretch',
  },
  mediaPriceLabel: {
    fontSize: 14,
    color: COLORS.primary,
    marginRight: SPACING.small,
    flex: 1,
  },
  priceInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.small / 2,
    fontSize: 14,
    width: 100,
    backgroundColor: COLORS.cardBackground,
    color: COLORS.textPrimary,
  },
  modalFormActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.large,
    gap: SPACING.small,
  },
  modalFormButtonCancel: {
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...SHADOWS.small,
  },
  modalFormButtonSubmit: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...SHADOWS.small,
  },
  modalFormButtonDelete: {
    backgroundColor: COLORS.danger,
    paddingVertical: SPACING.medium,
    paddingHorizontal: SPACING.large,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    ...SHADOWS.small,
  },
  modalFormButtonDisabled: {
    opacity: 0.6,
  },
  modalFormButtonText: {
    color: COLORS.lightGray,
    fontSize: 16,
    fontWeight: 'bold',
  },

  modalEditImageWrapper: { // Wrapper principal do modal de edição de imagem
    ...modalWrapperBase,
    maxWidth: Dimensions.get('window').width * 0.95, // 95% da largura da tela
    maxHeight: Dimensions.get('window').height * 0.85, // 85% da altura da tela
    flex: 1,
  },
  modalEditImageScrollView: { // Estilo para o componente ScrollView
    flex: 1,
  },
  modalEditImageScrollViewContent: { // Estilo para o contentContainerStyle do ScrollView
    ...modalScrollContentBase,
    paddingTop: SPACING.large,
  },
  editImagePreviewContainer: {
    alignItems: 'center',
    marginBottom: SPACING.medium,
  },
  editImagePreview: {
    width: 200,
    height: 150,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  editImageFormContainer: {
    // Estilos para o formulário de edição
  },
  subalbunsHelpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.small / 2,
    fontStyle: 'italic',
  },

  // Delete Confirmation Modal
  deleteConfirmationContainer: { // Container direto para o modal de confirmação
    ...modalWrapperBase,
    maxWidth: Dimensions.get('window').width * 0.95,
    maxHeight: Dimensions.get('window').height * 0.6,
    padding: SPACING.medium, // Padding aplicado diretamente ao container
  },
  deleteConfirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.large,
    gap: SPACING.small,
  },

  // Share Links Modal
  shareLinksModalWrapper: { // Wrapper principal do modal de links
    ...modalWrapperBase,
    maxWidth: Dimensions.get('window').width * 0.95,
    maxHeight: Dimensions.get('window').height * 0.85,
    flexDirection: 'column', // Para que o ScrollView e o Footer se organizem verticalmente
    padding: SPACING.medium, // Padding geral para todo o conteúdo do modal
  },
  shareLinksScrollView: { // Estilo para o componente ScrollView
    flex: 1, // Ocupa o espaço vertical disponível
  },
  shareLinksContentContainer: { // Estilo para o contentContainerStyle do ScrollView
    paddingVertical: SPACING.small, // Pequeno padding interno para o conteúdo rolável
  },
  shareLinksFooter: {
    marginTop: SPACING.medium, // Espaçamento acima do rodapé
    alignItems: 'center',
  },
  shareLinksContent: {
    // Este estilo não é mais usado diretamente no ScrollView, mas pode ser removido ou realocado se necessário
  },
  shareLinkItem: {
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.medium,
    marginBottom: SPACING.medium,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    ...SHADOWS.small,
  },
  newLink: {
    borderColor: COLORS.success,
    backgroundColor: '#D4EDDA',
  },
  existingLink: {
    borderColor: COLORS.info,
    backgroundColor: '#CCE5FF',
  },
  shareLinkHeader: {
    marginBottom: SPACING.small,
  },
  shareLinkTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: SPACING.small / 2,
  },
  shareLinkDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.small / 2,
  },
  linkStatus: {
    fontWeight: 'bold',
    marginLeft: SPACING.small / 2,
  },
  linkStatusNew: {
    color: COLORS.success,
  },
  linkStatusExisting: {
    color: COLORS.info,
  },
  shareLinkExpiration: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  shareLinkInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.small,
  },
  shareLinkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.small,
    paddingVertical: SPACING.small + 2,
    fontSize: 14,
    backgroundColor: COLORS.cardBackground,
    color: COLORS.textPrimary,
    marginRight: SPACING.small,
  },
  shareLinkCopyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small + 2,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.medium,
    ...SHADOWS.small,
  },
  shareLinkCopyButtonCopied: {
    backgroundColor: COLORS.success,
  },
  shareLinkCopyButtonText: {
    color: COLORS.lightGray,
    fontSize: 14,
  },
  shareLinkDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    marginVertical: SPACING.large,
    alignItems: 'center',
    position: 'relative',
  },
  shareLinkDividerText: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.small,
    fontSize: 14,
    color: COLORS.textSecondary,
    position: 'absolute',
    top: -10, // Ajusta a posição vertical do texto sobre a linha
  },
  shareLinksFooter: {
    marginTop: SPACING.medium,
    alignItems: 'center',
  },
  shareLinksNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.medium,
  },

  // Multi Select Subalbums
  multiSelectContainer: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    backgroundColor: COLORS.background,
    maxHeight: 120,
    minHeight: 60,
  },
  multiSelectScrollView: {
    padding: SPACING.small,
  },
  multiSelectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.small,
    paddingHorizontal: SPACING.small,
    borderRadius: BORDER_RADIUS.small,
    marginBottom: SPACING.small / 2,
  },
  multiSelectItemSelected: {
    backgroundColor: COLORS.primary + '20', // 20% opacity
  },
  multiSelectItemDisabled: {
    opacity: 0.6,
  },
  multiSelectCheckbox: {
    width: 18,
    height: 18,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.small,
    marginRight: SPACING.small,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
  },
  multiSelectCheckboxSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  multiSelectLabel: {
    fontSize: 14,
    color: COLORS.textPrimary,
    flex: 1,
  },
  multiSelectLabelSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  multiSelectLabelDisabled: {
    color: COLORS.textSecondary,
  },
  multiSelectEmptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    padding: SPACING.medium,
    fontStyle: 'italic',
  },

  // --- Estilos para os Controles de Paginação ---
  paginationControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.extraLarge,
    marginBottom: SPACING.extraLarge,
    gap: SPACING.medium, // Espaço entre os elementos
    paddingHorizontal: SPACING.medium,
  },
  paginationButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.small + 2,
    paddingHorizontal: SPACING.medium,
    borderRadius: BORDER_RADIUS.small,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.small,
  },
  paginationButtonDisabled: {
    backgroundColor: COLORS.border,
    opacity: 0.7,
  },
  paginationButtonText: {
    color: COLORS.lightGray,
    fontSize: 14,
    fontWeight: '600',
  },
  paginationPageInfo: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 100, // Garante que o texto da página não fique muito comprimido
  },
  loadingIndicatorSmall: { // Para o indicador de "carregando página X"
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.medium,
  },
  loadingTextSmall: {
    marginLeft: SPACING.small,
    fontSize: 14,
    color: COLORS.textSecondary,
  },


});

export default AlbumDetails;