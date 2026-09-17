/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE session (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );

    CREATE INDEX IDX_session_expire ON session (expire);
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS session;`);
};
