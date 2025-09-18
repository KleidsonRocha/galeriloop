import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MdStar, MdStarBorder, MdStarHalf } from "react-icons/md";
import { AiOutlineLeft, AiOutlineRight } from "react-icons/ai";
import { IoMdHelp } from "react-icons/io";
import Header from '../templates/Header';
import Modal from '../templates/Modal';
import Footer from '../templates/Footer';
import './Home.css';

const VITE_API_URL = import.meta.env.VITE_API_URL;

const Home = () => {
  const navigate = useNavigate();
  const [ModalAlbum, setModalAlbum] = useState(false);
  const [ModalHelp, setModalHelp] = useState(false);
  const [ModalConclusion, setModalConclusion] = useState(false);
  const [hoveredAlbum, setHoveredAlbum] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [albumsPhotoCount, setAlbumsPhotoCount] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [favoriteImages, setFavoriteImages] = useState({});
  const favoriteAlbumsRef = useRef([]);
  const location = useLocation();
  const carouselRef = useRef(null);
  const imageCache = useRef(new Map());

  const getImageUrl = (image) => {
    if (!image) return '';

    const cacheKey = `img_${image.id}`;
    if (imageCache.current.has(cacheKey)) {
      return imageCache.current.get(cacheKey);
    }

    // Se não veio binário, retorna placeholder
    if (!image.dados) {
      return 'https://via.placeholder.com/300x200?text=Imagem+Indisponível';
    }

    try {
      // Se já é base64
      if (typeof image.dados === 'string') {
        const url = `data:${image.tipo_mime || 'image/jpeg'};base64,${image.dados}`;
        imageCache.current.set(cacheKey, url);
        return url;
      }

      // Buffer ou array de bytes
      let dataArray;
      if (typeof image.dados === 'object' && image.dados.type === 'Buffer' && Array.isArray(image.dados.data)) {
        dataArray = image.dados.data;
      } else if (Array.isArray(image.dados)) {
        dataArray = image.dados;
      } else if (typeof image.dados === 'object') {
        dataArray = Object.values(image.dados);
      } else {
        console.error('Formato de dados não suportado:', typeof image.dados, image.dados);
        return 'https://via.placeholder.com/300x200?text=Formato+Inválido';
      }

      const blob = new Blob([new Uint8Array(dataArray)], { type: image.tipo_mime || 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      imageCache.current.set(cacheKey, url);
      return url;
    } catch (error) {
      console.error('Erro ao processar dados da imagem:', error);
      return 'https://via.placeholder.com/300x200?text=Erro+de+Processamento';
    }
  };

  useEffect(() => {
    // Limpeza na desmontagem do componente
    return () => {
      for (let url of imageCache.current.values()) {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      }
      imageCache.current.clear();
    };
  }, []);

  useEffect(() => {
    if (location.pathname === '/') {
      setCurrentIndex(0);
    }
  }, [location]);

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
    // Busca em paralelo todas as imagens favoritedas
    await Promise.all(albumsList.map(async (album) => {
      try {
        const res = await fetch(`${VITE_API_URL}/fotos/favoritePhoto/${album.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        favoriteImagesObj[album.id] = data; // pode ser undefined se não tiver imagem favoritada
      } catch (err) {
        // ignora erro para continuar as outras buscas
      }
    }));
    setFavoriteImages(favoriteImagesObj);
  };

  const fetchAlbums = async () => {
    try {
      const response = await fetch(`${VITE_API_URL}/album/getAlbums`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });
      if (!response.ok) {
        throw new Error('Erro ao buscar álbuns');
      }
      const data = await response.json();
      setAlbums(data);
      setCurrentIndex(0);

      // NOVO: Buscar imagens favoritas após carregar álbuns
      await fetchFavoriteImages(data);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const toggleFavorite = async (albumId, favoritado) => {
    try {
      const response = await fetch(`${VITE_API_URL}/album/toggleFavorite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ albumId, favoritado: !favoritado }),
      });

      if (!response.ok) {
        throw new Error('Erro ao modificar álbum favorito');
      }

      setAlbums(prevAlbums =>
        prevAlbums.map(album =>
          album.id === albumId ? { ...album, favoritado: !album.favoritado } : album
        )
      );
    } catch (error) {
      console.error('Erro ao modificar álbum favorito:', error);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    const albumName = event.target.albumName.value;
    const subgroups = event.target.subgroups.value?.split(';').map(subgroup => subgroup.trim()) || [];
    const marca_dagua = event.target.image.files.length > 0 ? event.target.image.files[0] : null;
    const position = event.target.opcao.value !== 'desativado' ? event.target.opcao.value : 'desativado';
    const valorDigital = parseFloat(event.target.valorDigital.value.trim()) || 0;
    const valorFisica = parseFloat(event.target.valorFisica.value.trim()) || 0;

    formData.append('albumName', albumName);
    formData.append('subgroups', subgroups);
    formData.append('position', position);
    formData.append('valorDigital', valorDigital);
    formData.append('valorFisica', valorFisica);
    if (marca_dagua) formData.append('marca_dagua', marca_dagua);

    try {
      const response = await fetch(`${VITE_API_URL}/album/createAlbum`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao criar álbum');
      } else {
        setModalConclusion(true);
        fetchAlbums();
      }
    } catch (error) {
      console.error('Erro ao criar álbum:', error);
      alert('Erro ao criar álbum: ' + error.message);
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

  const getVisibleAlbums = () => {
    const favoriteAlbums = favoriteAlbumsRef.current;
    if (favoriteAlbums.length === 0) return [];

    if (favoriteAlbums.length === 1) {
      return [{
        ...favoriteAlbums[0],
        position: 0
      }];
    }

    if (favoriteAlbums.length === 2) {
      return [
        {
          ...favoriteAlbums[0],
          position: -0.5
        },
        {
          ...favoriteAlbums[1],
          position: 0.5
        }
      ];
    }

    const result = [];
    for (let i = -1; i <= 1; i++) {
      const index = (currentIndex + i + favoriteAlbums.length) % favoriteAlbums.length;
      if (favoriteAlbums.length < 3 && result.some(item => item.id === favoriteAlbums[index].id)) {
        continue;
      }
      result.push({
        ...favoriteAlbums[index],
        position: i
      });
    }
    if (favoriteAlbums.length === 2 && result.length === 2) {
      result[0].position = -0.5;
      result[1].position = 0.5;
    }
    if (favoriteAlbums.length === 1 && result.length === 1) {
      result[0].position = 0;
    }

    return result;
  };

  const getWrapperClass = () => {
    const count = favoriteAlbumsRef.current.length;
    let classes = "albums-list-wrapper";
    if (count === 0) classes += " empty";
    else if (count === 1) classes += " single-item";
    else if (count === 2) classes += " two-items";
    return classes;
  };

  const handleCardClick = (albumId) => {
    navigate(`/album/${albumId}`);
  };

  const getPositionClass = (position) => {
    if (position === -1) return 'left-card';
    if (position === -0.5) return 'left-half-card';
    if (position === 0) return 'center-card';
    if (position === 0.5) return 'right-half-card';
    if (position === 1) return 'right-card';
    return '';
  };

  const fetchAlbumsPhotoCount = async (albumsList) => {
    const counts = {};
    await Promise.all(albumsList.map(async (album) => {
      try {
        const res = await fetch(`${VITE_API_URL}/fotos/getAlbumsPhotos?albumId=${album.id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          }
        });
        if (!res.ok) return;
        const data = await res.json();
        counts[album.id] = Array.isArray(data) ? data.length : (Array.isArray(data.images) ? data.images.length : 0);
      } catch (err) {
        counts[album.id] = 0;
      }
    }));
    setAlbumsPhotoCount(counts);
  };

  return (
    <>
      <Header />
      <aside className="sidebar">
        <div className="sidebar-header">
          <button className="plus-icon" aria-label="Adicionar novo álbum" onClick={() => setModalAlbum(true)}>+</button>
        </div>
        <div className="sidebar-content">
          <section className="album-item">
            <div className="album-header">
              <h2 className="album-title">Álbuns</h2>
            </div>
            <div className="clients-list">
              {albums.map((album) => (
                <div key={album.id} className="client-item">
                  <Link to={`/album/${album.id}`} className="client-name">
                    {album.nome}
                  </Link>
                  <button
                    aria-label="Ver álbuns favoritos"
                    onClick={() => toggleFavorite(album.id, album.favoritado)}
                    onMouseEnter={() => setHoveredAlbum(album.id)}
                    onMouseLeave={() => setHoveredAlbum(null)}
                  >
                    {hoveredAlbum === album.id ? <MdStarHalf /> : album.favoritado ? <MdStar /> : <MdStarBorder />}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>

      <main className="main">
        <h1 className="main-title">
          Álbuns Favoritos
        </h1>

        <section className="albums-container">
          <button
            className="nav-button nav-left"
            aria-label="Navegar para a esquerda"
            onClick={scrollLeft}
            disabled={favoriteAlbumsRef.current.length <= 2}
          >
            <AiOutlineLeft size={24} />
          </button>

          <div className={getWrapperClass()} ref={carouselRef}>
            <div className="albums-list">
              {getVisibleAlbums().map((album) => (
                <article
                  key={album.id}
                  className={`album-card-container ${getPositionClass(album.position)}${favoriteAlbumsRef.current.length === 2 ? ' center-card' : ''}`}
                  onClick={() => handleCardClick(album.id)}
                  data-position={album.position}
                >
                  <div className="album-card">
                    {favoriteImages[album.id] && favoriteImages[album.id].dados ? (
                      <img
                        src={getImageUrl(favoriteImages[album.id])}
                        alt={album.nome}
                        className="album-card-img"
                      />
                    ) : (
                      <div className="album-card-fallback" />
                    )}
                  </div>
                  <div className="album-card-info">
                    <h2 className="album-card-title">{album.nome}</h2>
                    <p className="album-card-subtitle">{albumsPhotoCount[album.id] !== undefined ? `${albumsPhotoCount[album.id]} Fotos` : 'Fotos'}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <button
            className="nav-button nav-right"
            aria-label="Navegar para a direita"
            onClick={scrollRight}
            disabled={favoriteAlbumsRef.current.length <= 2}
          >
            <AiOutlineRight size={24} />
          </button>
        </section>

        <Modal isOpen={ModalAlbum} onClose={() => setModalAlbum(false)}>
          <h3 className='modal-title'>Criar novo Álbum</h3>
          <form onSubmit={handleSubmit} className="modal-form">
            <input type="text" name="albumName" className="modal-input" placeholder="Digite o nome do álbum" required />
            <div className='modal-input-group'>
              <input type="text" name="subgroups" className="modal-input" placeholder="Digite os subgrupos separados por ';'. Ex: Subgrupo1; Subgrupo2" />
              <button onClick={() => setModalHelp(true)} type="button" className="modal-help-button" aria-label="Ajuda"><IoMdHelp /></button>
            </div>
            <div className='modal-marca-dagua'>
              <label htmlFor="opcao" className="modal-label">Posição da marca d'água:</label>
              <select name="opcao" className="modal-select">
                <option value="lateral">Lateral</option>
                <option value="preencher">Preencher</option>
                <option value="desativado">Desativado</option>
              </select>
            </div>
            <input type="file" name="image" className="modal-input" accept="image/*" id="image" />
            <div className='modal-marca-dagua'>
              <label htmlFor="valorDigital" className="modal-label">Valor padrão para foto digital:</label>
              <input type="number" name="valorDigital" id="valorDigital" className="modal-input" step="0.01" min="0" placeholder="0,00" />
            </div>
            <div className='modal-marca-dagua'>
              <label htmlFor="valorFisica" className="modal-label">Valor padrão para foto fisica:</label>
              <input type="number" name="valorFisica" id="valorFisica" className="modal-input" step="0.01" min="0" placeholder="0,00" />
            </div>
            <button type="submit" className="modal-button">Criar</button>
          </form>
        </Modal>
        <Modal isOpen={ModalHelp} onClose={() => setModalHelp(false)}>
          <h3 className='modal-title' >Ajuda</h3>
          <p>Insira os subgrupos separados por ponto e vírgula (;).</p>
          <button onClick={() => setModalHelp(false)} className="modal-button">Fechar</button>
        </Modal>
        <Modal isOpen={ModalConclusion} onClose={() => setModalConclusion(false)}>
          <h3 className='modal-title' >Sucesso</h3>
          <p>Seu album foi criado com sucesso</p>
          <button onClick={() => { setModalConclusion(false); setModalAlbum(false) }} className="modal-button">Fechar</button>
        </Modal>

      </main>
      <Footer />
    </>
  );
};

export default Home;

