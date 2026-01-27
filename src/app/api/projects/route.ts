import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const projects = await prisma.project.findMany({
            orderBy: { name: 'asc' },
        });
        return NextResponse.json(projects);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { name } = await req.json();
        const project = await prisma.project.create({
            data: { name },
        });
        return NextResponse.json(project);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        await prisma.project.delete({
            where: { id },
        });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const { id, guidelines, guidelinesFileName } = await req.json();
        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const project = await prisma.project.update({
            where: { id },
            data: {
                guidelines,
                guidelinesFileName
            },
        });
        return NextResponse.json(project);
    } catch (error: any) {
        console.error('Project PATCH Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
