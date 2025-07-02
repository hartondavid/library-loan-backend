/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function (knex) {
  // Deletes ALL existing entries
  await knex('users').del()
  await knex('users').insert([
    {
      id: 1, name: 'Elena', email: 'elena@gmail.com', password: '171c94533cacff0e4c5b85636a9e4fd6',
      phone: '0725434587', confirm_password: '171c94533cacff0e4c5b85636a9e4fd6', photo: 'https://bing.com/th/id/BCO.46c3e992-17b6-4073-bf6f-1db18f58796b.png'
    },
    {
      id: 2, name: 'Maria', email: 'maria@gmail.com', password: '49518a5bba04f0d047a86e56218d966a',
      phone: '0745123457', confirm_password: '49518a5bba04f0d047a86e56218d966a', photo: 'https://bing.com/th/id/BCO.f3df6adb-433d-4ab0-b19f-6df78d308eec.png'
    },
    {
      id: 3, name: 'Admin', email: 'admin@gmail.com', password: 'f6fdffe48c908deb0f4c3bd36c032e72',
      phone: '0746738443', confirm_password: 'f6fdffe48c908deb0f4c3bd36c032e72', photo: 'https://bing.com/th/id/BCO.c18c946a-7a98-4222-a82d-8ee2bdd7e92a.png'
    },
  ]);
};
