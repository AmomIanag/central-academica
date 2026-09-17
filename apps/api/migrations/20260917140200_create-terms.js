/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE terms (
      id UUID PRIMARY KEY,
      label TEXT NOT NULL,
      year INTEGER NOT NULL,
      semester SMALLINT NOT NULL,
      starts_on DATE,
      ends_on DATE,
      is_current BOOLEAN NOT NULL DEFAULT false,
      CONSTRAINT terms_label_unique UNIQUE (label),
      CONSTRAINT terms_semester_chk CHECK (semester IN (1, 2))
    );

    CREATE UNIQUE INDEX terms_one_current_idx
      ON terms (is_current)
      WHERE is_current;
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS terms;`);
};
