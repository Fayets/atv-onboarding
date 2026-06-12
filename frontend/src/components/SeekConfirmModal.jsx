export default function SeekConfirmModal({ open, onConfirm, onCancel }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seek-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/75 border-0 cursor-default"
        onClick={onCancel}
        aria-label="Cerrar"
      />
      <div
        className="shell-card relative z-10 w-full max-w-md p-6 sm:p-8"
        style={{ animation: 'panelIn 0.25s ease' }}
      >
        <div className="relative z-[1]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#e63946] mb-3">
            Video de bienvenida
          </p>
          <h2 id="seek-modal-title" className="text-[1.25rem] font-semibold tracking-[-0.02em] text-white mb-4">
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
              className="btn-secondary flex-1 rounded-lg px-5 py-[0.85rem] text-[14.5px] font-sans tracking-[-0.01em] cursor-pointer border"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="btn-primary flex-1 rounded-lg px-5 py-[0.85rem] text-[14.5px] font-semibold font-sans tracking-[-0.01em] cursor-pointer border-0 text-white"
            >
              Sí, adelantar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
