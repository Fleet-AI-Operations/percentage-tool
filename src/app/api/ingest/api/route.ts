import { NextRequest, NextResponse } from 'next/server';
import { startBackgroundIngest } from '@/lib/ingestion';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { url, projectId, type, filterKeywords, generateEmbeddings } = await req.json();

        if (!url || !projectId) {
            return NextResponse.json({ error: 'URL and Project ID are required' }, { status: 400 });
        }

        const jobId = await startBackgroundIngest('API', url, {
            projectId,
            source: `api:${url}`,
            type,
            filterKeywords,
            generateEmbeddings,
        });

        return NextResponse.json({
            message: `Ingestion started in the background.`,
            jobId
        });
    } catch (error: any) {
        console.error('API Ingestion Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
