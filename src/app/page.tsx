import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold tracking-tight mb-4">VerifyPH</h1>
      <p className="text-muted-foreground mb-8 text-center max-w-md">
        Civic news application & AI-assisted claim checker.
      </p>
      <div className="flex gap-4">
        <Link 
          href="/feed" 
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          View News Feed
        </Link>
        <Link 
          href="/claim-check" 
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition"
        >
          Check a Claim
        </Link>
      </div>
    </main>
  );
}