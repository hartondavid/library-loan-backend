
exports.up = function (knex) {
    return knex.schema.createTable('loans', (table) => {
        table.increments('id').primary();

        table.datetime('start_date').notNullable();

        table.datetime('end_date').notNullable();

        table.integer('quantity').notNullable();

        table.enum('status', ['pending', 'active', 'returned', 'overdue']).defaultTo('pending');

        table.integer('book_id').unsigned().notNullable()
            .references('id').inTable('books').onDelete('CASCADE');

        table.integer('student_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');

        table.integer('librarian_id').unsigned().notNullable()
            .references('id').inTable('users').onDelete('CASCADE');

        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('loans');
};
