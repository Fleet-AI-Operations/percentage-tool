import Ingestion from '@/components/Ingestion';

export const metadata = {
    title: 'Ingest | Task Data',
    description: 'Upload tasks and feedback.',
};

export default function IngestPage() {
    return (
        <main style={{ padding: '40px 0' }}>
            <Ingestion />
        </main>
    );
}
