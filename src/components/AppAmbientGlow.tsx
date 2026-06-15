export default function AppAmbientGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="absolute -left-32 top-20 h-[28rem] w-[28rem] rounded-full bg-indigo-600/[0.07] blur-3xl" />
      <div className="absolute -right-24 bottom-32 h-80 w-80 rounded-full bg-violet-600/[0.06] blur-3xl" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-600/[0.03] blur-3xl" />
    </div>
  );
}
