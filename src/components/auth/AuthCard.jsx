export default function AuthCard({ children, className = '' }) {
  return (
    <div className={`
      w-full max-w-[420px]
      bg-[rgba(255,255,255,0.03)]
      border border-[rgba(255,255,255,0.08)]
      p-8 rounded-2xl
      ${className}
    `}>
      {children}
    </div>
  );
}
