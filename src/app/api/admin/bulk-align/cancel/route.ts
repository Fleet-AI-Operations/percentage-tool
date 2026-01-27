import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
    try {
        const { jobId } = await req.json();

        if (!jobId) {
            return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
        }

        const job = await prisma.analyticsJob.update({
            where: { id: jobId },
            data: {
                status: 'CANCELLED',
                error: 'Stopped by admin'
            }
        });

        return NextResponse.json({ success: true, status: job.status });
    } catch (error: any) {
        console.error('Cancel Analytics Job Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
