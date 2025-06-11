/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    { id: 1, name: 'David', email: 'david@gmail.com', password: 'e302c093809151cc23e32ac93e775765', phone: '07254345' },
    { id: 2, name: 'Alex', email: 'alex@gmail.com', password: '0bf4375c81978b29d0f546a1e9cd6412', phone: '0745123457' },
  ]);
};
