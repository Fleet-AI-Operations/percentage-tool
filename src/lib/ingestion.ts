/**
 * Ingestion Hub - Flexible data ingestion system for CSV/API sources
 * 
 * Key Features:
 * - Multi-column content detection (feedback, prompt, text, etc.)
 * - Flexible rating detection (top_10, Top 10%, numerical scores, etc.)
 * - Type-aware duplicate prevention (TASK vs FEEDBACK)
 * - Parallel processing with chunking for large datasets
 */
import { parse } from 'csv-parse/sync';
import { prisma } from './prisma';
import { getEmbeddings } from './ai';
import { RecordType, RecordCategory } from '@prisma/client';

export interface IngestOptions {
    projectId: string;
    source: string;
    type: RecordType;
    filterKeywords?: string[];
    generateEmbeddings?: boolean;
}

const payloadCache: Record<string, { type: 'CSV' | 'API', payload: string, options: IngestOptions }> = {};

/**
 * ENTRY POINT: startBackgroundIngest
 */
export async function startBackgroundIngest(type: 'CSV' | 'API', payload: string, options: IngestOptions) {
    const job = await prisma.ingestJob.create({
        data: {
            projectId: options.projectId,
            type: options.type,
            status: 'PENDING',
        }
    });

    payloadCache[job.id] = { type, payload, options };
    processJobs(options.projectId).catch(err => console.error('Queue Processor Error:', err));
    return job.id;
}

/**
 * QUEUE PROCESSOR: processJobs
 * Manages Phase 1 (Data Loading). This phase can run in parallel with Phase 2 (Vectorizing).
 * However, we still only allow one PROCESSING job per project to ensure DB write order.
 */
async function processJobs(projectId: string) {
    const activeProcessing = await prisma.ingestJob.findFirst({
        where: { projectId, status: 'PROCESSING' }
    });

    if (activeProcessing) {
        if (!payloadCache[activeProcessing.id]) {
            await prisma.ingestJob.update({
                where: { id: activeProcessing.id },
                data: { status: 'FAILED', error: 'Job interrupted by server restart.' }
            });
        } else {
            return; // Wait for the active data load to finish
        }
    }

    const nextJob = await prisma.ingestJob.findFirst({
        where: { projectId, status: 'PENDING' },
        orderBy: { createdAt: 'asc' }
    });

    if (!nextJob) return;

    const cache = payloadCache[nextJob.id];
    if (!cache) {
        await prisma.ingestJob.update({
            where: { id: nextJob.id },
            data: { status: 'FAILED', error: 'Job payload lost.' }
        });
        processJobs(projectId);
        return;
    }

    try {
        await prisma.ingestJob.update({
            where: { id: nextJob.id },
            data: { status: 'PROCESSING' }
        });

        let records: any[] = [];
        if (cache.type === 'CSV') {
            records = parse(cache.payload, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true
            });
        } else {
            const response = await fetch(cache.payload);
            const data = await response.json();
            records = Array.isArray(data) ? data : [data];
        }

        await processAndStore(records, cache.options, nextJob.id);

        // Phase 2: Vectorization (Optional)
        if (cache.options.generateEmbeddings) {
            await prisma.ingestJob.update({
                where: { id: nextJob.id },
                data: { status: 'VECTORIZING' }
            });
            await vectorizeJob(nextJob.id, projectId);
        }

        await prisma.ingestJob.update({
            where: { id: nextJob.id },
            data: { status: 'COMPLETED' }
        });

        delete payloadCache[nextJob.id];
        processJobs(projectId);

    } catch (error: any) {
        await prisma.ingestJob.update({
            where: { id: nextJob.id },
            data: { status: 'FAILED', error: error.message }
        });
        delete payloadCache[nextJob.id];
        processJobs(projectId);
    }
}

/**
 * Phase 2: Vectorization
 * Iterates through records in the project that lack embeddings and generates them using the active AI provider.
 *
 * Key improvements:
 * - Progress tracking: Updates job.totalRecords and job.savedCount for UI visibility
 * - Batch transactions: Uses prisma.$transaction for efficient bulk updates
 * - Infinite loop prevention: Tracks failed record IDs to exclude from subsequent queries
 * - Error handling: Wraps AI calls in try/catch with retry logic
 */
