import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import { Buffer } from 'buffer';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView, PanGestureHandler as RNGHPanGestureHandler, State as RNGHState } from 'react-native-gesture-handler';

import Footer from '../components/templates/Footer';
import Header from '../components/templates/Header';
import Modal from '../components/templates/Modal';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

const getImageUrl = (image) => {
  if (!image || !image.dados) {
    return 'https://via.placeholder.com/300x200?text=Imagem+Indispon%C3%ADvel';
  }

  if (typeof image.dados === 'string') {
    if (image.dados.startsWith('data:')) {
      return image.dados;
    }
    return `data:${image.tipo_mime || 'image/jpeg'};base64,${image.dados}`;
  }

  if (
    typeof image.dados === 'object' &&
    image.dados.type === 'Buffer' &&
    Array.isArray(image.dados.data)
  ) {
    try {
      const base64String = Buffer.from(image.dados.data).toString('base64');
      return `data:${image.tipo_mime || 'image/jpeg'};base64,${base64String}`;
    } catch (e) {
      console.error('Erro ao converter Buffer para base64 em React Native:', e);
      return 'https://via.placeholder.com/300x200?text=Erro+de+Processamento';
    }
  }

  if (Array.isArray(image.dados)) {
    try {
      const base64String = Buffer.from(image.dados).toString('base64');
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

const Home = () => {
  const router = useRouter();
  const [modalAlbumOpen, setModalAlbumOpen] = useState(false);
  const [modalHelpOpen, setModalHelpOpen] = useState(false);
  const [modalConclusionOpen, setModalConclusionOpen] = useState(false);
  const [hoveredAlbum, setHoveredAlbum] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [albumsPhotoCount, setAlbumsPhotoCount] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favoriteImages, setFavoriteImages] = useState({});
  const favoriteAlbumsRef = useRef([]);

  const [albumName, setAlbumName] = useState('');
  const [subgroups, setSubgroups] = useState('');
  const [marcaDaguaPosition, setMarcaDaguaPosition] = useState('lateral');
  const [selectedMarcaDaguaUri, setSelectedMarcaDaguaUri] = useState(null);
  const [valorDigital, setValorDigital] = useState('');
  const [valorFisica, setValorFisica] = useState('');

  const { width } = Dimensions.get('window');
  const isMobile = width < 768;

  useEffect(() => {
    favoriteAlbumsRef.current = albums.filter(album => album.favoritado);
    if (currentIndex >= favoriteAlbumsRef.current.length && favoriteAlbumsRef.current.length > 0) {
      setCurrentIndex(0);
    }
  }, [albums, currentIndex]);

  useEffect(() => {
    fetchAlbums();
  }, []);

  useEffect(() => {
    if (albums.length > 0) {
      fetchAlbumsPhotoCount(albums);
    }
  }, [albums]);

  const fetchFavoriteImages = async (albumsList) => {
    const favoriteImagesObj = {};
    const token = await AsyncStorage.getItem('token');
    await Promise.all(albumsList.map(async (album) => {
      try {
        const res = await fetch(`${API_URL}/fotos/favoritePhoto/${album.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        if (!res.ok) {
          if (res.status === 404) {
            console.warn(`Nenhuma imagem favorita encontrada para o álbum ${album.id}`);
            return;
          }
          throw new Error(`Erro ao buscar imagem favorita para o álbum ${album.id}: ${res.statusText}`);
        }
        const data = await res.json();
        favoriteImagesObj[album.id] = data;
      } catch (err) {
        console.error('Erro ao buscar imagem favorita:', err);
      }
    }));
    setFavoriteImages(favoriteImagesObj);
  };

  const fetchAlbums = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/album/getAlbums`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar álbuns');
      }
      const data = await response.json();
      setAlbums(data);
      setCurrentIndex(0);
      await fetchFavoriteImages(data);
    } catch (error) {
      console.error('Erro:', error);
      Alert.alert('Erro', error.message || 'Falha ao carregar álbuns.');
    }
  };

  const toggleFavorite = async (albumId, favoritado) => {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/album/toggleFavorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ albumId, favoritado: !favoritado }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao modificar álbum favorito');
      }

      setAlbums(prevAlbums =>
        prevAlbums.map(album =>
          album.id === albumId ? { ...album, favoritado: !album.favoritado } : album
        )
      );
    } catch (error) {
      console.error('Erro ao modificar álbum favorito:', error);
      Alert.alert('Erro', error.message || 'Falha ao atualizar favorito.');
    }
  };

  const handleSubmit = async () => {
    if (!albumName.trim()) {
      Alert.alert('Erro', 'O nome do álbum é obrigatório.');
      return;
    }

    const formData = new FormData();
    const parsedSubgroups = subgroups.split(';').map(sg => sg.trim()).filter(sg => sg !== '');

    formData.append('albumName', albumName);
    formData.append('subgroups', JSON.stringify(parsedSubgroups));
    formData.append('position', marcaDaguaPosition);
    formData.append('valorDigital', parseFloat(valorDigital || '0').toString());
    formData.append('valorFisica', parseFloat(valorFisica || '0').toString());

    if (selectedMarcaDaguaUri) {
      const fileName = selectedMarcaDaguaUri.split('/').pop();
      const fileType = 'image/jpeg';
      formData.append('marca_dagua', {
        uri: selectedMarcaDaguaUri,
        name: fileName,
        type: fileType,
      });
    }

    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/album/createAlbum`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar álbum');
      } else {
        setModalConclusionOpen(true);
        setModalAlbumOpen(false);
        fetchAlbums();
        setAlbumName('');
        setSubgroups('');
        setMarcaDaguaPosition('lateral');
        setSelectedMarcaDaguaUri(null);
        setValorDigital('');
        setValorFisica('');
      }
    } catch (error) {
      console.error('Erro ao criar álbum:', error);
      Alert.alert('Erro ao criar álbum', error.message || 'Verifique sua conexão ou dados.');
    }
  };

  const scrollLeft = () => {
    const favoriteAlbums = favoriteAlbumsRef.current;
    if (favoriteAlbums.length <= 1) return;
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex - 1 + favoriteAlbums.length) % favoriteAlbums.length;
      return newIndex;
    });
  };

  const scrollRight = () => {
    const favoriteAlbums = favoriteAlbumsRef.current;
    if (favoriteAlbums.length <= 1) return;
    setCurrentIndex((prevIndex) => {
      const newIndex = (prevIndex + 1) % favoriteAlbums.length;
      return newIndex;
    });
  };

  const onGestureEvent = (event) => {
    // A lógica de swipe será tratada no onHandlerStateChange para maior precisão
  };

  const onHandlerStateChange = (event) => {
    if (event.nativeEvent.state === RNGHState.END) {
      const { translationX, velocityX } = event.nativeEvent;
      
      if (Math.abs(velocityX) > 500 || Math.abs(translationX) > 100) {
        if (translationX > 0) {
          scrollLeft();
        } else {
          scrollRight();
        }
      }
    }
  };

  const getVisibleAlbums = () => {
    const favoriteAlbums = favoriteAlbumsRef.current;
    if (favoriteAlbums.length === 0) return [];

    if (favoriteAlbums.length === 1) {
      return [{ ...favoriteAlbums[0], position: 0 }];
    }

    if (favoriteAlbums.length === 2) {
      return [
        { ...favoriteAlbums[currentIndex], position: 0 },
        { ...favoriteAlbums[(currentIndex + 1) % favoriteAlbums.length], position: 1 }
      ];
    }

    const result = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + favoriteAlbums.length) % favoriteAlbums.length;
      result.push({
        ...favoriteAlbums[index],
        position: i
      });
    }
    return result;
  };

  // CORREÇÃO PRINCIPAL: Melhor função de posicionamento
  const getPositionStyle = (position) => {
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = isMobile ? screenWidth * 0.8 : 240;
    const spacing = isMobile ? 20 : 30;
    
    const baseStyle = {
      position: 'absolute',
      width: cardWidth,
      opacity: 0.7,
      zIndex: 1,
      transform: [],
    };

    if (position === -1) {
      baseStyle.transform.push({ translateX: -(cardWidth + spacing) });
      baseStyle.opacity = 0.5;
    } else if (position === 0) {
      baseStyle.transform.push({ translateX: 0 });
      baseStyle.transform.push({ scale: 1.1 });
      baseStyle.opacity = 1;
      baseStyle.zIndex = 2;
    } else if (position === 1) {
      baseStyle.transform.push({ translateX: cardWidth + spacing });
      baseStyle.opacity = 0.5;
    }
    
    return baseStyle;
  };

  const fetchAlbumsPhotoCount = async (albumsList) => {
    const counts = {};
    const token = await AsyncStorage.getItem('token');
    await Promise.all(albumsList.map(async (album) => {
      try {
        const res = await fetch(`${API_URL}/fotos/getAlbumsPhotos?albumId=${album.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          }
        });
        if (!res.ok) {
          counts[album.id] = 0;
          return;
        }
        const data = await res.json();
        counts[album.id] = Array.isArray(data) ? data.length : (Array.isArray(data.images) ? data.images.length : 0);
      } catch (err) {
        counts[album.id] = 0;
      }
    }));
    setAlbumsPhotoCount(counts);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <Header />
        <ScrollView contentContainerStyle={styles.scrollContentContainer}>
          <View style={[styles.mainLayout, isMobile && styles.mainLayoutMobile]}>
            {/* Sidebar */}
            <View style={[styles.sidebar, isMobile && styles.sidebarMobile]}>
              <View style={styles.sidebarHeader}>
                <TouchableOpacity
                  style={styles.plusIcon}
                  onPress={() => setModalAlbumOpen(true)}
                  accessibilityLabel="Adicionar novo álbum"
                >
                  <AntDesign name="pluscircleo" size={30} color="white" />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.sidebarContent}>
                <View style={styles.albumHeader}>
                  <Text style={styles.albumTitle}>Álbuns</Text>
                </View>
                <View style={styles.clientsList}>
                  {albums.map((album) => (
                    <View key={album.id} style={styles.clientItem}>
                      <TouchableOpacity
                        onPress={() => router.push(`/album/${album.id}`)}
                        style={styles.clientNameWrapper}
                      >
                        <Text style={styles.clientName}>{album.nome}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => toggleFavorite(album.id, album.favoritado)}
                        onPressIn={() => setHoveredAlbum(album.id)}
                        onPressOut={() => setHoveredAlbum(null)}
                        accessibilityLabel="Marcar/Desmarcar como favorito"
                      >
                        {hoveredAlbum === album.id ? (
                          <MaterialIcons name="star-half" size={24} color="#FFD700" />
                        ) : album.favoritado ? (
                          <MaterialIcons name="star" size={24} color="#FFD700" />
                        ) : (
                          <MaterialIcons name="star-border" size={24} color="#666" />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>

            {/* Main Content */}
            <View style={[styles.mainContent, isMobile && styles.mainContentMobile]}>
              <Text style={[styles.mainTitle, isMobile && styles.mainTitleMobile]}>Álbuns Favoritos</Text>
              <View style={[styles.albumsContainer, isMobile && styles.albumsContainerMobile]}>
                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.navLeft,
                    (favoriteAlbumsRef.current.length <= 1) && styles.navButtonDisabled,
                  ]}
                  onPress={scrollLeft}
                  disabled={favoriteAlbumsRef.current.length <= 1}
                  accessibilityLabel="Navegar para a esquerda"
                >
                  <Text style={styles.navButtonText}>{'<'}</Text>
                </TouchableOpacity>

                <RNGHPanGestureHandler
                  onGestureEvent={onGestureEvent}
                  onHandlerStateChange={onHandlerStateChange}
                >
                  <View style={styles.carouselContainer}>
                    {/* CORREÇÃO PRINCIPAL: Novo layout do carrossel */}
                    <View style={styles.carouselWrapper}>
                      {getVisibleAlbums().map((album) => (
                        <TouchableOpacity
                          key={album.id}
                          style={[
                            styles.albumCardContainer,
                            isMobile && styles.albumCardContainerMobile,
                            getPositionStyle(album.position),
                            album.position === 0 && styles.albumCardContainerCenter,
                          ]}
                          onPress={() => router.push(`/album/${album.id}`)}
                          activeOpacity={0.8}
                        >
                          <View style={styles.albumCard}>
                            {favoriteImages[album.id] && favoriteImages[album.id].dados ? (
                              <Image
                                source={{ uri: getImageUrl(favoriteImages[album.id]) }}
                                style={styles.albumCardImg}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={styles.albumCardFallback}>
                                <MaterialIcons name="photo" size={60} color="#FFF" />
                                <Text style={styles.albumCardFallbackText}>Sem Imagem</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.albumCardInfo}>
                            <Text style={[styles.albumCardTitle, isMobile && styles.albumCardTitleMobile]}>
                              {album.nome}
                            </Text>
                            <Text style={[styles.albumCardSubtitle, isMobile && styles.albumCardSubtitleMobile]}>
                              {albumsPhotoCount[album.id] || 0} fotos
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </RNGHPanGestureHandler>

                <TouchableOpacity
                  style={[
                    styles.navButton,
                    styles.navRight,
                    (favoriteAlbumsRef.current.length <= 1) && styles.navButtonDisabled,
                  ]}
                  onPress={scrollRight}
                  disabled={favoriteAlbumsRef.current.length <= 1}
                  accessibilityLabel="Navegar para a direita"
                >
                  <Text style={styles.navButtonText}>{'>'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        <Modal isOpen={modalAlbumOpen} onClose={() => setModalAlbumOpen(false)}>
          <Text style={styles.modalTitle}>Criar Novo Álbum</Text>
          <View style={styles.modalForm}>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome do Álbum"
              value={albumName}
              onChangeText={setAlbumName}
              autoCapitalize="words"
              placeholderTextColor="#999"
            />
            <View style={styles.modalInputGroup}>
              <TextInput
                style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                placeholder="Subgrupos (separados por ';')"
                value={subgroups}
                onChangeText={setSubgroups}
                placeholderTextColor="#999"
              />
              <TouchableOpacity onPress={() => setModalHelpOpen(true)} style={styles.modalHelpButton} accessibilityLabel="Ajuda">
                <Ionicons name="help-circle" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalFieldRow}>
              <Text style={styles.modalLabel}>Marca d'água:</Text>
              <Picker
                selectedValue={marcaDaguaPosition}
                onValueChange={(itemValue) => setMarcaDaguaPosition(itemValue)}
                style={styles.modalSelect}
                itemStyle={Platform.OS === 'ios' ? styles.modalSelectItem : {}}
              >
                <Picker.Item label="Lateral" value="lateral" />
                <Picker.Item label="Preencher" value="preencher" />
                <Picker.Item label="Desativado" value="desativado" />
              </Picker>
            </View>
            <Text style={styles.modalLabelFullWidth}>Valor para foto digital:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="R$ 0,00"
              keyboardType="numeric"
              value={valorDigital}
              onChangeText={setValorDigital}
              placeholderTextColor="#999"
            />
            <Text style={styles.modalLabelFullWidth}>Valor para foto física:</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="R$ 0,00"
              keyboardType="numeric"
              value={valorFisica}
              onChangeText={setValorFisica}
              placeholderTextColor="#999"
            />
            <TouchableOpacity onPress={handleSubmit} style={styles.modalButton}>
              <Text style={styles.modalButtonText}>Criar Álbum</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Modal isOpen={modalHelpOpen} onClose={() => setModalHelpOpen(false)}>
          <Text style={styles.modalTitle}>Ajuda</Text>
          <Text style={styles.modalText}>Insira os subgrupos separados por ponto e vírgula (;). Por exemplo: 'Aniversário; Família; Amigos'.</Text>
          <TouchableOpacity onPress={() => setModalHelpOpen(false)} style={styles.modalButton}>
            <Text style={styles.modalButtonText}>Entendi</Text>
          </TouchableOpacity>
        </Modal>

        <Modal isOpen={modalConclusionOpen} onClose={() => setModalConclusionOpen(false)}>
          <Text style={styles.modalTitle}>Sucesso!</Text>
          <Text style={styles.modalText}>Seu álbum foi criado com sucesso.</Text>
          <TouchableOpacity
            onPress={() => {
              setModalConclusionOpen(false);
              setModalAlbumOpen(false);
            }}
            style={styles.modalButton}
          >
            <Text style={styles.modalButtonText}>Fechar</Text>
          </TouchableOpacity>
        </Modal>
        <Footer />
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  mainLayout: {
    flex: 1,
    flexDirection: 'row',
  },
  mainLayoutMobile: {
    flexDirection: 'column',
  },
  sidebar: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -160 }],
    top: 80,
    width: 320,
    height: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sidebarMobile: {
    position: 'relative',
    left: '50%',
    transform: [{ translateX: -160 }],
    width: 320,
    height: 'auto',
    maxHeight: 'auto',
    borderRadius: 12,
    marginBottom: 20,
    shadowOpacity: 0.1,
    elevation: 5,
  },
  sidebarHeader: {
    height: 60,
    backgroundColor: '#1e3653',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingRight: 16,
    flexDirection: 'row',
  },
  plusIcon: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sidebarContent: {
    flex: 1,
    padding: 20,
  },
  albumHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  albumTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e3653',
  },
  clientsList: {
    marginTop: 10,
    flexDirection: 'column',
    gap: 15,
    alignItems: 'center',
  },
  clientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    width: '100%',
  },
  clientNameWrapper: {
    flex: 1,
    marginRight: 10,
  },
  clientName: {
    fontSize: 17,
    color: '#333',
    textDecorationLine: 'none',
    textAlign: 'center',
  },
  mainContent: {
    flex: 1,
    marginLeft: 360,
    paddingTop: 100,
    paddingHorizontal: 20,
  },
  mainContentMobile: {
    marginLeft: 0,
    paddingTop: 20,
    paddingHorizontal: 15,
    width: '100%',
  },
  mainTitle: {
    fontSize: 36,
    color: '#1e3653',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '700',
  },
  mainTitleMobile: {
    fontSize: 28,
    marginBottom: 25,
  },
  albumsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 350,
    paddingVertical: 40,
    position: 'relative',
  },
  albumsContainerMobile: {
    minHeight: 250,
    paddingVertical: 20,
  },
  carouselContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CORREÇÃO PRINCIPAL: Novo wrapper para o carrossel
  carouselWrapper: {
    position: 'relative',
    width: '100%',
    height: 350,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumsList: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    paddingVertical: 20,
    position: 'relative',
  },
  albumsListMobile: {
    gap: 15,
    paddingVertical: 10,
  },
  albumsListSingleItem: {
    justifyContent: 'center',
  },
  albumsListTwoItems: {
    justifyContent: 'space-evenly',
    width: '100%',
    paddingHorizontal: 20,
  },
  albumCardContainer: {
    width: 240,
    minWidth: 200,
    maxWidth: '90%',
    borderRadius: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  albumCardContainerMobile: {
    width: '80%',
    minWidth: 0,
    maxWidth: '85%',
  },
  albumCardContainerCenter: {
    shadowColor: '#1e3653',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  albumCard: {
    width: '100%',
    height: 280,
    backgroundColor: '#E0E0E0',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // CORREÇÃO PRINCIPAL: Melhor estilo para as imagens
  albumCardImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  albumCardFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#CCC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumCardFallbackText: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 16,
    fontWeight: 'bold',
  },
  albumCardInfo: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 15,
    width: '100%',
  },
  albumCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3653',
    marginBottom: 5,
    textAlign: 'center',
  },
  albumCardTitleMobile: {
    fontSize: 16,
  },
  albumCardSubtitle: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  albumCardSubtitleMobile: {
    fontSize: 13,
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -25 }],
    zIndex: 10,
    padding: 15,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 50,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navLeft: {
    left: 10,
  },
  navRight: {
    right: 10,
  },
  navButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e3653',
  },
  modalTitle: {
    color: '#1e3653',
    textAlign: 'center',
    fontSize: 26,
    marginBottom: 25,
    fontWeight: '600',
  },
  modalForm: {
    width: '100%',
    alignItems: 'center',
    padding: 15,
  },
  modalInput: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#F9F9F9',
    fontSize: 16,
    color: '#333',
    marginBottom: 18,
    textAlign: 'left',
  },
  modalInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 18,
  },
  modalHelpButton: {
    borderRadius: 8,
    backgroundColor: '#1e3653',
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
    width: 45,
    height: 45,
  },
  modalFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 18,
    paddingHorizontal: 5,
  },
  modalLabel: {
    fontSize: 16,
    color: '#1e3653',
    fontWeight: 'bold',
    marginRight: 10,
  },
  modalLabelFullWidth: {
    fontSize: 16,
    color: '#1e3653',
    fontWeight: 'bold',
    marginBottom: 8,
    alignSelf: 'flex-start',
    paddingLeft: 5,
  },
  modalSelect: {
    flex: 1,
    height: 50,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    color: '#333',
  },
  modalSelectItem: {
    fontSize: 16,
    color: '#333',
  },
  modalButton: {
    width: '80%',
    paddingVertical: 16,
    borderRadius: 8,
    backgroundColor: '#1e3653',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    marginTop: 20,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  modalText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 25,
    lineHeight: 24,
  },
});

export default Home;

