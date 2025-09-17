import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import Header from "../templates/Header";
import Footer from "../templates/Footer";
import Modal from "../templates/Modal";
import { QRCodeSVG } from "qrcode.react";
import { gerarPayloadPix } from "../../utils/PixPayload";
import "./SharedAlbum.css";
import { FaTrash, FaLock } from "react-icons/fa";

const VITE_API_URL = import.meta.env.VITE_API_URL;

const SharedAlbum = () => {
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [pixPayload, setPixPayload] = useState("");
  const [pixLoading, setPixLoading] = useState(false);
  const [pixError, setPixError] = useState("");

  const { token } = useParams();
  const [albumData, setAlbumData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const imageCache = useRef(new Map());
  const [cart, setCart] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState(null);
  const [mediaChoiceModal, setMediaChoiceModal] = useState(false);
  const [mediaChoiceFoto, setMediaChoiceFoto] = useState(null);
  const [contactModalOpen, setContactModalOpen] = useState(true);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactInfo, setContactInfo] = useState(null);
  const [contactTouched, setContactTouched] = useState(false);
  const [securityEnabled, setSecurityEnabled] = useState(true);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
const [paymentType, setPaymentType] = useState(null); // 'pix' ou 'presencial'
const [canSendBudget, setCanSendBudget] = useState(true);
const [pixTimer, setPixTimer] = useState(0);
  const imageRefs = useRef({});
  const isValidEmail = (email) => /.+@.+\..+/.test(email);
  const isContactValid =
    contactName.trim().length > 0 && isValidEmail(contactEmail);

  // Função para registrar referências de imagens
  const registerImageRef = useCallback((id, ref) => {
    if (ref && id) {
      imageRefs.current[id] = ref;
    }
  }, []);

  // Função para prevenir o menu de contexto
  const preventContextMenu = useCallback((e) => {
    e.preventDefault();
    return false;
  }, []);

  useEffect(() => {
    const fetchSharedAlbum = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${VITE_API_URL}/fotos/shared/${token}`);
        if (!response.ok) {
          if (response.status === 404)
            throw new Error("Link inválido ou expirado");
          if (response.status === 410) throw new Error("Este link expirou");
          throw new Error("Erro ao carregar o álbum");
        }
        const data = await response.json();
        setAlbumData(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSharedAlbum();
    return () => {
      imageCache.current.forEach((url) => {
        if (url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
      imageCache.current.clear();
    };
  }, [token]);

  // Implementação de segurança para as imagens
  useEffect(() => {
    if (!securityEnabled) return;

    // Prevenir arrastar imagens
    const preventDrag = (e) => {
      e.preventDefault();
      return false;
    };

    // Prevenir atalhos de teclado para salvar/copiar
    const preventKeyboardShortcuts = (e) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === "s" ||
          e.key === "c" ||
          e.key === "p" ||
          e.key === "S" ||
          e.key === "C" ||
          e.key === "P")
      ) {
        e.preventDefault();
        return false;
      }
    };

    // Prevenir print screen (não é 100% efetivo, mas dificulta)
    const preventPrintScreen = () => {
      // Adiciona uma camada temporária sobre as imagens durante a captura
      const overlay = document.createElement("div");
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100%";
      overlay.style.height = "100%";
      overlay.style.backgroundColor = "rgba(255,255,255,0.8)";
      overlay.style.zIndex = "9999";
      overlay.style.display = "flex";
      overlay.style.justifyContent = "center";
      overlay.style.alignItems = "center";
      overlay.innerHTML = "<h1>Captura de tela não permitida</h1>";

      document.body.appendChild(overlay);
      setTimeout(() => {
        document.body.removeChild(overlay);
      }, 500);
    };

    // Desabilitar o DevTools
    const disableDevTools = () => {
      if (window.devtools && window.devtools.isOpen) {
        window.location.href = "about:blank";
      }
    };

    // Aplicar proteções
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("dragstart", preventDrag);
    document.addEventListener("keydown", preventKeyboardShortcuts);
    document.addEventListener("keyup", (e) => {
      if (e.key === "PrintScreen") {
        preventPrintScreen();
      }
    });

    // Verificar DevTools periodicamente
    const devToolsInterval = setInterval(disableDevTools, 1000);

    return () => {
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("dragstart", preventDrag);
      document.removeEventListener("keydown", preventKeyboardShortcuts);
      clearInterval(devToolsInterval);
    };
  }, [securityEnabled, preventContextMenu]);

  // Função para aplicar marca d'água nas imagens
  const applyWatermark = useCallback(
    (imgElement) => {
      if (!imgElement || !contactInfo) return;

      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Configurar canvas com o tamanho da imagem
        canvas.width = imgElement.naturalWidth;
        canvas.height = imgElement.naturalHeight;

        // Desenhar a imagem no canvas
        ctx.drawImage(imgElement, 0, 0);

        // Aplicar marca d'água com o nome do usuário
        ctx.font = `${Math.max(canvas.width * 0.03, 14)}px Arial`;
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Rotacionar e aplicar texto em diagonal
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 6); // Rotação diagonal
        ctx.fillText(
          `${contactInfo.nome} - ${new Date().toLocaleDateString()}`,
          0,
          0
        );
        ctx.restore();

        // Substituir a imagem original pela versão com marca d'água
        const dataURL = canvas.toDataURL("image/jpeg", 0.8);
        imgElement.src = dataURL;
      } catch (error) {
        console.error("Erro ao aplicar marca d'água:", error);
      }
    },
    [contactInfo]
  );

  const handleOpenPaymentModal = () => {
  setPaymentModalOpen(true);
  setPaymentType(null);
};

const handleSelectPayment = (type) => {
  setPaymentType(type);
  setPaymentModalOpen(false);

  if (type === 'pix') {
    setCanSendBudget(false);
    setPixTimer(300); // 5 minutos
    handleShowPix(); // sua função que gera o QR Code Pix
  } else {
    setCanSendBudget(true);
  }
};

  const getImageUrl = (image) => {
    if (!image) return "";
    const cacheKey = `img_${image.id}`;
    if (imageCache.current.has(cacheKey))
      return imageCache.current.get(cacheKey);
    if (!image.dados)
      return "https://via.placeholder.com/300x200?text=Imagem+Indisponível";
    try {
      if (typeof image.dados === "string") {
        const url = `data:${image.tipo_mime || "image/jpeg"};base64,${
          image.dados
        }`;
        imageCache.current.set(cacheKey, url);
        return url;
      }
      let dataArray;
      if (
        typeof image.dados === "object" &&
        image.dados.type === "Buffer" &&
        Array.isArray(image.dados.data)
      ) {
        dataArray = image.dados.data;
      } else if (Array.isArray(image.dados)) {
        dataArray = image.dados;
      } else if (typeof image.dados === "object") {
        dataArray = Object.values(image.dados);
      } else {
        return "https://via.placeholder.com/300x200?text=Formato+Inválido";
      }
      const blob = new Blob([new Uint8Array(dataArray)], {
        type: image.tipo_mime || "image/jpeg",
      });
      const url = URL.createObjectURL(blob);
      imageCache.current.set(cacheKey, url);
      return url;
    } catch {
      return "https://via.placeholder.com/300x200?text=Erro+de+Processamento";
    }
  };

  // handle para adicionar ao carrinho com escolha de mídia
  const handleAddToCart = (foto, tipoMidia = null) => {
    if (foto.fisica && foto.digital && !tipoMidia) {
      setMediaChoiceFoto(foto);
      setMediaChoiceModal(true);
      return;
    }
    // Define o tipo de mídia e preço
    let tipo_midia =
      tipoMidia || (foto.fisica ? "fisica" : foto.digital ? "digital" : null);
    const preco =
      tipo_midia === "fisica"
        ? Number(foto.preco_fisica) || ""
        : tipo_midia === "digital"
        ? Number(foto.preco_digital) || ""
        : "";
    setCart((prev) => {
      const found = prev.find(
        (item) => item.id === foto.id && item.tipo_midia === tipo_midia
      );
      if (found) {
        return prev.map((item) =>
          item.id === foto.id && item.tipo_midia === tipo_midia
            ? { ...item, qty: item.qty + 1 }
            : item
        );
      }
      return [...prev, { ...foto, qty: 1, tipo_midia, preco }];
    });
    setMediaChoiceModal(false);
    setMediaChoiceFoto(null);
  };

  // Remove foto do carrinho
  const handleRemoveFromCart = (fotoId, tipoMidia) => {
    setCart((prev) =>
      prev.filter(
        (item) => !(item.id === fotoId && item.tipo_midia === tipoMidia)
      )
    );
  };

  // Altera quantidade
  const handleChangeQty = (fotoId, tipoMidia, qty) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === fotoId && item.tipo_midia === tipoMidia
          ? { ...item, qty: qty < 1 ? 1 : qty }
          : item
      )
    );
  };

  // Soma total
  const getTotal = () => {
    return cart
      .reduce((sum, item) => sum + item.preco * item.qty, 0)
      .toFixed(2);
  };

  const handleOpenModal = (foto) => {
    setModalImage(foto);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setModalImage(null);
  };

  // Ao confirmar, salva e fecha o modal
  const handleConfirmContact = (e) => {
    e.preventDefault();
    setContactTouched(true);
    if (isContactValid) {
      setContactInfo({ nome: contactName.trim(), email: contactEmail.trim() });
      setContactModalOpen(false);
    }
  };

  const handleSendBudget = async () => {
    if (!contactInfo || !albumData) return;
    try {
      const payload = {
        cliente: {
          nome: contactInfo.nome,
          email: contactInfo.email,
        },
        itens: cart.map((item) => ({
          id: item.id,
          nome: item.nome,
          tipo_midia: item.tipo_midia,
          quantidade: item.qty,
          preco_unitario: item.preco,
        })),
        total: getTotal(),
        albumId: albumData.dados.id,
        subalbumId: albumData.dados.subalbum_id || null,
      };

      const response = await fetch(`${VITE_API_URL}/orcamentos/enviar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Erro ao enviar orçamento");
      }

      // Limpa o carrinho após envio bem sucedido
      setCart([]);
      alert("Orçamento enviado com sucesso!");
    } catch (error) {
      alert("Erro ao enviar orçamento. Por favor, tente novamente.");
      console.error("Erro:", error);
    }
  };