async function vectorizeJob(jobId: string, projectId: string) {
    const RECORDS_BATCH_SIZE = 50;
    const MAX_CONSECUTIVE_FAILURES = 3;

    // Track IDs that fail to vectorize to prevent infinite loops
    const failedRecordIds = new Set<string>();

    // Count total records needing embeddings for progress tracking
    const totalNeedingEmbeddings = await prisma.dataRecord.count({
        where: {
            projectId,
            embedding: { equals: [] }
        }
    });

    // Update job with total count for UI progress bar
    await prisma.ingestJob.update({
        where: { id: jobId },
        data: {
            totalRecords: totalNeedingEmbeddings,
            savedCount: 0  // Reset for vectorization phase
        }
    });

    let processedCount = 0;
    let consecutiveFailures = 0;

    while (true) {
        // Check for cancellation
        const job = await prisma.ingestJob.findUnique({ where: { id: jobId }, select: { status: true } });
        if (job?.status === 'CANCELLED') break;

        // Fetch records that still need embeddings, excluding known failures
        const batch = await prisma.dataRecord.findMany({
            where: {
                projectId,
                embedding: { equals: [] },
                ...(failedRecordIds.size > 0 ? { id: { notIn: Array.from(failedRecordIds) } } : {})
            },
            take: RECORDS_BATCH_SIZE,
            orderBy: { id: 'asc' }
        });

        if (batch.length === 0) break;

        // Generate embeddings with error handling
        let embeddings: number[][];
        try {
            const contents = batch.map(r => r.content);
            embeddings = await getEmbeddings(contents);
        } catch (error) {
            consecutiveFailures++;
            console.error(`Vectorization API error (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}):`, error);

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                await prisma.ingestJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'FAILED',
                        error: `Embedding API error: ${error instanceof Error ? error.message : 'Unknown error'}. Check AI provider connection.`
                    }
                });
                return;
            }

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
        }

        // Check if embedding generation completely failed (all empty)
        const allFailed = embeddings.every(e => !e || e.length === 0);
        if (allFailed) {
            consecutiveFailures++;
            console.error(`Vectorization batch returned empty (attempt ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES})`);

            if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                await prisma.ingestJob.update({
                    where: { id: jobId },
                    data: {
                        status: 'FAILED',
                        error: `Embedding generation failed after ${MAX_CONSECUTIVE_FAILURES} consecutive attempts. Check AI provider connection.`
                    }
                });
                return;
            }

            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
        }

        // Reset consecutive failures on any success
        consecutiveFailures = 0;

        // Prepare batch updates - collect successful embeddings
        const updates: { id: string; embedding: number[] }[] = [];
        for (let i = 0; i < batch.length; i++) {
            const vector = embeddings[i];
            if (vector && vector.length > 0) {
                updates.push({ id: batch[i].id, embedding: vector });
            } else {
                // Track failed records to skip in future batches (prevents infinite loop)
                failedRecordIds.add(batch[i].id);
            }
        }

        // Batch update using transaction for performance (avoids N+1 problem)
        if (updates.length > 0) {
            await prisma.$transaction(
                updates.map(u =>
                    prisma.dataRecord.update({
                        where: { id: u.id },
                        data: { embedding: u.embedding }
                    })
                )
            );
        }

        processedCount += updates.length;

        // Update progress for UI polling (Nielsen heuristic: visibility of system status)
        await prisma.ingestJob.update({
            where: { id: jobId },
            data: { savedCount: processedCount }
        });
    }

    // Log if any records permanently failed
    if (failedRecordIds.size > 0) {
        console.warn(`Vectorization completed with ${failedRecordIds.size} records that could not be embedded.`);
    }
}

/**
 * Phase 1: Data Loading
 * Parses records, filters by content/keywords, detects categories, and prevents duplicates.
 * 
 * New Feature: Detailed Skip Tracking
 * - Tracks 'Keyword Mismatch' (filtered out by user keywords)
 * - Tracks 'Duplicate ID' (existing Task ID or Feedback ID in project)
 * - Updates `IngestJob.skippedDetails` JSON for UI visibility.
 */
