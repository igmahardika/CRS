import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <h2 className="text-3xl font-bold text-slate-800 mb-2">404 - Page Not Found</h2>
      <p className="text-sm text-slate-500 mb-6">The requested resource could not be found or has been moved.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-orange-600 text-white rounded-xl text-xs font-semibold hover:bg-orange-700 transition"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}

