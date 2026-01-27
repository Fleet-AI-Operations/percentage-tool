import { NextRequest, NextResponse } from 'next/server';
import { startBulkAlignment } from '@/lib/analytics';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const jobId = await startBulkAlignment(projectId);

        if (!jobId) {
            return NextResponse.json({ message: 'No records to analyze.' });
        }

        return NextResponse.json({ success: true, jobId });
    } catch (error: any) {
        console.error('Bulk Align API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        const projectId = req.nextUrl.searchParams.get('projectId');

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const jobs = await prisma.analyticsJob.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            take: 5
        });

        return NextResponse.json(jobs);
    } catch (error: any) {
        console.error('Fetch Analytics Jobs Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
