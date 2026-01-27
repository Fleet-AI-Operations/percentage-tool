import Dashboard from '@/components/Dashboard';

export const metadata = {
  title: 'Task Data | Ingestion & Similarity Analysis',
  description: 'A professional tool for ingesting CSV and API data, filtering it, and analyzing similarity using local LLMs.',
};

export default function Home() {
  return (
    <main>
      <Dashboard />
    </main>
  );
}