export async function processAndStore(records: any[], options: IngestOptions, jobId: string) {
    const { projectId, source, type, filterKeywords } = options;
    const CHUNK_SIZE = 100;
    let savedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);

        // Check for cancellation
        const currentJob = await prisma.ingestJob.findUnique({
            where: { id: jobId },
            select: { status: true, skippedDetails: true }
        });
        if (currentJob?.status === 'CANCELLED') return { savedCount, skippedCount, cancelled: true };

        const currentDetails = (currentJob?.skippedDetails as Record<string, number>) || {};
        const chunkSkipDetails: Record<string, number> = {};

        const validChunk: { record: any, content: string, category: RecordCategory | null }[] = [];

        // 1. FILTER: Content, Ratings, Keywords
        for (let j = 0; j < chunk.length; j++) {
            const record = chunk[j];

            // --- Content Extraction ---
            let content = '';
            if (typeof record === 'string') {
                content = record;
            } else {
                content = record.feedback_content || record.feedback || record.prompt ||
                    record.content || record.body || record.task_content ||
                    record.text || record.message || record.instruction || record.response;

                if (!content || content.length < 10) {
                    const textFields = Object.entries(record)
                        .filter(([key, val]) => typeof val === 'string' && String(val).length > 10)
                        .sort((a, b) => String(b[1]).length - String(a[1]).length);
                    if (textFields.length > 0) content = String(textFields[0][1]);
                }
                if (!content) content = JSON.stringify(record);
            }

            // --- Rating Detection ---
            let category: RecordCategory | null = null;
            const ratingValue = record.prompt_quality_rating || record.feedback_quality_rating || record.quality_rating ||
                record.rating || record.category || record.label || record.score || record.avg_score;
            const ratingRaw = (ratingValue || '').toString().toLowerCase().trim();

            if (ratingRaw.includes('top') && (ratingRaw.includes('10'))) category = RecordCategory.TOP_10;
            else if (ratingRaw.includes('bottom') && (ratingRaw.includes('10'))) category = RecordCategory.BOTTOM_10;
            else if (['top_10', 'top10', 'top', 'selected', 'better'].includes(ratingRaw)) category = RecordCategory.TOP_10;
            else if (['bottom_10', 'bottom10', 'bottom', 'rejected', 'worse'].includes(ratingRaw)) category = RecordCategory.BOTTOM_10;
            else if (!isNaN(parseFloat(ratingRaw)) && ratingRaw !== '') {
                const num = parseFloat(ratingRaw);
                if (num >= 4 || (num > 0.8 && num <= 1.0)) category = RecordCategory.TOP_10;
                else if (num <= 2 || (num < 0.2 && num >= 0)) category = RecordCategory.BOTTOM_10;
            } else {
                const ratingKey = Object.keys(record).find(k => k.toLowerCase().includes('rating') || k.toLowerCase().includes('score'));
                if (ratingKey) {
                    const val = String(record[ratingKey]).toLowerCase();
                    if (val.includes('top') || ['5', '4'].includes(val)) category = RecordCategory.TOP_10;
                    else if (val.includes('bottom') || ['1', '2'].includes(val)) category = RecordCategory.BOTTOM_10;
                }
            }

            // --- Keyword Filtering ---
            if (filterKeywords?.length && !filterKeywords.some(k => content.toLowerCase().includes(k.toLowerCase()))) {
                skippedCount++;
                chunkSkipDetails['Keyword Mismatch'] = (chunkSkipDetails['Keyword Mismatch'] || 0) + 1;
                continue;
            }

            validChunk.push({ record, content, category });
        }

        // 2. DUPLICATE DETECTION
        const uniqueness = await Promise.all(validChunk.map(async (v) => {
            const taskId = v.record.task_id || v.record.id || v.record.uuid || v.record.record_id;
            if (!taskId) return true;

            const existing = await prisma.dataRecord.findFirst({
                where: {
                    projectId,
                    type,
                    OR: [
                        { metadata: { path: ['task_id'], equals: String(taskId) } },
                        { metadata: { path: ['id'], equals: String(taskId) } },
                        { metadata: { path: ['uuid'], equals: String(taskId) } },
                        { metadata: { path: ['record_id'], equals: String(taskId) } }
                    ]
                }
            });

            if (existing) {
                chunkSkipDetails['Duplicate ID'] = (chunkSkipDetails['Duplicate ID'] || 0) + 1;
            }
            return !existing;
        }));

        const finalChunk = validChunk.filter((_, idx) => uniqueness[idx]);
        skippedCount += (validChunk.length - finalChunk.length);

        // Merge details
        Object.entries(chunkSkipDetails).forEach(([reason, count]) => {
            currentDetails[reason] = (currentDetails[reason] || 0) + count;
        });

        await Promise.all(finalChunk.map(v =>
            prisma.dataRecord.create({
                data: {
                    projectId,
                    type,
                    category: v.category,
                    source,
                    content: v.content,
                    metadata: typeof v.record === 'object' ? v.record : { value: v.record },
                    embedding: []
                }
            })
        ));

        savedCount += finalChunk.length;
        await prisma.ingestJob.update({
            where: { id: jobId },
            data: { savedCount, skippedCount, skippedDetails: currentDetails }
        });
    }

    return { savedCount, skippedCount };
}

export async function cancelIngest(jobId: string) {
    await prisma.ingestJob.update({
        where: { id: jobId },
        data: { status: 'CANCELLED' }
    });
}

export async function getIngestStatus(jobId: string) {
    return await prisma.ingestJob.findUnique({
        where: { id: jobId }
    });
}

export async function deleteIngestedData(jobId: string) {
    await prisma.dataRecord.deleteMany({
        where: { metadata: { path: ['ingestJobId'], equals: jobId } }
    });
    await prisma.ingestJob.delete({
        where: { id: jobId }
    });
}
