/**
 * Data-access helpers for retrieving game records and filtering the catalog.
 *
 * The helpers keep the database access logic in one place, so Astro pages can
 * request filtered game lists while tests exercise the same SQL against an
 * in-memory database.
 */
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Game } from '../types/game';

export type GameFilterOptions = {
    categoryIds?: number[];
    publisherIds?: number[];
};

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function normalizeFilterIds(ids?: number[]): number[] | undefined {
    if (!ids || ids.length === 0) {
        return undefined;
    }

    return [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
}

type FilterableQuery<T> = {
    where: (...conditions: Parameters<typeof and>) => FilterableQuery<T>;
    orderBy: (...args: unknown[]) => T[];
    get: () => T | undefined;
};

function baseGamesQuery(db: Database): FilterableQuery<GameSelectionRow> {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id)) as unknown as FilterableQuery<GameSelectionRow>;
}

function baseGameIdsQuery(db: Database): FilterableQuery<{ id: number }> {
    return db.select({ id: games.id }).from(games) as unknown as FilterableQuery<{ id: number }>;
}

function applyFilters<T>(query: FilterableQuery<T>, filters?: GameFilterOptions): FilterableQuery<T> {
    const categoryIds = normalizeFilterIds(filters?.categoryIds);
    const publisherIds = normalizeFilterIds(filters?.publisherIds);

    const clauses: Parameters<typeof and> = [];

    if (categoryIds && categoryIds.length > 0) {
        clauses.push(inArray(games.categoryId, categoryIds));
    }

    if (publisherIds && publisherIds.length > 0) {
        clauses.push(inArray(games.publisherId, publisherIds));
    }

    return clauses.length > 0 ? query.where(and(...clauses)) : query;
}

/**
 * Retrieves games ordered by title, optionally filtered by category and/or publisher.
 *
 * @param db - Drizzle database client used to query game records.
 * @param filters - Optional category and publisher IDs to narrow the result set.
 * @returns Games ordered alphabetically by title.
 */
export async function getAllGames(db: Database, filters?: GameFilterOptions): Promise<Game[]> {
    const rows = await applyFilters(baseGamesQuery(db), filters).orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Retrieves all game ids for the current catalog view, with optional category and
 * publisher filters applied.
 *
 * @param db - Drizzle database client used to query game ids.
 * @param filters - Optional category and publisher IDs to narrow the result set.
 * @returns Game ids ordered alphabetically by title.
 */
export async function getAllGameIds(db: Database, filters?: GameFilterOptions): Promise<number[]> {
    const rows = await applyFilters(baseGameIdsQuery(db), filters).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Retrieves a single game by id, or null when it does not exist.
 *
 * @param db - Drizzle database client used to query the game record.
 * @param id - Game id to look up.
 * @returns The matching game, or null when the id is not present.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/**
 * Retrieves games using the same filter semantics as `getAllGames`.
 *
 * @param db - Drizzle database client used to query game records.
 * @param filters - Optional category and publisher IDs to narrow the result set.
 * @returns Games ordered alphabetically by title.
 */
export async function getFilteredGames(db: Database, filters?: GameFilterOptions): Promise<Game[]> {
    return getAllGames(db, filters);
}
