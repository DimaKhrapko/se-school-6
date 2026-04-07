/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

export async function up(knex) {
  return knex.schema.createTable('subscriptions', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable();
    table.string('repo').notNullable();
    table.string('token').notNullable().unique();
    table.boolean('confirmed').defaultTo(false);
    table.string('last_seen_tag').notNullable();

    table.unique(['email', 'repo']);
  })
};

export async function down(knex) {
  return knex.schema.dropTableIfExists('subscriptions');
};
