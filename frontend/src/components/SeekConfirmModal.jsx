export default function SeekConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="atv-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seek-modal-title"
    >
      <button
        type="button"
        className="atv-modal-overlay"
        onClick={onCancel}
        aria-label="Cerrar"
      />
      <div
        className="atv-modal-panel max-w-md"
        style={{ animation: 'login-enter 0.35s ease both' }}
      >
        <div className="atv-modal-panel__inner">
          <p className="atv-modal-kicker">Video de bienvenida</p>
          <h2 id="seek-modal-title" className="atv-modal-title mb-4">
            Antes de adelantar
          </h2>
          <p className="text-[15px] leading-relaxed text-[rgba(255,255,255,0.75)] mb-3">
            Es muy importante que veas el video completo. Adelantar puede hacerte perder información clave del onboarding.
          </p>
          <p className="text-[15px] leading-relaxed text-white font-medium mb-7">
            ¿Estás seguro que deseas adelantarlo?
          </p>
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1 py-[0.85rem] px-5 text-[14.5px]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="btn-primary flex-1 py-[0.85rem] px-5 text-[14.5px]"
            >
              Sí, adelantar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
