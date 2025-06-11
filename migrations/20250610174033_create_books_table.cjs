
exports.up = function (knex) {
    return knex.schema.createTable('books', (table) => {
        table.increments('id').primary();

        table.string('title').notNullable();

        table.string('author').notNullable();

        table.string('description').notNullable();

        table.string('language').notNullable();

        table.string('photo').nullable();

        table.integer('quantity').notNullable();

        table.enum('status', ['available', 'unavailable']).nullable();

        table.integer('librarian_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');


        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('books');
};
