/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      ra TEXT,
      course_name TEXT,
      role TEXT NOT NULL DEFAULT 'student',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT users_email_unique UNIQUE (email),
      CONSTRAINT users_ra_unique UNIQUE (ra),
      CONSTRAINT users_email_lowercase_chk CHECK (email = lower(email)),
      CONSTRAINT users_role_chk CHECK (role IN ('student', 'admin'))
    );
  `);
};

/**
 * @param {import("node-pg-migrate").MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS users;`);
};
