import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const { target } = await req.json();

        if (target === 'ALL_DATA') {
            // Delete all records and reset project analysis
            await prisma.$transaction([
                prisma.dataRecord.deleteMany({}),
                prisma.project.updateMany({
                    data: {
                        lastTaskAnalysis: null,
                        lastFeedbackAnalysis: null
                    }
                })
            ]);
            return NextResponse.json({ message: 'All record data and analytics cleared successfully.' });
        }

        if (target === 'ANALYTICS_ONLY') {
            // Reset project analysis only
            await prisma.project.updateMany({
                data: {
                    lastTaskAnalysis: null,
                    lastFeedbackAnalysis: null
                }
            });
            return NextResponse.json({ message: 'All saved analytics cleared successfully.' });
        }

        return NextResponse.json({ error: 'Invalid clear target' }, { status: 400 });
    } catch (error: any) {
        console.error('Admin Clear API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