const handleShowPix = async () => {
  console.log("clicou");
  setPixLoading(true);
  setPixError("");
  try {
    // Busca dados Pix do backend (rota protegida)
    const response = await fetch(`${VITE_API_URL}/usuarios/pix-config`, {
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

    if (!response.ok) throw new Error("Erro ao buscar dados Pix");
    const { chave_pix, nome_empresa, cidade } = await response.json();

    const payload = gerarPayloadPix({
      chave: chave_pix,
      nome: nome_empresa,
      cidade: cidade,
      valor: getTotal(),
      descricao: "Galeriloop Pedido",
    });
    setPixPayload(payload);
    setPixModalOpen(true);
  } catch (err) {
    setPixError("Erro ao gerar QR Code Pix");
  } finally {
    setPixLoading(false);
  }
};

  return (
    <div className="shared-album-page">
      <Header />
      <div className="shared-album-content">
        <main className="shared-album-gallery-area">
          {/* Disclaimer */}
          <div className="shared-album-disclaimer">
            <FaLock className="security-icon" /> Os preços podem variar de
            acordo com as necessidades do cliente. Aguarde o contato do
            fotógrafo para saber mais.
          </div>
          <h2 className="shared-album-title">
            {albumData?.tipo === "subalbum" && albumData?.dados?.album_nome
              ? `${albumData.dados.album_nome} - ${albumData.dados.nome}`
              : albumData?.dados?.nome || "Álbum"}
          </h2>
          {loading ? (
            <div className="shared-album-loading">
              <div className="spinner"></div>
              <p>Carregando álbum...</p>
            </div>
          ) : error ? (
            <div className="shared-album-error">
              <h2>Oops! Algo deu errado</h2>
              <p>{error}</p>
            </div>
          ) : (
            <div className="image-grid">
              {albumData?.fotos?.length > 0 ? (
                albumData.fotos.map((foto, index) => (
                  <div
                    key={`${foto.id}-${index}`}
                    className="image-card-shared"
                  >
                    <div
                      className="shared-album-img-wrapper"
                      style={{ position: "relative" }}
                    >
                      <div className="image-protection-overlay">
                        <span className="protection-text">Protegido</span>
                      </div>
                      <img
                        ref={(ref) => registerImageRef(foto.id, ref)}
                        src={getImageUrl(foto)}
                        alt={foto.nome || "Imagem do álbum"}
                        loading="lazy"
                        className="album-image shared-album-img-hover"
                        onClick={() => handleOpenModal(foto)}
                        style={{ cursor: "pointer", userSelect: "none" }}
                        onContextMenu={preventContextMenu}
                        draggable="false"
                        onLoad={(e) =>
                          securityEnabled &&
                          contactInfo &&
                          applyWatermark(e.target)
                        }
                        onError={(e) => {
                          e.target.src =
                            "https://via.placeholder.com/300x200?text=Erro+ao+carregar";
                          e.target.alt = "Erro ao carregar imagem";
                        }}
                      />
                    </div>
                    <div className="image-info">
                      <p className="image-name">{foto.nome}</p>
                      {/* Badge e preço só se tiver fisica ou digital */}
                      {foto.fisica && foto.digital ? (
                        <span className="image-badge">Física e Digital</span>
                      ) : foto.fisica ? (
                        <span className="image-badge physical">Física</span>
                      ) : foto.digital ? (
                        <span className="image-badge digital">Digital</span>
                      ) : null}
                      {/* Preço só se o tipo existir e o preço for válido */}
                      {((foto.fisica &&
                        !foto.digital &&
                        !isNaN(Number(foto.preco_fisica)) &&
                        Number(foto.preco_fisica) > 0) ||
                        (foto.digital &&
                          !foto.fisica &&
                          !isNaN(Number(foto.preco_digital)) &&
                          Number(foto.preco_digital) > 0)) && (
                        <span className="image-price">
                          R${" "}
                          {Number(
                            foto.fisica ? foto.preco_fisica : foto.preco_digital
                          ).toFixed(2)}
                        </span>
                      )}
                      <button
                        className="shared-album-add-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(foto);
                        }}
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="shared-album-empty">
                  <p>Não há fotos disponíveis neste álbum.</p>
                </div>
              )}
            </div>
          )}
        </main>
        <aside className="shared-album-cart">
          <div className="cart-header">
            <span>Carrinho de fotos</span>
          </div>
          <div className="cart-items">
            {cart.length === 0 ? (
              <p className="cart-empty">Seu carrinho está vazio</p>
            ) : (
              cart.map((item) => (
                <div
                  className="cart-item"
                  key={item.id + "-" + item.tipo_midia}
                >
                  <div className="cart-item-img-col">
                    <img
                      src={getImageUrl(item)}
                      alt={item.nome}
                      className="cart-item-img"
                      onContextMenu={preventContextMenu}
                      draggable="false"
                    />
                    {/* Badge só se tiver tipo_midia */}
                    {item.tipo_midia === "fisica" && (
                      <span className="image-badge physical">Física</span>
                    )}
                    {item.tipo_midia === "digital" && (
                      <span className="image-badge digital">Digital</span>
                    )}
                  </div>
                  <div className="cart-item-info-col">
                    <div className="cart-item-header">
                      <span className="cart-item-name">{item.nome}</span>
                      {/* Preço só se tiver tipo_midia e for maior que zero */}
                      {item.tipo_midia &&
                        !isNaN(Number(item.preco)) &&
                        Number(item.preco) > 0 && (
                          <span className="cart-item-price">
                            R$ {(item.preco * item.qty).toFixed(2)}
                          </span>
                        )}
                    </div>
                    <div className="cart-item-qty-row">
                      <div className="cart-item-qty">
                        <button
                          onClick={() =>
                            handleChangeQty(
                              item.id,
                              item.tipo_midia,
                              item.qty - 1
                            )
                          }
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            handleChangeQty(
                              item.id,
                              item.tipo_midia,
                              parseInt(e.target.value) || 1
                            )
                          }
                        />
                        <button
                          onClick={() =>
                            handleChangeQty(
                              item.id,
                              item.tipo_midia,
                              item.qty + 1
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    className="cart-item-remove"
                    onClick={() =>
                      handleRemoveFromCart(item.id, item.tipo_midia)
                    }
                    title="Remover"
                  >
                    <FaTrash />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="cart-footer">
            <div className="cart-total">
              Total: <b>R$ {getTotal()}</b>
            </div>
            <div className="cart-footer">
              <div className="cart-total">
                Total: <b>R$ {getTotal()}</b>
              </div>
              <button
                className="cart-send-btn"
                onClick={handleSendBudget}
                disabled={cart.length === 0}
              >
                Mandar orçamento
              </button>
              <button
                className="cart-pix-btn"
                onClick={handleShowPix}
                disabled={cart.length === 0}
                style={{ marginTop: 8 }}
              >
                Pagar com Pix
              </button>
            </div>
          </div>
        </aside>
      </div>
      {/* Modal de visualização da foto */}
      <Modal isOpen={modalOpen} onClose={handleCloseModal}>
        {modalImage && (
          <div className="shared-album-modal-wrapper">
            <img
              ref={(ref) => registerImageRef(`modal-${modalImage.id}`, ref)}
              src={getImageUrl(modalImage)}
              alt={modalImage.nome || "Foto completa"}
              className="shared-album-modal-img"
              onContextMenu={preventContextMenu}
              draggable="false"
              onLoad={(e) =>
                securityEnabled && contactInfo && applyWatermark(e.target)
              }
            />
            <div className="shared-album-modal-caption">{modalImage.nome}</div>
            <button
              className="shared-album-modal-close-btn"
              onClick={handleCloseModal}
            >
              Fechar
            </button>
          </div>
        )}
      </Modal>
      <Modal
        isOpen={mediaChoiceModal}
        onClose={() => {
          setMediaChoiceModal(false);
          setMediaChoiceFoto(null);
        }}
      >
        {mediaChoiceFoto && (
          <div
            className="media-choice-modal-wrapper"
            style={{ height: "15rem" }}
          >
            <h3>Escolha o tipo de mídia</h3>
            <div className="media-choice-options">
              <button
                className="media-choice-btn"
                onClick={() => handleAddToCart(mediaChoiceFoto, "fisica")}
              >
                Física <br />
                <span className="media-choice-price">
                  R$ {Number(mediaChoiceFoto.preco_fisica || 0).toFixed(2)}
                </span>
              </button>
              <button
                className="media-choice-btn"
                onClick={() => handleAddToCart(mediaChoiceFoto, "digital")}
              >
                Digital <br />
                <span className="media-choice-price">
                  R$ {Number(mediaChoiceFoto.preco_digital || 0).toFixed(2)}
                </span>
              </button>
            </div>
            <button
              className="shared-album-modal-close-btn"
              onClick={() => {
                setMediaChoiceModal(false);
                setMediaChoiceFoto(null);
              }}
            >
              Cancelar
            </button>
          </div>
        )}
      </Modal>
      {/* Modal de contato */}
      <Modal isOpen={contactModalOpen} onClose={() => {}} disableClose={true}>
        <form onSubmit={handleConfirmContact} className="contact-modal-wrapper">
          <h2 className="contact-modal-title">
            Bem-vindo ao Galeriloop,
            <br />
            Por favor informe seus dados de contato
          </h2>
          <div className="contact-modal-inputs">
            <label className="contact-modal-label">Nome:</label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="contact-modal-input"
              autoFocus
            />
            {contactTouched && contactName.trim().length === 0 && (
              <span className="contact-modal-error">Preencha o nome</span>
            )}
            <label className="contact-modal-label">Email:</label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="contact-modal-input"
            />
            {contactTouched && !isValidEmail(contactEmail) && (
              <span className="contact-modal-error">
                Digite um email válido
              </span>
            )}
          </div>
          <button
            type="submit"
            className="contact-modal-btn"
            disabled={!isContactValid}
          >
            Confirmar
          </button>
        </form>
      </Modal>
      <Modal isOpen={pixModalOpen} onClose={() => setPixModalOpen(false)}>
  <div style={{ textAlign: 'center', padding: 24 }}>
    <h2>Pagamento via Pix</h2>
    {pixLoading ? (
      <p>Gerando QR Code...</p>
    ) : pixError ? (
      <p style={{ color: 'red' }}>{pixError}</p>
    ) : pixPayload ? (
  <>
    <QRCodeSVG value={pixPayload} size={220} />
    <p style={{ wordBreak: 'break-all', fontSize: 12, marginTop: 16 }}>
      <b>Copia e Cola:</b><br />
      <span>{pixPayload}</span>
    </p>
  </>
) : null}
    <button className="shared-album-modal-close-btn" onClick={() => setPixModalOpen(false)}>Fechar</button>
  </div>
</Modal>
      <Footer />
    </div>
  );
};

export default SharedAlbum;
