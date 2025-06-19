const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017/localproduccion';
const dbName = 'localproduccion';

async function insertOperators(operarios) {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const result = await db.collection('operarios').insertMany(operarios);  //insertOne(operarios) para solo un operario 
    // REMOVED: console.log(`${result.insertedCount} operarios insertados correctamente.`);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

// Lista de operarios a insertar
const nuevosOperarios = [
  { name: 'Mario Alberto Arango Lopez', cedula: '16073259' },
  { name: 'Laura Manuela Trejos Garcia', cedula: '1053855060' },
  { name: 'Jonathan Osorio Sanchez', cedula: '1053799662' },
  { name: 'Keny Santiago Cuervo Cardona', cedula: '1002542415' },
  { name: 'Ezequiel Garcia Mora', cedula: '1060646044' },
  { name: 'Jhon Fredy Ramirez Giraldo', cedula: '75097022' },
  { name: 'Bryan Esneider Ramirez', cedula: '1054860478' },
  { name: 'Jhonatan Acevedo Arias', cedula: '1053817142' },
  { name: 'Edwin Roncancio Castellanos', cedula: '9977698' },
  { name: 'Leandro Esteban Becerra Lopez', cedula: '1053865416' },
  { name: 'Sander Duque Castro', cedula: '75072721' },
  { name: 'Jorge Andres Salazar Muñoz', cedula: '1058817258' },
  { name: 'Jhon Edwin Velasquez Martinez', cedula: '75108064' },
  { name: 'Sebastian Escobar Galindo', cedula: '1053864662' },
  { name: 'Santiago Velasquez Ramirez', cedula: '1002544396' },
  { name: 'Fredy Alberto Osorio Parra', cedula: '1053764952' },
  { name: 'Andres Felipe Zuluaga Salazar', cedula: '1060652484' },
  { name: 'Wilmer Alejandro Cuenca Morales', cedula: '1075543671' },
  { name: 'Brahiam Florez Herrera', cedula: '1060656018' },
  { name: 'Sebastian Tabares Urquijo', cedula: '1053863337' },
  { name: 'Giovany Velasquez Martinez', cedula: '75097662' },
  { name: 'Leandro Santa Bedoya', cedula: '1053813184' },
  { name: 'Fredy Andres Sandoval Campiño', cedula: '14325528' },
  { name: 'Juan Manuel Gonzalez Garzon', cedula: '1053862980' },

];

// Ejecutar la función
insertOperators(nuevosOperarios);
