import { prisma } from './prisma';
import { cosineSimilarity } from './ai';

export async function findSimilarRecords(targetId: string, limit: number = 5) {
    const targetRecord = await prisma.dataRecord.findUnique({
        where: { id: targetId },
        select: { id: true, projectId: true, embedding: true, type: true }
    });

    if (!targetRecord || !targetRecord.embedding || targetRecord.embedding.length === 0) {
        throw new Error('Target record not found or has no embedding');
    }

    // 1. Optimization: Scope to the same project
    // 2. Optimization: Fetch ONLY id and embedding to minimize memory usage (avoid loading large 'content' fields)
    // 3. Logic: Only compare matching types (Task <-> Task, Feedback <-> Feedback)
    const candidates = await prisma.dataRecord.findMany({
        where: {
            projectId: targetRecord.projectId,
            type: targetRecord.type,
            id: { not: targetId },
        },
        select: {
            id: true,
            embedding: true
        }
    });

    // Filter valid embeddings and calculate similarity
    const scores = candidates
        .filter(c => c.embedding && c.embedding.length > 0)
        .map(c => ({
            id: c.id,
            score: cosineSimilarity(targetRecord.embedding, c.embedding)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit);

    // 3. Fetch full details only for the top N matches
    const topRecords = await prisma.dataRecord.findMany({
        where: {
            id: { in: scores.map(s => s.id) }
        }
    });

    // Map scores back to the full records (preserving order)
    return scores.map(s => {
        const record = topRecords.find(r => r.id === s.id);
        return {
            record: record!,
            similarity: s.score
        };
    }).filter(item => item.record); // Safety check
}
