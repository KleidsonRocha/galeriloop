import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ImSearch } from "react-icons/im";
import { IoClose } from "react-icons/io5";
import Select from "react-select";
import Header from '../templates/Header';
import Footer from '../templates/Footer';
import Modal from '../templates/Modal';
import './AlbumDetails.css';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const UnavailableImageCard = ({ image }) => (
  <div className="image-card unavailable">
    <div className="placeholder-image">
      <span className="unavailable-icon">⚠️</span>
      <p>Imagem temporariamente indisponível</p>
    </div>
    <div className="image-info">
      <p className="image-name">{image.nome || 'Sem nome'}</p>
      {image.fisica && image.digital ? (
        <span className="image-badge">Física e Digital</span>
      ) : image.fisica ? (
        <span className="image-badge physical">Física</span>
      ) : image.digital ? (
        <span className="image-badge digital">Digital</span>
      ) : null}
    </div>
  </div>
);

const StatusIndicator = ({ isRefreshing }) => {
  return (
    <div className="status-indicator">
      <span className={`status-dot ${isRefreshing ? 'refreshing' : 'idle'}`}></span>
      <span className="status-text">
        {isRefreshing ? 'Atualizando...' : `Atualizado`}
      </span>
    </div>
  );
};

const AlbumDetails = () => {
  const { id } = useParams();
  const [previewImage, setPreviewImage] = useState(null);
  const [album, setAlbum] = useState(null);
  const [subalbuns, setSubalbuns] = useState([]);
  const [subgroupName, setSubgroupName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [ModalAlbum, setModalAlbum] = useState(false);
  const [ModalSubAlbum, setModalSubAlbum] = useState(false);
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
  const [albumLink, setAlbumLink] = useState('');
  const [subalbumLinks, setSubalbumLinks] = useState([]);
  const [linksCopied, setLinksCopied] = useState({});
  const [isGeneratingLinks, setIsGeneratingLinks] = useState(false);
  const [selectedImageSubalbuns, setSelectedImageSubalbuns] = useState([]);
  const [allSubalbumOptions, setAllSubalbumOptions] = useState([]);
  const [deleteAlbumConfirmation, setDeleteAlbumConfirmation] = useState(false);
  const [isDeletingAlbum, setIsDeletingAlbum] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const subalbumOptions = subalbuns.map(subalbum => ({
    value: subalbum.id,
    label: subalbum.nome,
  }));

  const GetImages = async () => {
    try {
      setError(null);

      const response = await fetch(`${VITE_API_URL}/fotos/getAlbumsPhotos?albumId=${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (!response.ok) {
        // Se o status for 404, pode significar que o álbum está vazio ou não existe
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      const data = await response.json();

      // Verifica se o formato da resposta mudou (devido ao Circuit Breaker fallback)
      if (data.message && data.images) {
        console.log('Modo de contingência ativado:', data.message);
        // Exibir uma notificação para o usuário sobre o modo de contingência
        setMessage({
          text: data.message,
          type: 'warning'
        });
        return data.images; // Retorna apenas os metadados
      }

      console.log('Imagens recebidas (quantidade):', data.length);
      return data;
    } catch (error) {
      console.error('Erro ao buscar imagens:', error);
      throw error;
    }
  };

  const refreshImages = async () => {
    if (isRefreshing) return;

    try {
      setIsRefreshing(true);
      setMessage({ text: 'Atualizando imagens...', type: 'info' });

      const data = await GetImages();
      setImages(data);

      setMessage({ text: 'Imagens atualizadas com sucesso!', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
    } catch (err) {
      setError('Falha ao atualizar as imagens. Tente novamente.');
      setMessage({ text: 'Erro ao atualizar imagens', type: 'error' });
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAlbumDetails();

    const fetchImages = async () => {
      try {
        setLoading(true);
        const data = await GetImages();
        console.log('Dados recebidos:', data);
        setImages(data);
        setError(null);
      } catch (err) {
        console.error('Erro ao carregar imagens:', err);
        setError('Não foi possível carregar as imagens. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };

    fetchImages();

  }, [id]);

  useEffect(() => {
    if (subalbuns.length > 0) {
      setSelectedSubalbuns(subalbuns.map(s => s.id));
      const options = subalbuns.map(subalbum => ({
        value: subalbum.id,
        label: subalbum.nome
      }));
      setAllSubalbumOptions(options);
    }
  }, [subalbuns]);

  useEffect(() => {
    return () => {
      images.forEach(image => {
        try {
          const url = getImageUrl(image);
          if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
        } catch (err) {
          console.error('Erro ao limpar URL:', err);
        }
      });

      // Limpar cache de imagens
      imageCache.current.clear();
    };
  }, [images]);


  const fetchAlbumDetails = async () => {
    try {
      const response = await fetch(`${VITE_API_URL}/album/getAlbum/${id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

  const getImageUrl = (image) => {
    if (!image) return '';

    // Verificar cache primeiro
    const cacheKey = `img_${image.id}`;
    if (imageCache.current.has(cacheKey)) {
      return imageCache.current.get(cacheKey);
    }

    // Verifica se estamos no modo de contingência (sem dados binários)
    if (!image.dados) {
      return 'https://via.placeholder.com/300x200?text=Imagem+Indisponível';
    }

    try {
      // Se os dados já estiverem em base64, use diretamente
      if (typeof image.dados === 'string') {
        const url = `data:${image.tipo_mime || 'image/jpeg'};base64,${image.dados}`;
        imageCache.current.set(cacheKey, url);
        return url;
      }

      // Para compatibilidade com o formato anterior
      let dataArray;
      if (Array.isArray(image.dados)) {
        dataArray = image.dados;
      } else if (typeof image.dados === 'object') {
        dataArray = Object.values(image.dados);
      } else {
        console.error('Formato de dados não suportado:', typeof image.dados);
        return 'https://via.placeholder.com/300x200?text=Formato+Inválido';
      }

      // Cria um Blob a partir dos dados binários
      const blob = new Blob([new Uint8Array(dataArray)], { type: image.tipo_mime || 'image/jpeg' });

      // Cria uma URL para o Blob
      const url = URL.createObjectURL(blob);
      imageCache.current.set(cacheKey, url);
      return url;
    } catch (error) {
      console.error('Erro ao processar dados da imagem:', error);
      return 'https://via.placeholder.com/300x200?text=Erro+de+Processamento';
    }
  };

  const handleDeleteAlbum = async () => {
    if (isDeletingAlbum) return;
    
    try {
      setIsDeletingAlbum(true);
      setMessage({ text: 'Excluindo álbum...', type: 'info' });
      
      const response = await fetch(`${VITE_API_URL}/album/deleteAlbum/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (!response.ok) {
        throw new Error('Erro ao excluir o álbum');
      }
      
      setMessage({ text: 'Álbum excluído com sucesso!', type: 'success' });
      
      // Redirecionar para a página de álbuns após a exclusão bem-sucedida
      setTimeout(() => {
        navigate('/home');
      }, 1500);
      
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao excluir o álbum', type: 'error' });
    } finally {
      setIsDeletingAlbum(false);
      setDeleteAlbumConfirmation(false);
    }
  };

  const handleSubmitSubalbum = async (e) => {
    e.preventDefault();

    if (!subgroupName.trim()) {
      setMessage({ text: 'Por favor, insira pelo menos um nome de subálbum', type: 'error' });
      return;
    }

    try {
      const response = await fetch(`${VITE_API_URL}/album/createSubAlbum`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
    formData.append('image', image);
    formData.append('albumId', id);
    formData.append('subalbumIds', JSON.stringify(selectedSubalbuns));
    formData.append('fisica', isFisica);
    formData.append('digital', isDigital);
    formData.append('precoDigital', precoDigital !== null ? precoDigital : (album?.preco_digital_padrao || 0));
    formData.append('precoFisica', precoFisica !== null ? precoFisica : (album?.preco_fisica_padrao || 0));

    try {
      const response = await fetch(`${VITE_API_URL}/fotos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Erro ao enviar a imagem');
      }

      const data = await response.text();
      setMessage({ text: data || 'Imagem enviada com sucesso!', type: 'success' });
      setImage(null);
      setSelectedSubalbuns([]);
      setModalAlbum(false);

      // Recarregar imagens após o upload
      refreshImages();
    } catch (error) {
      console.error('Erro:', error);
      setMessage({ text: 'Erro ao enviar a imagem', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    setImage(file);
    if (file) {
      const previewUrl = URL.createObjectURL(file);
      setPreviewImage(previewUrl);
    } else {
      setPreviewImage(null);
    }
  };

  const handlePreviewClick = () => {
    if (inputRef.current) inputRef.current.click();
  };

  const handleImageClick = (image) => {
    setSelectedImage(image);
    setEditPrecoDigital(image.preco_digital || album?.preco_digital_padrao || 0);
    setEditPrecoFisica(image.preco_fisica || album?.preco_fisica_padrao || 0);
    setEditIsFisica(image.fisica || false);
    setEditIsDigital(image.digital || true);
    
    // Buscar os subálbuns associados a esta imagem
    fetchImageSubalbums(image.id);
    
    setEditModalOpen(true);
  };

  const handleUpdateImage = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    setMessage({ text: 'Atualizando imagem...', type: 'info' });

    try {
      // Extrair apenas os IDs dos subálbuns selecionados
      const subalbumIds = selectedImageSubalbuns.map(option => option.value);
      
      const response = await fetch(`${VITE_API_URL}/fotos/updatePhoto`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          imageId: selectedImage.id,
          fisica: editIsFisica,
          digital: editIsDigital,
          precoDigital: editPrecoDigital,
          precoFisica: editPrecoFisica,
          subalbumIds: subalbumIds // Adicionar os IDs dos subálbuns para atualização
        }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar a imagem');
      }

      setMessage({ text: 'Imagem atualizada com sucesso!', type: 'success' });
      setEditModalOpen(false);
      
      // Recarregar imagens para mostrar as alterações
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
      const response = await fetch(`${VITE_API_URL}/fotos/delete/${selectedImage.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

  const handleFavoriteImage= async () => {
    if (!selectedImage) return; // Nenhuma imagem selecionada
  
    setIsLoading(true);
  
    try {
      const response = await fetch(`${VITE_API_URL}/fotos/favoritePhoto`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ imageId: selectedImage.id })  // Supondo que o objeto tenha "id"
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.message || 'Erro ao favoritar imagem');
      }
  
      alert('Imagem favoritada com sucesso!');
      // Aqui você pode atualizar UI/estado se quiser
    } catch (error) {
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  const fetchImageSubalbums = async (imageId) => {
    try {
      const response = await fetch(`${VITE_API_URL}/fotos/getImageSubalbums/${imageId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Erro ao buscar subálbuns da imagem');
      }

      const data = await response.json();
      
      // Transformar os IDs dos subálbuns em objetos para o Select
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
      // Gerar link para o álbum principal
      const albumResponse = await fetch(`${VITE_API_URL}/album/generateShareLink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
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
      // Adicione um indicador para mostrar se é um link novo ou existente
      setAlbumLink({
        url: albumData.shareLink,
        isNew: albumData.message.includes('Novo'),
        expiresAt: albumData.expiresAt
      });

      // Gerar links para cada subálbum
      if (subalbuns.length > 0) {
        const subalbumLinksArray = [];

        for (const subalbum of subalbuns) {
          const subalbumResponse = await fetch(`${VITE_API_URL}/album/generateShareLink`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
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

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        // Atualiza o estado para mostrar que foi copiado
        setLinksCopied(prev => ({ ...prev, [id]: true }));

        // Reseta o estado após 2 segundos
        setTimeout(() => {
          setLinksCopied(prev => ({ ...prev, [id]: false }));
        }, 2000);
      })
      .catch(err => {
        console.error('Erro ao copiar texto: ', err);
        setMessage({ text: 'Erro ao copiar link', type: 'error' });
      });
  };

  const formatExpirationDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' às ' + date.toLocaleTimeString();
  };

  const filteredImages = images.filter(image =>
    image.nome && image.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <div className="NavControler">
        <div className='NavControlerSearch'>
          <button className='NavControlerButtonSearch'><ImSearch /></button>
          <input
            type="text"
            placeholder="Pesquisar"
            className="search-input"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <button className='NavControlerButtonClear' onClick={() => setSearchTerm('')}><IoClose /></button>
        </div>

        <div className="NavControlerButtons">
        <button onClick={() => setDeleteAlbumConfirmation(true)} className='NavControlerButtonDelete'>Excluir Álbum</button>
          <button onClick={() => setModalAlbum(true)} className='NavControlerButtonAdd'>Adicionar Imagem</button>
          <button onClick={() => setModalSubAlbum(true)} className='NavControlerButtonAdd'>Adicionar SubÁlbum</button>

          <button
            onClick={generateLinks}
            disabled={isGeneratingLinks}
            className='NavControlerButtonShare'
          >
            {isGeneratingLinks ? 'Gerando...' : 'Links de Acesso'}
          </button>
        </div>
      </div>

      <div className="status-container">
        <StatusIndicator isRefreshing={isRefreshing} />
      </div>

      {message.text && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : message.type === 'warning' ? 'alert-warning' : 'alert-danger'}`} role="alert">
          {message.text}
        </div>
      )}

      <div className="AlbumDetailsContainer">
        {loading ? (
          <div className="loading-indicator">Carregando imagens...</div>
        ) : error ? (
          <div className="error-message">{error}</div>
        ) : images.length === 0 ? (
          <div className="empty-message">Não há imagens neste álbum</div>
        ) : (
          <div className="image-grid">
            {filteredImages.map((image, index) => {
              // Verifica se estamos no modo de contingência (sem dados binários)
              if (!image.dados && typeof image.dados !== 'string') {
                return <UnavailableImageCard key={`${image.id}-${index}`} image={image} />;
              }

              return (
                <div key={`${image.id}-${index}`} className="image-card" onClick={() => handleImageClick(image)}>
                  <img
                    src={getImageUrl(image)}
                    alt={image.nome || 'Imagem do álbum'}
                    loading="lazy"
                    className="album-image"
                    onError={(e) => {
                      console.error(`Erro ao carregar imagem ${image.id}:`, e);
                      e.target.src = 'https://via.placeholder.com/300x200?text=Erro+ao+carregar';
                      e.target.alt = 'Erro ao carregar imagem';
                    }}
                  />
                  <div className="image-info">
                    <p className="image-name">{image.nome}</p>
                    {image.fisica && image.digital ? (
                      <span className="image-badge">Física e Digital</span>
                    ) : image.fisica ? (
                      <span className="image-badge physical">Física</span>
                    ) : image.digital ? (
                      <span className="image-badge digital">Digital</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de adicionar subalbum */}
      <Modal isOpen={ModalSubAlbum} onClose={() => setModalSubAlbum(false)}>
        <div className="ModalSubAlbumContainer">
          <h3 className="modal-title">Adicionar Subálbum</h3>
          <form onSubmit={handleSubmitSubalbum} className="ModalSubAlbumForm">
            <div className="ModalSubAlbumField">
              <label htmlFor="subalbumName" className="ModalSubAlbumLabel">
                Nome do Subálbum:
              </label>
              <input
                type="text"
                id="subalbumName"
                value={subgroupName}
                onChange={(e) => setSubgroupName(e.target.value)}
                disabled={isLoading}
                className="ModalSubAlbumInput"
              />
            </div>
            <div className="ModalSubAlbumActions">
              <button
                type="submit"
                className="ModalSubAlbumButton"
                disabled={isLoading}
              >
                Salvar Subálbum
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal de adicionar imagem ao álbum */}
      <Modal isOpen={ModalAlbum} onClose={() => setModalAlbum(false)}>
        <div>
          <h3 className="modal-title">Adicionar Imagem ao Álbum</h3>
          <form onSubmit={(e) => { e.preventDefault(); handleImageUpload() }}>
            <div className="ImageUploadContainer">
              <label htmlFor="imageInput" className="ImageUploadLabel">
                Selecione a Imagem:
              </label>
              <div className="ImageUploadInputWrapper">
                {!previewImage && (
                  <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    disabled={isLoading}
                    onChange={handleImageChange}
                    className="ImageUploadInput"
                    ref={inputRef}
                  />
                )}
              </div>
              {previewImage && (
                <div className="ImageUploadPreviewWrapper">
                  <img
                    src={previewImage}
                    alt="Preview"
                    className="ImageUploadPreview img-thumbnail"
                    onClick={handlePreviewClick}
                    style={{ cursor: 'pointer' }}
                    title="Clique para trocar a imagem"
                  />
                  <input
                    id="imageInput"
                    type="file"
                    accept="image/*"
                    disabled={isLoading}
                    onChange={handleImageChange}
                    className="ImageUploadInput"
                    ref={inputRef}
                    style={{ display: 'none' }}
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                </div>
              )}
            </div>
            <div className="SubalbumSelectorContainer">
              <label className="ImageSubAlbumLabel" htmlFor="subalbumSelect">
                Adicionar aos Subálbuns:
              </label>
              <Select
                className='SubalbumSelector'
                inputId="subalbumSelect"
                classNamePrefix="SubalbumSelector"
                isMulti
                isDisabled={isLoading}
                name="subalbuns"
                options={subalbumOptions}
                value={subalbumOptions.filter(opt => selectedSubalbuns.includes(opt.value))}
                onChange={selectedOptions => setSelectedSubalbuns(selectedOptions.map(opt => opt.value))}
                placeholder="Selecione subálbuns..."
              />
            </div>
            <div className="MediaOptionsContainer">
              <label className="MediaOptionsLabel">Opções de Mídia:</label>
              <div className="MediaOptionsList">
                <div className="MediaOptionItem">
                  <input
                    className="MediaOptionCheckbox"
                    type="checkbox"
                    id="midia-digital"
                    checked={isDigital}
                    onChange={e => setIsDigital(e.target.checked)}
                    disabled={isLoading}
                  />
                  <label className="MediaOptionCheckboxLabel" htmlFor="midia-digital">
                    Mídia Digital
                  </label>

                  {/* Campo de preço que aparece quando Mídia Digital é selecionada */}
                  {isDigital && (
                    <div className="MediaPriceField">
                      <label htmlFor="preco-digital">Preço Digital:</label>
                      <input
                        type="number"
                        id="preco-digital"
                        value={precoDigital !== null ? precoDigital : (album?.preco_digital_padrao || 0)}
                        onChange={e => setPrecoDigital(e.target.value)}
                        disabled={isLoading}
                        className="PriceInput"
                      />
                    </div>
                  )}
                </div>

                <div className="MediaOptionItem">
                  <input
                    className="MediaOptionCheckbox"
                    type="checkbox"
                    id="midia-fisica"
                    checked={isFisica}
                    onChange={e => setIsFisica(e.target.checked)}
                    disabled={isLoading}
                  />
                  <label className="MediaOptionCheckboxLabel" htmlFor="midia-fisica">
                    Mídia Física
                  </label>

                  {/* Campo de preço que aparece quando Mídia Física é selecionada */}
                  {isFisica && (
                    <div className="MediaPriceField">
                      <label htmlFor="preco-fisica">Preço Físico:</label>
                      <input
                        type="number"
                        id="preco-fisica"
                        value={precoFisica !== null ? precoFisica : (album?.preco_fisica_padrao || 0)}
                        onChange={e => setPrecoFisica(e.target.value)}
                        disabled={isLoading}
                        className="PriceInput"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="ModalFormActions">
              <button
                type="button"
                className="ModalFormButton ModalFormButtonCancel"
                onClick={() => setModalAlbum(false)}
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="ModalFormButton ModalFormButtonSubmit"
                disabled={isLoading || !image}
              >
                {isLoading ? 'Enviando...' : 'Enviar Imagem'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal de edição de imagem */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)}>
        <div className="EditImageModalContainer">
          <h3 className="modal-title">Editar Imagem</h3>

          {selectedImage && (
            <>
              <div className="EditImagePreviewContainer">
                <img
                  src={getImageUrl(selectedImage)}
                  alt={selectedImage.nome || 'Imagem do álbum'}
                  className="EditImagePreview"
                />
              </div>

              <div className="EditImageFormContainer">
                <div className="MediaOptionsContainer">
                  <label className="MediaOptionsLabel">Opções de Mídia:</label>
                  <div className="MediaOptionsList">
                    <div className="MediaOptionItem">
                      <input
                        className="MediaOptionCheckbox"
                        type="checkbox"
                        id="edit-midia-digital"
                        checked={editIsDigital}
                        onChange={e => setEditIsDigital(e.target.checked)}
                        disabled={isLoading}
                      />
                      <label className="MediaOptionCheckboxLabel" htmlFor="edit-midia-digital">
                        Mídia Digital
                      </label>

                      {editIsDigital && (
                        <div className="MediaPriceField">
                          <label htmlFor="edit-preco-digital">Preço Digital:</label>
                          <input
                            type="number"
                            id="edit-preco-digital"
                            value={editPrecoDigital}
                            onChange={e => setEditPrecoDigital(e.target.value)}
                            disabled={isLoading}
                            className="PriceInput"
                          />
                        </div>
                      )}
                    </div>

                    <div className="MediaOptionItem">
                      <input
                        className="MediaOptionCheckbox"
                        type="checkbox"
                        id="edit-midia-fisica"
                        checked={editIsFisica}
                        onChange={e => setEditIsFisica(e.target.checked)}
                        disabled={isLoading}
                      />
                      <label className="MediaOptionCheckboxLabel" htmlFor="edit-midia-fisica">
                        Mídia Física
                      </label>

                      {editIsFisica && (
                        <div className="MediaPriceField">
                          <label htmlFor="edit-preco-fisica">Preço Físico:</label>
                          <input
                            type="number"
                            id="edit-preco-fisica"
                            value={editPrecoFisica}
                            onChange={e => setEditPrecoFisica(e.target.value)}
                            disabled={isLoading}
                            className="PriceInput"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Adicionar esta seção de seleção de subálbuns */}
                <div className="SubalbunsSelectionContainer">
                  <label className="SubalbunsSelectionLabel">Subálbuns associados:</label>
                  <Select
                    isMulti
                    name="subalbuns"
                    options={allSubalbumOptions}
                    className="SubalbunsSelect"
                    classNamePrefix="select"
                    value={selectedImageSubalbuns}
                    onChange={setSelectedImageSubalbuns}
                    placeholder="Selecione os subálbuns..."
                    isDisabled={isLoading}
                    noOptionsMessage={() => "Nenhum subálbum disponível"}
                  />
                  <p className="SubalbunsHelpText">
                    Selecione os subálbuns em que esta imagem deve aparecer.
                  </p>
                </div>

                <div className="ModalFormActions">
                  <button
                    type="button"
                    className="ModalFormButton ModalFormButtonSubmit"
                    onClick={handleFavoriteImage}
                    disabled={isLoading || !selectedImage} // Desabilita se estiver carregando ou sem imagem selecionada
                  >
                    Favoritar Imagem
                  </button>

                    <button
                    type="button"
                    className="ModalFormButton ModalFormButtonDelete"
                    onClick={() => setDeleteConfirmation(true)}
                    disabled={isLoading}
                  >
                    Excluir Imagem
                  </button>
                </div>
              
                <div className="ModalFormActions">
                  <button
                    type="button"
                    className="ModalFormButton ModalFormButtonSubmit"
                    onClick={handleUpdateImage}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Modal de confirmação de exclusão */}
      <Modal isOpen={deleteConfirmation} onClose={() => setDeleteConfirmation(false)}>
        <div className="DeleteConfirmationContainer">
          <h3 className="modal-title">Confirmar Exclusão</h3>
          <p>Tem certeza que deseja excluir esta imagem? Esta ação não pode ser desfeita.</p>

          <div className="DeleteConfirmationActions">
            <button
              type="button"
              className="ModalFormButton ModalFormButtonCancel"
              onClick={() => setDeleteConfirmation(false)}
              disabled={isLoading}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="ModalFormButton ModalFormButtonDelete"
              onClick={handleDeleteImage}
              disabled={isLoading}
            >
              {isLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de links de compartilhamento */}
      <Modal className='modalCopartilhar' isOpen={shareLinkModalOpen} onClose={() => setShareLinkModalOpen(false)}>
        <div className="ShareLinksModalContainer">
          <h3 className="modal-title">Links de Acesso ao Álbum</h3>

          <div className="ShareLinksContent">
            {albumLink && (
              <div className={`ShareLinkItem ${albumLink.isNew ? 'new-link' : 'existing-link'}`}>
                <div className="ShareLinkHeader">
                  <h4>Link do Álbum Principal: {album?.nome}</h4>
                  <span className="ShareLinkDescription">
                    Este link dá acesso a todas as fotos do álbum
                    {albumLink.isNew ?
                      <span className="link-status new">Novo link criado</span> :
                      <span className="link-status existing">Link existente recuperado</span>
                    }
                  </span>
                  <div className="ShareLinkExpiration">
                    Expira em: {formatExpirationDate(albumLink.expiresAt)}
                  </div>
                </div>
                <div className="ShareLinkInputGroup">
                  <input
                    type="text"
                    value={albumLink.url}
                    readOnly
                    className="ShareLinkInput"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => copyToClipboard(albumLink.url, 'album')}
                    className={`ShareLinkCopyButton ${linksCopied['album'] ? 'copied' : ''}`}
                  >
                    {linksCopied['album'] ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            {subalbumLinks.length > 0 && (
              <div className="ShareLinkDivider">
                <span>Links de Subálbuns</span>
              </div>
            )}

            {subalbumLinks.map(subalbum => (
              <div
                className={`ShareLinkItem ${subalbum.isNew ? 'new-link' : 'existing-link'}`}
                key={subalbum.id}
              >
                <div className="ShareLinkHeader">
                  <h4>Subálbum: {subalbum.nome}</h4>
                  <span className="ShareLinkDescription">
                    Este link dá acesso apenas às fotos deste subálbum
                    {subalbum.isNew ?
                      <span className="link-status new">Novo link criado</span> :
                      <span className="link-status existing">Link existente recuperado</span>
                    }
                  </span>
                  <div className="ShareLinkExpiration">
                    Expira em: {formatExpirationDate(subalbum.expiresAt)}
                  </div>
                </div>
                <div className="ShareLinkInputGroup">
                  <input
                    type="text"
                    value={subalbum.url}
                    readOnly
                    className="ShareLinkInput"
                    onClick={(e) => e.target.select()}
                  />
                  <button
                    onClick={() => copyToClipboard(subalbum.url, subalbum.id)}
                    className={`ShareLinkCopyButton ${linksCopied[subalbum.id] ? 'copied' : ''}`}
                  >
                    {linksCopied[subalbum.id] ? 'Copiado ✓' : 'Copiar'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="ShareLinksFooter">
            <p className="ShareLinksNote">
              <i className="fas fa-info-circle"></i> Os links expiram após 7 dias da data de criação e podem ser compartilhados com seus clientes para que eles visualizem as fotos sem precisar fazer login.
            </p>
            <button
              onClick={() => setShareLinkModalOpen(false)}
              className="ModalFormButton ModalFormButtonSubmit"
            >
              Fechar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de confirmação de exclusão do álbum */}
      <Modal isOpen={deleteAlbumConfirmation} onClose={() => setDeleteAlbumConfirmation(false)}>
        <div className="DeleteConfirmationContainer">
          <h3 className="modal-title">Confirmar Exclusão do Álbum</h3>
          <p>
            Tem certeza que deseja excluir o álbum <strong>{album?.nome}</strong>? 
            Esta ação excluirá o álbum, todos os seus subálbuns e todas as fotos associadas. 
            Esta ação não pode ser desfeita.
          </p>

          <div className="DeleteConfirmationActions">
            <button
              type="button"
              className="ModalFormButton ModalFormButtonCancel"
              onClick={() => setDeleteAlbumConfirmation(false)}
              disabled={isDeletingAlbum}
            >
              Cancelar
            </button>

            <button
              type="button"
              className="ModalFormButton ModalFormButtonDelete"
              onClick={handleDeleteAlbum}
              disabled={isDeletingAlbum}
            >
              {isDeletingAlbum ? 'Excluindo...' : 'Confirmar Exclusão'}
            </button>
          </div>
        </div>
      </Modal>
      <Footer />
    </>
  );
};

export default AlbumDetails;