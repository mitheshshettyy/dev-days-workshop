/**
 * Data-access helpers for retrieving category records from the database.
 *
 * These helpers accept an injectable database client so they can be used by
 * Astro pages and tested with an in-memory database.
 */
import { asc } from 'drizzle-orm';
import type { Database } from './db';
import { categories } from '../../db/schema';
import type { Category } from '../types/game';

/**
 * Retrieves all categories ordered alphabetically by name.
 *
 * @param db - Drizzle database client used to query category records.
 * @returns Category summaries ordered by category name.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    const rows = await db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));

    return rows.map((row) => ({ id: row.id, name: row.name }));
}
