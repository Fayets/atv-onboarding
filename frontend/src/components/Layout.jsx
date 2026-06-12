const LOGO_URL =
  'https://kjybftumiysvemmvrvde.supabase.co/storage/v1/object/public/content/logowhite.png';

export default function Layout({ title = 'ATV — Onboarding', fullScreen = false, children }) {
  return (
    <>
      <title>{title}</title>
      <div
        className={
          fullScreen
            ? 'w-full h-[100dvh] min-h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden font-sans text-white antialiased [font-feature-settings:\'cv02\',\'cv03\',\'cv04\',\'cv11\']'
            : 'w-full min-h-screen flex items-center justify-center p-3.5 sm:p-6 font-sans text-white antialiased [font-feature-settings:\'cv02\',\'cv03\',\'cv04\',\'cv11\']'
        }
      >
        {children}
      </div>
    </>
  );
}

export { LOGO_URL };
