import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Parse DB Host/Port from connection string (sanitized)
        const dbUrl = process.env.DATABASE_URL || '';
        let dbHost = 'Unknown';
        let dbPort = 'Unknown';

        try {
            // regex to capture host and port: postgres://user:pass@HOST:PORT/db
            const match = dbUrl.match(/@([^:]+):(\d+)\//);
            if (match) {
                dbHost = match[1];
                dbPort = match[2];
            } else if (dbUrl.includes('@')) {
                // Fallback simpler parse
                const parts = dbUrl.split('@')[1].split('/')[0].split(':');
                dbHost = parts[0];
                dbPort = parts[1] || '5432';
            }
        } catch (e) {
            console.error('Failed to parse DB URL', e);
        }

        // Determine AI Provider info
        const isOpenRouter = !!process.env.OPENROUTER_API_KEY;
        const aiProvider = isOpenRouter ? 'OpenRouter' : 'LM Studio (Local)';
        const aiHost = isOpenRouter
            ? (process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1')
            : (process.env.AI_HOST || 'http://localhost:1234/v1').replace('host.docker.internal', 'localhost');

        const llmModel = isOpenRouter
            ? (process.env.OPENROUTER_LLM_MODEL || 'Unknown')
            : (process.env.LLM_MODEL || 'Unknown');

        const embeddingModel = isOpenRouter
            ? (process.env.OPENROUTER_EMBEDDING_MODEL || 'Unknown')
            : (process.env.EMBEDDING_MODEL || 'Unknown');

        return NextResponse.json({
            database: {
                host: dbHost,
                port: dbPort
            },
            ai: {
                provider: aiProvider,
                host: aiHost,
                llmModel,
                embeddingModel
            }
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
