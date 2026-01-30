/**
 * Typed interfaces for data records and metadata
 */

/**
 * TaskMetadata - All fields from ingested CSV/API data
 * These are stored in the DataRecord.metadata JSON column
 */
export interface TaskMetadata {
    // Identifiers
    task_id?: string;
    task_key?: string;

    // Timestamps
    created_at?: string;

    // Creator info
    created_by_id?: string;
    created_by_name?: string;
    created_by_email?: string;

    // Status fields
    lifecycle_status?: string;
    instance_status?: string;

    // Note: 'prompt' and other content fields are stored in DataRecord.content, not in metadata

    // Environment/Project context
    env_key?: string;
    environment_name?: string;
    project_name?: string;
    scenario_title?: string;

    // Error tracking
    diff_generation_error?: string | null;
    verifier_generation_error?: string | null;

    // Quality metrics
    prompt_quality_rating?: string;
    /** Model pass rate: 0 = 0% of models pass (hardest), 1 = 100% pass (easiest) */
    avg_score?: string | number;

    // Original nested metadata from CSV (if present)
    metadata?: Record<string, unknown>;

    // Allow additional fields
    [key: string]: unknown;
}

/**
 * Helper to safely access metadata fields with type inference
 */
export function getMetadataField<K extends keyof TaskMetadata>(
    metadata: TaskMetadata | Record<string, unknown> | null | undefined,
    field: K
): TaskMetadata[K] | undefined {
    if (!metadata) return undefined;
    return (metadata as TaskMetadata)[field];
}

/**
 * Parse avg_score to a number (handles string/number formats)
 */
export function parseAvgScore(metadata: TaskMetadata | null | undefined): number | null {
    if (!metadata?.avg_score) return null;
    const score = typeof metadata.avg_score === 'number'
        ? metadata.avg_score
        : parseFloat(String(metadata.avg_score));
    return isNaN(score) ? null : score;
}

/**
 * Format avg_score as percentage string (score is 0-1, output is "55%")
 */
export function formatAvgScorePercent(metadata: TaskMetadata | null | undefined): string | null {
    const score = parseAvgScore(metadata);
    if (score === null) return null;
    return `${Math.round(score * 100)}%`;
}
