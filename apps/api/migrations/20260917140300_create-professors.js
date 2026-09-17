/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE professors (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      CONSTRAINT professors_email_lowercase_chk
        CHECK (email IS NULL OR email = lower(email))
    );
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS professors;`);
};
