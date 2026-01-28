
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findSimilarRecords } from '../similarity';
import { prisma } from '../prisma';

// Mock the prisma client
vi.mock('../prisma', () => ({
    prisma: {
        dataRecord: {
            findUnique: vi.fn(),
            findMany: vi.fn(),
        },
    },
}));

// Mock the ai module to avoid actual math/imports if needed, 
// but we can use the real one or mock it. usage of real cosineSimilarity is fine since it's pure math.
// But to isolate, let's mock it to return predictable scores.
vi.mock('../ai', () => ({
    cosineSimilarity: vi.fn((a, b) => {
        // Simple dot product for testing
        return a[0] * b[0];
    }),
}));

describe('findSimilarRecords', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should find similar records filtering by project ID and type, and sorting by score', async () => {
        const targetId = 'target-1';
        const projectId = 'proj-1';
        const targetType = 'TASK';
        const targetEmbedding = [1.0, 0, 0]; // Simulates "1.0" in our mock cosine logic (1*1)

        // Mock findUnique for the target record
        (prisma.dataRecord.findUnique as any).mockResolvedValue({
            id: targetId,
            projectId,
            type: targetType,
            embedding: targetEmbedding,
        });

        // Mock findMany for candidates
        // Candidate A: 0.9 match (mock logic: 0.9 * 1.0)
        // Candidate B: 0.1 match (mock logic: 0.1 * 1.0)
        // Candidate C: 0.5 match (mock logic: 0.5 * 1.0)
        (prisma.dataRecord.findMany as any)
            .mockResolvedValueOnce([
                { id: 'c-a', embedding: [0.9, 0, 0] },
                { id: 'c-b', embedding: [0.1, 0, 0] },
                { id: 'c-c', embedding: [0.5, 0, 0] },
            ])
            // Second findMany for full records
            .mockResolvedValueOnce([
                { id: 'c-a', content: 'Content A', embedding: [0.9] },
                { id: 'c-c', content: 'Content C', embedding: [0.5] },
                // c-b excluded if limit is 2
            ]);

        const results = await findSimilarRecords(targetId, 2);

        // Verify Step 1: findUnique called
        expect(prisma.dataRecord.findUnique).toHaveBeenCalledWith({
            where: { id: targetId },
            select: { id: true, projectId: true, embedding: true, type: true }
        });

        // Verify Step 2: findMany candidates called with correct filters
        expect(prisma.dataRecord.findMany).toHaveBeenNthCalledWith(1, expect.objectContaining({
            where: expect.objectContaining({
                projectId,
                type: targetType,
                id: { not: targetId },
            }),
            select: { id: true, embedding: true }
        }));

        // Verify Step 3: Results sorted and limited
        // Should get A (0.9) then C (0.5). B (0.1) is last. Limit 2.
        expect(results).toHaveLength(2);
        expect(results[0].record.id).toBe('c-a');
        expect(results[0].similarity).toBe(0.9);
        expect(results[1].record.id).toBe('c-c');
        expect(results[1].similarity).toBe(0.5);
    });

    it('should throw if target record has no embedding', async () => {
        (prisma.dataRecord.findUnique as any).mockResolvedValue({
            id: 'target-bad',
            projectId: 'p1',
            embedding: [],
        });

        await expect(findSimilarRecords('target-bad')).rejects.toThrow('Target record not found or has no embedding');
    });
});
