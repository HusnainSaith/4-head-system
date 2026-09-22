/**
 * The API stores business dates in PostgreSQL `date` columns. Keep the Node
 * process on UTC so a value such as "2026-07-02" cannot become July 1 when
 * TypeORM reads local date parts before writing it to the database.
 *
 * User-facing timestamps can still be formatted in the requested locale at
 * the presentation layer. Calendar dates must remain timezone-independent.
 */
process.env.TZ = 'UTC';

