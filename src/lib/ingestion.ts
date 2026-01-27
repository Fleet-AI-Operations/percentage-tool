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

async function processAndStore(records: any[], options: IngestOptions, jobId: string) {
    const { projectId, source, type, filterKeywords } = options;
    const CHUNK_SIZE = 100;
    let savedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < records.length; i += CHUNK_SIZE) {
        const chunk = records.slice(i, i + CHUNK_SIZE);

        // Check for cancellation
        const currentJob = await prisma.ingestJob.findUnique({
            where: { id: jobId },
            select: { status: true }
        });
        if (currentJob?.status === 'CANCELLED') return { savedCount, skippedCount, cancelled: true };

        const validChunk = [];
        for (let j = 0; j < chunk.length; j++) {
            const record = chunk[j];

            /**
             * CONTENT EXTRACTION
             * Searches for content in multiple column name variations.
             * If no standard column is found, uses the longest text field.
             */
            let content = '';
            if (typeof record === 'string') {
                content = record;
            } else {
                // First try known column names
                content = record.feedback_content || record.feedback || record.prompt ||
                    record.content || record.body || record.task_content ||
                    record.text || record.message || record.instruction || record.response;

                // If no known columns, find the column with the longest text (likely the actual content)
                if (!content || content.length < 10) {
                    const textFields = Object.entries(record)
                        .filter(([key, val]) => typeof val === 'string' && String(val).length > 10)
                        .sort((a, b) => String(b[1]).length - String(a[1]).length);

                    if (textFields.length > 0) {
                        content = String(textFields[0][1]);
                    }
                }

                if (!content) content = JSON.stringify(record);
            }

            /**
             * RATING DETECTION (3-Tier System)
             * Tier 1: Standard column names (prompt_quality_rating, rating, etc.)
             * Tier 2: Numerical ratings (1-5 scale or 0-1 scale)
             * Tier 3: Dynamic column discovery (searches all keys for 'rating' or 'score')
             */
            let category: RecordCategory | null = null;

            // Tier 1: Try known column names
            const ratingValue = record.prompt_quality_rating ||
                record.feedback_quality_rating ||
                record.quality_rating ||
                record.rating ||
                record.category ||
                record.label ||
                record.score ||
                record.avg_score;

            const ratingRaw = (ratingValue || '').toString().toLowerCase().trim();

            // Match variations: "Top 10%", "top_10", "top10", "top", "selected", etc.
            if (ratingRaw.includes('top') && (ratingRaw.includes('10'))) {
                category = RecordCategory.TOP_10;
            } else if (ratingRaw.includes('bottom') && (ratingRaw.includes('10'))) {
                category = RecordCategory.BOTTOM_10;
            } else if (ratingRaw === 'top_10' || ratingRaw === 'top10' || ratingRaw === 'top' || ratingRaw === 'selected' || ratingRaw === 'better') {
                category = RecordCategory.TOP_10;
            } else if (ratingRaw === 'bottom_10' || ratingRaw === 'bottom10' || ratingRaw === 'bottom' || ratingRaw === 'rejected' || ratingRaw === 'worse') {
                category = RecordCategory.BOTTOM_10;
            }

            // Tier 2: Numerical ratings (1-5 scale: 4-5=TOP, 1-2=BOTTOM; 0-1 scale: >0.8=TOP, <0.2=BOTTOM)
            if (!category && !isNaN(parseFloat(ratingRaw)) && ratingRaw !== '') {
                const num = parseFloat(ratingRaw);
                if (num >= 4 || (num > 0.8 && num <= 1.0)) category = RecordCategory.TOP_10;
                else if (num <= 2 || (num < 0.2 && num >= 0)) category = RecordCategory.BOTTOM_10;
            }

            // Tier 3: Dynamic column discovery
            if (!category) {
                const ratingKey = Object.keys(record).find(k => k.toLowerCase().includes('rating') || k.toLowerCase().includes('score'));
                if (ratingKey) {
                    const val = String(record[ratingKey]).toLowerCase();
                    if (val.includes('top') || val === '5' || val === '4') category = RecordCategory.TOP_10;
                    else if (val.includes('bottom') || val === '1' || val === '2') category = RecordCategory.BOTTOM_10;
                }
            }

            // Skip records without valid ratings (only ingest top_10 or bottom_10)
            if (!category) {
                skippedCount++;
                continue;
            }

            // Keyword filtering
            if (filterKeywords?.length && !filterKeywords.some(k => content.toLowerCase().includes(k.toLowerCase()))) {
                skippedCount++;
                continue;
            }
            validChunk.push({ record, content, category });
        }

        /**
         * DUPLICATE DETECTION
         * Checks for existing records with the same task_id/id/uuid.
         * CRITICAL: Must filter by type to prevent FEEDBACK records from being
         * marked as duplicates of TASK records (they share task_id values).
         */
        const uniqueness = await Promise.all(validChunk.map(async (v) => {
            const taskId = v.record.task_id || v.record.id || v.record.uuid || v.record.record_id;
            if (!taskId) return true;

            const existing = await prisma.dataRecord.findFirst({
                where: {
                    projectId,
                    type,  // CRITICAL: Filter by type to avoid cross-type duplicates
                    OR: [
                        { metadata: { path: ['task_id'], equals: String(taskId) } },
                        { metadata: { path: ['id'], equals: String(taskId) } },
                        { metadata: { path: ['uuid'], equals: String(taskId) } },
                        { metadata: { path: ['record_id'], equals: String(taskId) } }
                    ]
                }
            });

            return !existing;
        }));

        const finalChunk = validChunk.filter((_, idx) => uniqueness[idx]);
        skippedCount += (validChunk.length - finalChunk.length);

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
            data: { savedCount, skippedCount }
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
