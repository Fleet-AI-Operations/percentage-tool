import ListView from '@/components/ListView';

export const metadata = {
    title: 'Explore Records | Task Data',
    description: 'View all records for a specific section.',
};

export default function RecordsPage() {
    return (
        <main style={{ padding: '40px 0' }}>
            <ListView />
        </main>
    );
}
