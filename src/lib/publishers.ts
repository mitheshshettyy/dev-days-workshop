/**
 * Data-access helpers for retrieving publisher records from the database.
 *
 * These helpers accept an injectable database client so they can be used by
 * Astro pages and tested with an in-memory database.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { publishers } from '../../db/schema';
import type { Publisher } from '../types/game';

/**
 * Retrieves all publishers ordered alphabetically by name.
 *
 * @param db - Drizzle database client used to query publisher records.
 * @returns Publisher summaries ordered by publisher name.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    const rows = await db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
