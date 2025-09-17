import React, { useEffect, useState } from "react";
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement
} from 'chart.js';
import Header from "../templates/Header";
import Footer from "../templates/Footer";
import { MdDataSaverOff } from "react-icons/md";
import "./settings.css";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement
);

const VITE_API_URL = import.meta.env.VITE_API_URL;

const Settings = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");
  const [tamanhoFotos, setTamanhoFotos] = useState({});
  const [analises, setAnalises] = useState(null);
  const [isLoadingAnalises, setIsLoadingAnalises] = useState(true);
  const [pixChave, setPixChave] = useState("");
  const [pixNome, setPixNome] = useState("");
  const [pixCidade, setPixCidade] = useState("");
  const [pixMsg, setPixMsg] = useState("");
  const handleEmailChange = (e) => setEmail(e.target.value);
  const handleSenhaAtualChange = (e) => setSenhaAtual(e.target.value);
  const handleNovaSenhaChange = (e) => setNovaSenha(e.target.value);
  const handleConfirmarNovaSenhaChange = (e) => setConfirmarNovaSenha(e.target.value);

  useEffect(() => {
    const fetchAnalises = async () => {
      setIsLoadingAnalises(true);
      try {
        const response = await fetch(`${VITE_API_URL}/album/analises`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`
          }
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

    const fetchPix = async () => {
      const response = await fetch(`${VITE_API_URL}/usuarios/pix-config`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        console.log(response, "funfou");
        const { chave_pix, nome_empresa, cidade } = await response.json();
        setPixChave(chave_pix || "");
        setPixNome(nome_empresa || "");
        setPixCidade(cidade || "");
      }
    };
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
      alert("Email é obrigatório");
      return false;
    }
    if (!email.includes("@")) {
      alert("Email inválido");
      return false;
    }
    if (novaSenha !== confirmarNovaSenha) {
      alert("As senhas não coincidem");
      return false;
    }
    return true;
  };

  const HandleSubmit = async (e) => {
    e.preventDefault();
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
      const response = await fetch(`${VITE_API_URL}/usuarios/updateUsuario`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(dadosParaEnviar),
      });

      if (response.ok) {
        alert("Configurações salvas com sucesso");
        setEmail("");
        setSenhaAtual("");
        setNovaSenha("");
        setConfirmarNovaSenha("");
      } else {
        alert("Erro ao salvar configurações");
      }
    } catch (error) {
      console.error("Erro ", error);
      alert("Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  };

  const expiracaoData = analises?.porExpiracao
    ? {
      labels: analises.porExpiracao.map(e => e.data),
      datasets: [
        {
          label: "Links expirando",
          data: analises.porExpiracao.map(e => e.quantidade),
          fill: false,
          borderColor: 'rgba(75,192,192,1)',
          pointRadius: 2,
          pointHitRadius: 12,
          tension: 0.3,
        }
      ]
    }
    : { labels: [], datasets: [] };

  const expiracaoOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          label: context => `Links: ${context.parsed.y}`
        }
      }
    },
    elements: {
      line: { borderWidth: 2 },
      point: { radius: 2 }
    },
    scales: {
      x: {
        ticks: {
          autoSkip: true,
          maxTicksLimit: 4,
          font: { size: 10 }
        }
      },
      y: {
        beginAtZero: true,
        ticks: { font: { size: 10 } }
      }
    }
  };

  const handlePixSubmit = async (e) => {
    console.log("clicou");
    e.preventDefault();
    setPixMsg("");
    const response = await fetch(`${VITE_API_URL}/usuarios/pix-config`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        chave_pix: pixChave,
        nome_empresa: pixNome,
        cidade: pixCidade
      })
    });
    const data = await response.json();
    setPixMsg(data.message || "Erro ao atualizar Pix");
  };

  return (
    <>
      <Header />
      <div className="settings">
        <section className="container-left">
          <div>
            <div className="container-left-header">
              <div className="chart-icon">
                <MdDataSaverOff />
              </div>
              <h2>Gerenciador de Links</h2>
            </div>
            <div className="chart">
              {isLoadingAnalises && <p>Carregando análises...</p>}
              {!isLoadingAnalises && analises && (
                <>
                  <h4>Links por Tipo de Alvo</h4>
                  <Bar
                    data={{
                      labels: analises.porTipoAlvo.map(item => item.tipo_alvo),
                      datasets: [{
                        label: 'Quantidade',
                        data: analises.porTipoAlvo.map(item => item.quantidade),
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                      }]
                    }}
                    options={{ responsive: true }}
                  />
                  <div style={{ width: '100%', minHeight: '160px', maxHeight: '220px', margin: "24px 0 0 0" }}>
                    <h4 style={{ fontSize: '1rem', marginBottom: 6, marginTop: 0 }}>
                      Expiração dos Links
                    </h4>
                    <Line
                      data={expiracaoData}
                      options={expiracaoOptions}
                      height={180}
                    />
                  </div>
                  <h4>Top 10 Alvos mais Compartilhados</h4>
                  <Bar
                    data={{
                      labels: analises.topAlvos.map(e => e.alvo_id),
                      datasets: [{
                        label: "Links",
                        data: analises.topAlvos.map(e => e.quantidade),
                        backgroundColor: 'rgba(255, 206, 86, 0.5)',
                      }]
                    }}
                    options={{ responsive: true }}
                  />
                </>
              )}
              {!isLoadingAnalises && !analises && <p>Erro ao carregar análises.</p>}
            </div>
          </div>
        </section>
        <section className="container-right">
          <div>
            <div className="container-right-header">
              <div className="container-right-form">
                <label className="container-right-form-label">
                  Email Cadastrado:
                </label>
                <input
                  className="container-right-form-input"
                  type="email"
                  placeholder="Digite seu email"
                  value={email}
                  onChange={handleEmailChange}
                />
              </div>
            </div>
            <div className="container-right-password">
              <div className="container-right-form">
                <label className="container-right-form-label">
                  Senha Atual:
                </label>
                <input
                  className="container-right-form-input"
                  type="password"
                  placeholder="Digite sua senha atual"
                  value={senhaAtual}
                  onChange={handleSenhaAtualChange}
                />
              </div>
              <div className="container-right-form">
                <label className="container-right-form-label">
                  Nova Senha:
                </label>
                <input
                  className="container-right-form-input"
                  type="password"
                  placeholder="Digite sua nova senha"
                  value={novaSenha}
                  onChange={handleNovaSenhaChange}
                />
              </div>
              <div className="container-right-form">
                <label className="container-right-form-label">
                  Confirmar Nova Senha:
                </label>
                <input
                  className="container-right-form-input"
                  type="password"
                  placeholder="Confirme sua nova senha"
                  value={confirmarNovaSenha}
                  onChange={handleConfirmarNovaSenhaChange}
                />
              </div>
            </div>
            <div className="container-right-content">
              <button
                className="botao-salvar-settings"
                onClick={HandleSubmit}
              >
                {isLoading ? "Salvando..." : "Salvar"}
              </button>
            </div>
            {/* Bloco de PIX abaixo dos campos de email/senha */}
            <div
              className="pix-config-box"

            >
              <h3 style={{ marginBottom: 16 }}>Dados do Pix</h3>
              <form onSubmit={handlePixSubmit}>
                <div style={{ marginBottom: 12 }}>
                  <label className="container-right-form-label">Chave Pix:</label>
                  <input
                    className="container-right-form-input"
                    value={pixChave}
                    onChange={e => setPixChave(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label className="container-right-form-label">Nome do recebedor:</label>
                  <input
                    className="container-right-form-input"
                    value={pixNome}
                    onChange={e => setPixNome(e.target.value)}
                    required
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label className="container-right-form-label">Cidade:</label>
                  <input
                    className="container-right-form-input"
                    value={pixCidade}
                    onChange={e => setPixCidade(e.target.value)}
                    required
                  />
                </div>
                <div className="container-right-content">

                  <button
                    type="submit"
                    onClick={handlePixSubmit}
                    className="botao-salvar-settings"
                  >
                    Salvar Pix
                  </button>
                </div>
                {pixMsg && (
                  <div style={{
                    marginTop: 12,
                    color: pixMsg.includes("sucesso") ? "green" : "red",
                    fontWeight: 500
                  }}>
                    {pixMsg}
                  </div>
                )}
              </form>
            </div>
          </div>
        </section>
      </div>
      <Footer />
    </>
  );
};

export default Settings;