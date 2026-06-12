export default function FormSuccess({ onContinue }) {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center py-10 gap-6">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[rgba(230,57,70,0.12)] border border-[rgba(230,57,70,0.3)]"
        style={{ boxShadow: '0 0 30px rgba(230, 57, 70, 0.2)' }}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="#e63946"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          width="26"
          height="26"
        >
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-[22px] font-bold tracking-[-0.03em] text-white leading-[1.2]">
          ¡Formulario enviado!
        </h2>
        <p className="text-[14px] text-[rgba(255,255,255,0.4)] leading-[1.6] tracking-[-0.01em] max-w-[280px]">
          Ya recibimos tus respuestas. Las vamos a revisar antes de tu primera sesión.
        </p>
      </div>

      <div className="w-full h-[1px] bg-[rgba(255,255,255,0.06)]" />

      <button
        type="button"
        onClick={onContinue}
        className="btn-primary flex items-center justify-center w-full py-[0.85rem] px-6 text-white border-0 rounded-lg text-[15px] font-semibold font-sans tracking-[-0.01em] cursor-pointer"
      >
        Ver próximos pasos →
      </button>
    </div>
  );
}
