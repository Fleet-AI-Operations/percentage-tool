import { NextRequest, NextResponse } from 'next/server';
import { startBackgroundIngest } from '@/lib/ingestion';
import { RecordType, RecordCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;
        const projectId = formData.get('projectId') as string;
        const type = formData.get('type') as RecordType;
        const filterKeywords = formData.get('filterKeywords')?.toString().split(',').map(s => s.trim()).filter(Boolean);
        const generateEmbeddings = formData.get('generateEmbeddings') === 'true';

        if (!file || !projectId) {
            return NextResponse.json({ error: 'File and Project ID are required' }, { status: 400 });
        }

        const csvContent = await file.text();
        const jobId = await startBackgroundIngest('CSV', csvContent, {
            projectId,
            source: `csv:${file.name}`,
            type,
            filterKeywords,
            generateEmbeddings,
        });

        return NextResponse.json({
            message: `Ingestion started in the background.`,
            jobId
        });
    } catch (error: any) {
        console.error('CSV Ingestion Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
