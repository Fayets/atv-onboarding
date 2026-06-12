import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout, { LOGO_URL } from '../components/Layout';
import OnboardingForm from '../components/OnboardingForm';
import SeekConfirmModal from '../components/SeekConfirmModal';
import { STEPS } from '../constants/steps';
import { getSession, joinDiscord, joinSkool } from '../api/client';
import {
  demoUnlock,
  initVideoState,
  initVimeoPlayer,
  isVideoCompleted,
  lockPanels,
  seekVideo,
  setSeekConfirmHandler,
  setVideoSessionId,
  startProgressDrag,
  toggleFullscreen,
  togglePlay,
  unlockPanels,
} from '../utils/videoPlayer';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [videoCompleted, setVideoCompleted] = useState(false);
  const [client, setClient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [skoolLoading, setSkoolLoading] = useState(false);
  const [skoolMessage, setSkoolMessage] = useState('');
  const [discordLoading, setDiscordLoading] = useState(false);
  const [seekModalOpen, setSeekModalOpen] = useState(false);
  const seekConfirmRef = useRef(null);

  const goToStep = useCallback(
    (n) => {
      if (n === currentStep) return;
      if (n >= 4 && !videoCompleted) return;
      setCurrentStep(n);
      if (n === 3) {
        setTimeout(() => {
          initVimeoPlayer(() => setVideoCompleted(true));
        }, 100);
      }
    },
    [currentStep, videoCompleted],
  );

  useEffect(() => {
    if (currentStep !== 3) return undefined;

    const timer = setTimeout(() => {
      initVimeoPlayer(() => setVideoCompleted(true));
    }, 100);

    return () => clearTimeout(timer);
  }, [currentStep]);

  useEffect(() => {
    setSeekConfirmHandler(() => new Promise((resolve) => {
      seekConfirmRef.current = resolve;
      setSeekModalOpen(true);
    }));

    return () => {
      setSeekConfirmHandler(null);
      seekConfirmRef.current = null;
    };
  }, []);

  const handleSeekConfirm = useCallback(() => {
    seekConfirmRef.current?.(true);
    seekConfirmRef.current = null;
    setSeekModalOpen(false);
  }, []);

  const handleSeekCancel = useCallback(() => {
    seekConfirmRef.current?.(false);
    seekConfirmRef.current = null;
    setSeekModalOpen(false);
  }, []);

  useEffect(() => {
    getSession()
      .then((data) => {
        setClient(data);
        setVideoSessionId(data.id);
        initVideoState();

        const completed = isVideoCompleted();
        setVideoCompleted(completed);
        setTimeout(completed ? unlockPanels : lockPanels, 0);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  function handleFullscreenChange() {
    const fullscreenIcon = document.getElementById('fullscreen-icon');
    const exitIcon = document.getElementById('exit-fullscreen-icon');
    if (!fullscreenIcon || !exitIcon) return;
    if (!document.fullscreenElement) {
      fullscreenIcon.style.display = 'block';
      exitIcon.style.display = 'none';
    }
  }

  async function handleJoinSkool() {
    setSkoolLoading(true);
    setSkoolMessage('Enviando invitación...');

    try {
      await joinSkool();
      setClient((prev) => ({ ...prev, skool_used: true }));
      setSkoolMessage('✅ Invitación enviada — revisá tu mail');
    } catch {
      setSkoolMessage('Error, intentá de nuevo');
      setSkoolLoading(false);
    }
  }

  async function handleJoinDiscord() {
    if (!client?.discord_invite_url || client.discord_invite_used) return;

    setDiscordLoading(true);
    window.open(client.discord_invite_url, '_blank', 'noopener,noreferrer');

    try {
      await joinDiscord();
      setClient((prev) => ({ ...prev, discord_invite_used: true }));
    } catch {
      setDiscordLoading(false);
    }
  }

  async function handleFormSubmitted(submittedForm) {
    if (submittedForm) {
      setClient((prev) => ({
        ...prev,
        form_submitted: true,
        form_data: submittedForm,
      }));
      return;
    }

    try {
      const data = await getSession();
      setClient(data);
    } catch {
      setClient((prev) => ({ ...prev, form_submitted: true }));
    }
  }

  function handleDemoUnlock() {
    demoUnlock(() => setVideoCompleted(true));
  }

  if (loading) {
    return (
      <Layout fullScreen>
        <div className="flex flex-1 items-center justify-center text-[rgba(255,255,255,0.4)]">
          Cargando...
        </div>
      </Layout>
    );
  }

  const currentStepData = STEPS[currentStep - 1];

  const stepLocked = (stepId) => stepId >= 4 && !videoCompleted;

  return (
    <Layout fullScreen>
      <div
        id="shell"
        className="shell-card shell-fullscreen flex flex-col md:flex-row w-full min-h-0 flex-1 overflow-hidden"
      >
        <header className="mobile-shell-header md:hidden shrink-0 px-4 py-3 flex items-center justify-between gap-3">
          <img src={LOGO_URL} alt="ATV" width="100" className="h-7 w-auto object-contain" />
          <div className="text-right min-w-0">
            <p className="text-[13px] font-semibold text-white truncate">{currentStepData.label}</p>
            <p className="text-[11px] text-[rgba(255,255,255,0.4)] truncate">{currentStepData.sublabel}</p>
          </div>
        </header>

        <aside className="sidebar hidden md:flex w-72 lg:w-80 shrink-0 px-6 lg:px-8 pt-8 pb-7 flex-col relative z-10 min-h-0 overflow-y-auto">
          <div className="hidden lg:flex gap-[7px] mb-9">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57] opacity-60" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e] opacity-60" />
            <span className="w-3 h-3 rounded-full bg-[#28ca40] opacity-60" />
          </div>

          <div className="flex items-center gap-[9px] mb-8 lg:mb-10">
            <img src={LOGO_URL} alt="LogoATVMain" width="140" className="max-w-[120px] lg:max-w-[140px] h-auto" />
          </div>

          <nav className="flex-1 flex flex-col">
            {STEPS.map((step) => (
              <button
                key={step.id}
                type="button"
                className={`step-item flex items-start gap-[13px] bg-transparent border-0 p-0 text-left w-full ${
                  stepLocked(step.id)
                    ? 'opacity-30 pointer-events-none cursor-not-allowed'
                    : 'cursor-pointer'
                } ${step.id === currentStep ? 'active' : ''} ${step.id < currentStep ? 'done' : ''}`}
                data-step={step.id}
                aria-label={step.label}
                onClick={() => goToStep(step.id)}
              >
                <span className="step-icon-col flex flex-col items-center shrink-0">
                  <span className="step-icon-box w-[34px] h-[34px] rounded-lg border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)] flex items-center justify-center transition-all duration-200">
                    <svg
                      className="step-icon-svg w-4 h-4 text-[rgba(255,255,255,0.2)] transition-colors duration-200"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={step.icon} />
                    </svg>
                  </span>
                  <span className="step-line w-[1.5px] min-h-6 flex-1 bg-[rgba(255,255,255,0.06)] my-[5px]" />
                </span>
                <span className="pb-7">
                  <span className="step-label block text-[14px] font-medium text-[rgba(255,255,255,0.3)] leading-[1.3] tracking-[-0.01em] transition-all duration-200">
                    {step.label}
                  </span>
                  <span className="step-sublabel block text-[12px] text-[rgba(255,255,255,0.18)] mt-[3px] transition-colors duration-200">
                    {step.sublabel}
                  </span>
                </span>
              </button>
            ))}
          </nav>

          <div className="flex justify-center items-center pt-6 border-t border-[rgba(255,255,255,0.06)]">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-[12px] text-[rgba(255,255,255,0.3)] no-underline tracking-[-0.01em] transition-colors duration-150 hover:text-[#e63946] bg-transparent border-0 cursor-pointer"
            >
              ← Volver al inicio
            </button>
          </div>
        </aside>

        <main className="flex-1 relative overflow-hidden z-10 min-h-0 min-w-0">
          <div className="hidden md:block absolute left-0 top-[10%] bottom-[10%] w-[1px] bg-gradient-to-b from-transparent via-[rgba(230,57,70,0.3)] to-transparent pointer-events-none" />

          {/* Panel 1 */}
          <div
            data-panel="1"
            className={`panel absolute inset-0 items-center justify-center panel-padding overflow-y-auto ${currentStep === 1 ? 'active' : ''}`}
          >
            <div className="panel-inner flex flex-col">
              <div className="mb-8">
                <div
                  className="w-10 h-10 rounded-xl bg-[rgba(230,57,70,0.15)] border border-[rgba(230,57,70,0.3)] flex items-center justify-center"
                  style={{ boxShadow: '0 0 20px rgba(230, 57, 70, 0.2)' }}
                >
                  <svg viewBox="0 0 20 20" fill="none" width="16" height="16" stroke="#e63946" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11.5 2.5L3.5 12.5h6.5L8.5 19.5l9-11h-6.5z" />
                  </svg>
                </div>
              </div>
              <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Bienvenido a ATV</h1>
              <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">
                Estás a pocos minutos de comenzar tu transformación estratégica.
              </p>
              <div className="accent-block px-[1.6rem] py-[1.4rem] mb-8 flex flex-col gap-[0.9rem] text-[14px] text-[rgba(255,255,255,0.6)] leading-[1.75] tracking-[-0.01em]">
                <p>En ATV Consultoría acompañamos a empresas y emprendedores a construir negocios sólidos, rentables y escalables. Este onboarding fue diseñado para que conozcas todo lo que necesitás antes de nuestra primera sesión.</p>
                <p>Tomáte unos minutos para recorrer cada sección. Al final vas a tener acceso a todos los recursos y sabrás exactamente qué viene después.</p>
              </div>
              <button type="button" className="btn-primary flex items-center justify-center w-full py-[0.85rem] px-6 text-white border-0 rounded-lg text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer" onClick={() => goToStep(2)}>
                Comenzar
              </button>
            </div>
          </div>

          {/* Panel 2 */}
          <div data-panel="2" className={`panel absolute inset-0 items-center justify-center panel-padding overflow-y-auto ${currentStep === 2 ? 'active' : ''}`}>
            <div className="panel-inner flex flex-col">
              <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Cómo trabajamos</h1>
              <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">Un proceso claro, estructurado y orientado a resultados.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
                {[
                  ['01', 'Diagnóstico', 'Analizamos tu negocio en profundidad: contexto, objetivos, fortalezas y oportunidades de mejora.'],
                  ['02', 'Estrategia', 'Diseñamos un plan personalizado con metas claras, prioridades y métricas de seguimiento.'],
                  ['03', 'Ejecución', 'Implementamos junto a vos, con reuniones periódicas, ajustes en tiempo real y soporte continuo.'],
                  ['04', 'Resultados', 'Medimos el impacto, celebramos los logros y definimos los próximos horizontes de crecimiento.'],
                ].map(([num, title, desc]) => (
                  <div key={num} className="glass-card px-[1.3rem] py-[1.4rem] flex flex-col">
                    <span className="card-step-num text-[22px] font-extrabold tracking-[-0.04em] mb-[0.65rem] tabular-nums">{num}</span>
                    <strong className="block text-[13.5px] font-semibold tracking-[-0.02em] text-white mb-[0.4rem]">{title}</strong>
                    <p className="text-[12.5px] text-[rgba(255,255,255,0.4)] leading-[1.65]">{desc}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-[10px] items-stretch mt-7">
                <button type="button" className="btn-secondary flex items-center rounded-lg px-5 py-[0.8rem] text-[14.5px] font-sans tracking-[-0.01em] cursor-pointer whitespace-nowrap border-0" onClick={() => goToStep(1)}>← Anterior</button>
                <button type="button" className="btn-primary flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white" onClick={() => goToStep(3)}>Siguiente</button>
              </div>
            </div>
          </div>

          {/* Panel 3 - Video */}
          <div data-panel="3" className={`panel absolute inset-0 items-center justify-center panel-padding overflow-y-auto ${currentStep === 3 ? 'active' : ''}`}>
            <div className="panel-inner flex flex-col">
              <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Video de bienvenida</h1>
              <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">Un mensaje personal antes de arrancar.</p>
              <button type="button" onClick={handleDemoUnlock} className="hidden">Desbloquear paneles</button>
              <div className="relative w-full aspect-video rounded-[10px] overflow-hidden mb-7 glass-card border z-0" style={{ boxShadow: '0 0 30px rgba(230, 57, 70, 0.08)' }}>
                <iframe
                  id="vimeo-player"
                  src="https://player.vimeo.com/video/1196387899?badge=0&autopause=0&player_id=0&app_id=58479&title=0&byline=0&portrait=0&controls=0"
                  style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
                  frameBorder="0"
                  allow="autoplay; fullscreen; picture-in-picture"
                  allowFullScreen
                  title="Video de bienvenida"
                />
                <div
                  id="play-overlay"
                  className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
                  onClick={togglePlay}
                  onKeyDown={(e) => e.key === 'Enter' && togglePlay()}
                  role="button"
                  tabIndex={0}
                  aria-label="Reproducir video"
                  style={{ transition: 'opacity 0.3s' }}
                >
                  <div className="w-[64px] h-[64px] rounded-full btn-primary flex items-center justify-center" style={{ boxShadow: '0 0 30px rgba(230, 57, 70, 0.4)' }}>
                    <svg viewBox="0 0 24 24" fill="currentColor" width="26" height="26"><path d="M8 5v14l11-7z" /></svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 z-20 px-4 py-3 flex flex-col gap-2" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>
                  <div
                    id="progress-track"
                    className="video-progress-track w-full py-3 cursor-pointer"
                    onMouseDown={startProgressDrag}
                    onTouchStart={startProgressDrag}
                    onKeyDown={(e) => e.key === 'Enter' && seekVideo(e)}
                    role="slider"
                    tabIndex={0}
                    aria-label="Barra de progreso del video"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={0}
                  >
                    <div id="progress-rail" className="relative h-1 rounded-full bg-[rgba(255,255,255,0.15)]">
                      <div
                        id="progress-bar"
                        className="absolute inset-y-0 left-0 rounded-full bg-[#e63946]"
                        style={{ width: '0%' }}
                      />
                      <div
                        id="progress-thumb"
                        className="video-progress-thumb"
                        style={{ left: '0%' }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={togglePlay} className="bg-transparent border-0 cursor-pointer text-white p-0 flex items-center justify-center">
                      <svg id="play-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M8 5v14l11-7z" /></svg>
                      <svg id="pause-icon" viewBox="0 0 24 24" fill="currentColor" width="20" height="20" style={{ display: 'none' }}><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    </button>
                    <span id="progress-time" className="text-[12px] text-[rgba(255,255,255,0.6)]">00:00 / 35:05</span>
                    <button type="button" id="fullscreen-btn" onClick={toggleFullscreen} className="text-[12px] cursor-pointer duration-200 hover:opacity-70 ml-auto text-[rgba(255,255,255,0.6)] bg-transparent border-0">
                      <svg id="fullscreen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      <svg id="exit-fullscreen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="18" height="18" style={{ display: 'none' }}><path d="M8 3v3a2 2 0 01-2 2H3m18 0h-3a2 2 0 01-2-2V3m0 18v-3a2 2 0 012-2h3M3 16h3a2 2 0 012 2v3" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                  </div>
                </div>
              </div>
              <div className="flex gap-[10px] items-stretch mt-7">
                <button type="button" className="btn-secondary flex items-center rounded-lg px-5 py-[0.8rem] text-[14.5px] font-sans tracking-[-0.01em] cursor-pointer whitespace-nowrap border-0" onClick={() => goToStep(2)}>← Anterior</button>
                <button
                  type="button"
                  id="btn-siguiente-video"
                  disabled={!videoCompleted}
                  onClick={() => goToStep(4)}
                  className={`btn-primary cursor-pointer flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] border-0 text-white ${!videoCompleted ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  {videoCompleted ? 'Siguiente →' : 'Siguiente — Completá el video primero'}
                </button>
              </div>
            </div>
          </div>

          {/* Panel 4 - Recursos */}
          <div data-panel="4" className={`panel absolute inset-0 items-center justify-center panel-padding overflow-y-auto ${currentStep === 4 ? 'active' : ''}`}>
            <div className="panel-inner flex flex-col">
              <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">Tus recursos</h1>
              <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">Dos plataformas, una comunidad.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-7">
                <div className={`glass-card px-[1.35rem] py-6 flex flex-col gap-[11px] ${client?.discord_invite_used ? 'opacity-30 cursor-default' : 'opacity-100'}`}>
                  <div className="w-11 h-11 rounded-[10px] flex items-center justify-center bg-[rgba(88,101,242,0.15)] border border-[rgba(88,101,242,0.25)]">
                    <svg viewBox="0 0 24 24" fill="#5865f2" width="20" height="20"><path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z" /></svg>
                  </div>
                  <h3 className="text-[14.5px] font-semibold tracking-[-0.02em] text-white">Discord</h3>
                  <p className="text-[13px] text-[rgba(255,255,255,0.4)] leading-[1.65] flex-1">Comunidad en tiempo real. Hacé preguntas, compartí avances y conectá con otros clientes.</p>
                  {!client?.discord_invite_used && client?.discord_invite_url ? (
                    <button
                      type="button"
                      disabled={discordLoading}
                      onClick={handleJoinDiscord}
                      className="text-[13px] disabled:cursor-not-allowed cursor-pointer font-medium text-[#e63946] no-underline tracking-[-0.01em] transition-opacity duration-150 hover:opacity-70 bg-transparent border-0 p-0 text-left"
                    >
                      Unirme al servidor →
                    </button>
                  ) : client?.discord_invite_used ? (
                    <span className="text-[13px] text-[rgba(255,255,255,0.4)] leading-[1.65] flex-1">
                      Ya te uniste al servidor ✓
                    </span>
                  ) : (
                    <span className="text-[13px] text-[rgba(255,255,255,0.3)]">Link de Discord no configurado</span>
                  )}
                </div>
                <div className={`glass-card justify-start items-start px-[1.35rem] py-6 flex flex-col gap-[11px] ${client?.skool_used ? 'opacity-30 cursor-default' : 'opacity-100'}`}>
                  <div className="w-11 h-11 rounded-[10px] flex items-center justify-center bg-[rgba(230,57,70,0.12)] border border-[rgba(230,57,70,0.25)]">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="1.75" width="20" height="20">
                      <path d="M12 14l9-5-9-5-9 5 9 5z" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <h3 className="text-[14.5px] font-semibold tracking-[-0.02em] text-white">Skool</h3>
                  <p className="text-[13px] text-[rgba(255,255,255,0.4)] leading-[1.65] flex-1">Accedé a todos los materiales del programa: módulos, recursos descargables y grabaciones.</p>
                  {!client?.skool_used ? (
                    <button
                      id="join-skool-btn"
                      type="button"
                      disabled={skoolLoading}
                      onClick={handleJoinSkool}
                      className="text-[13px] disabled:cursor-not-allowed cursor-pointer font-medium text-[#e63946] no-underline tracking-[-0.01em] transition-opacity duration-150 hover:opacity-70 bg-transparent border-0 p-0 text-left"
                    >
                      {skoolMessage || 'Enviar invitación →'}
                    </button>
                  ) : (
                    <span className="text-[13px] text-[rgba(255,255,255,0.4)] leading-[1.65] flex-1">
                      Tu invitación <strong>ya ha sido enviada.</strong>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-[10px] items-stretch mt-7">
                <button type="button" className="btn-secondary flex items-center rounded-lg px-5 py-[0.8rem] text-[14.5px] font-sans tracking-[-0.01em] cursor-pointer whitespace-nowrap border-0" onClick={() => goToStep(3)}>← Anterior</button>
                <button type="button" className="btn-primary flex flex-1 items-center justify-center rounded-lg px-6 py-[0.85rem] text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white" onClick={() => goToStep(5)}>Siguiente</button>
              </div>
            </div>
          </div>

          {/* Panel 5 - Formulario */}
          <div data-panel="5" className={`panel absolute inset-0 items-start justify-center panel-padding overflow-y-auto ${currentStep === 5 ? 'active' : ''}`}>
            <div className="panel-inner-wide flex flex-col">
              <OnboardingForm
                readOnly={Boolean(client?.form_submitted)}
                initialData={client?.form_data}
                onSubmitted={handleFormSubmitted}
                onPrevious={() => goToStep(4)}
                onContinue={() => goToStep(6)}
              />
            </div>
          </div>

          {/* Panel 6 - Éxito */}
          <div data-panel="6" className={`panel absolute inset-0 items-center justify-center panel-padding overflow-y-auto ${currentStep === 6 ? 'active' : ''}`}>
            <div className="panel-inner flex flex-col items-center text-center">
              <div className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center mb-7 bg-[rgba(230,57,70,0.12)] border border-[rgba(230,57,70,0.3)]" style={{ boxShadow: '0 0 30px rgba(230, 57, 70, 0.2)' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="1.5" width="26" height="26">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.03em] text-white mb-[0.6rem] leading-[1.2]">¡Todo listo!</h1>
              <p className="text-[15px] text-[rgba(255,255,255,0.45)] mb-9 leading-[1.55] tracking-[-0.01em]">Ya tenés todo lo que necesitás para empezar. Ahora viene lo importante.</p>
              <div className="flex flex-col gap-5 w-full max-w-[380px] mb-8 text-left">
                {[
                  ['Uníte a Discord y presentáte', 'Decile al grupo quién sos y qué querés lograr.'],
                  ['Explorá Skool', 'Revisá los materiales del módulo 1 antes de nuestra primera sesión.'],
                  ['Agendá tu primera sesión', 'Coordinamos fecha y horario por Discord o por mail.'],
                ].map(([title, desc], i) => (
                  <div key={title} className="flex items-start gap-[14px]">
                    <span className="step-badge w-[26px] h-[26px] rounded-[7px] text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-[1px]">{i + 1}</span>
                    <div>
                      <p className="text-[14px] font-semibold tracking-[-0.02em] text-white mb-[3px]">{title}</p>
                      <p className="text-[13px] text-[rgba(255,255,255,0.4)] leading-[1.55]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="btn-primary flex items-center justify-center w-full py-[0.85rem] px-6 text-white border-0 rounded-lg text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer" onClick={() => goToStep(1)}>Volver al inicio</button>
            </div>
          </div>

          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 flex gap-[5px] items-center px-4 max-w-full overflow-x-auto">
            {STEPS.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`dot w-8 h-1 rounded-full border-0 cursor-pointer p-0 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${currentStep === s.id ? 'active' : ''}`}
                data-dot={s.id}
                onClick={() => goToStep(s.id)}
                aria-label={`Ir a ${s.label}`}
              />
            ))}
          </div>
        </main>
      </div>
      <SeekConfirmModal
        open={seekModalOpen}
        onConfirm={handleSeekConfirm}
        onCancel={handleSeekCancel}
      />
    </Layout>
  );
}
