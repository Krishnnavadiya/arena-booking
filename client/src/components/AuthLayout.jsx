// Centered card layout shared by the Login and Signup pages.
export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-50 via-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-xl font-black text-white">
            S
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg">{children}</div>
        <p className="mt-4 text-center text-xs text-slate-400">Sportomic Arena · Availability Engine</p>
      </div>
    </div>
  );
}
