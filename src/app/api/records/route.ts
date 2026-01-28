import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findSimilarRecords } from '@/lib/similarity';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const skip = parseInt(searchParams.get('skip') || '0');
    const take = parseInt(searchParams.get('take') || '50');

    try {
        const where: any = {};
        if (projectId) where.projectId = projectId;
        if (type) where.type = type;
        if (category) where.category = category;

        const records = await prisma.dataRecord.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            skip,
            take,
        });

        const total = await prisma.dataRecord.count({ where });

        return NextResponse.json({ records, total });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const { action, targetId, limit, forceRegenerate } = await req.json();

        if (action === 'similarity') {
            if (!targetId) {
                return NextResponse.json({ error: 'Target ID required' }, { status: 400 });
            }

            // 0. Check for existing persisted analysis
            const targetRecord = await prisma.dataRecord.findUnique({
                where: { id: targetId },
                select: { content: true, similarityAnalysis: true }
            });

            if (!targetRecord) {
                return NextResponse.json({ error: 'Target record not found' }, { status: 404 });
            }

            // Return cached results if available and not forced
            if (targetRecord.similarityAnalysis && !forceRegenerate) {
                return NextResponse.json({ results: targetRecord.similarityAnalysis });
            }

            // 1. Run vector search (fetch diverse set of candidates to filter down)
            const initialCandidates = await findSimilarRecords(targetId, (limit || 5) * 2);

            if (initialCandidates.length > 0) {
                let finalResults = initialCandidates.slice(0, limit || 5);

                // 3. Batch generate reasoning and re-ranking using LLM
                try {
                    const { generateCompletion } = await import('@/lib/ai');

                    const prompt = `
                        You are a data analyst comparing semantic similarities. 
                        Users are complaining that matches are too broad. Be CRITICAL.
                        
                        TARGET RECORD:
                        "${targetRecord.content.substring(0, 500)}"

                        CANDIDATE RECORDS:
                        ${initialCandidates.map((r, i) => `${i + 1}. [ID: ${r.record.id}] "${r.record.content.substring(0, 300)}..."`).join('\n')}

                        Task: 
                        1. Rate the meaningful similarity of each candidate to the Target on a scale of 0-100.
                           - 90-100: Almost identical intent and phrasing.
                           - 75-89: Very similar core topic and specifics.
                           - 50-74: Broadly similar topic but different specific details (noise).
                           - < 50: Unrelated or too generic.
                        2. Explain in 10-15 words EXACTLY why it is similar (or why it's weak).

                        Return ONLY a valid JSON object where keys are the IDs and values are objects with "score" and "reason".
                        Example: 
                        { 
                          "id_123": { "score": 92, "reason": "Both discuss pricing specifically for enterprise." }, 
                          "id_456": { "score": 45, "reason": "Broadly about sales but different context." } 
                        }
                    `;

                    const completion = await generateCompletion(prompt);

                    const jsonStr = completion.replace(/```json/g, '').replace(/```/g, '').trim();
                    const aiAnalysis = JSON.parse(jsonStr);

                    // 4. Merge, Filter, and Sort
                    finalResults = initialCandidates
                        .map(r => ({
                            ...r,
                            // Use AI score if available, otherwise 0 to de-prioritize
                            aiScore: aiAnalysis[r.record.id]?.score || 0,
                            reason: aiAnalysis[r.record.id]?.reason || "No analysis provided."
                        }))
                        .filter(r => r.aiScore >= 60) // Critical Filter: Remove broad matches
                        .sort((a, b) => b.aiScore - a.aiScore) // Sort by AI relevance, not just vector
                        .slice(0, limit || 5); // Take top N

                } catch (err) {
                    console.error("Reasoning generation failed:", err);
                    // Fallback to top vector matches if AI fails
                    finalResults = initialCandidates.slice(0, limit || 5);
                }

                // 5. Persist the results
                await prisma.dataRecord.update({
                    where: { id: targetId },
                    data: { similarityAnalysis: finalResults as any }
                });

                return NextResponse.json({ results: finalResults });
            }

            return NextResponse.json({ results: [] });
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
