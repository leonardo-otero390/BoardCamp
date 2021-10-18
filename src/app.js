import express from 'express';
import pg from 'pg';
import cors from 'cors';
import joi from 'joi';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime.js'


const { Pool } = pg;

const pool = new Pool({
  user: 'bootcamp_role',
  host: 'localhost',
  port: 5432,
  database: 'boardcamp',
  password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp'
});

const app = express();
app.use(cors());
app.use(express.json());

app.get('/categories', async (req, res) => {
  try {
    const { rows: categories } = await pool.query('SELECT * FROM categories;');
    if (categories.length === 0) return res.send([]).status(204);
    res.status(200).send(categories);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/categories', async (req, res) => {
  const { name } = req.body;
  if (name === '') return res.sendStatus(400);
  try {
    const { rows: categories } = await pool.query('SELECT * FROM categories;');
    if (categories.find(c => c.name === name)) return res.sendStatus(409);
    await pool.query('INSERT INTO categories (id,name) VALUES ( $1, $2);', [categories.length + 1, name]);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/games', async (req, res) => {
  const search = req.query.name;
  try {
    const { rows: games } = await pool.query('SELECT * FROM games;');
    const { rows: categories } = await pool.query('SELECT * FROM categories;');
    if (games.length === 0) return res.send([]).status(204);
    const gamesList = games.map(g => {
      const categoryId = g.categoryId;
      const { name: categoryName } = categories.find(c => c.id === categoryId) || { name: "Não especificado" };
      return { ...g, categoryName };
    });
    if (!!search) {
      const re = new RegExp('^' + search.toLowerCase());
      const filteredList = gamesList.filter(g => re.test(g.name.toLowerCase()));
      return res.status(200).send(filteredList);
    }
    res.status(200).send(gamesList);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/games', async (req, res) => {
  const body = req.body;
  const schema = joi.object({
    name: joi.string().min(1).required(),
    image: joi.string().trim().uri(),
    stockTotal: joi.number().min(1).required(),
    pricePerDay: joi.number().min(1).required(),
    categoryId: joi.number().required(),
  });
  if (!!schema.validate(body).error) return res.sendStatus(400);
  try {
    const { name, image, stockTotal, pricePerDay, categoryId } = body;
    const { rows: categories } = await pool.query('SELECT * FROM categories;');
    const { rows: games } = await pool.query('SELECT * FROM games;');
    if (!categories.find(c => c.id === categoryId)) return res.sendStatus(400);
    if (games.find(g => g.name === name)) return res.sendStatus(409);

    await pool.query('INSERT INTO games (id,name,image,"stockTotal","categoryId","pricePerDay") VALUES ( $1, $2, $3, $4, $5,$6 );', [games.length + 1, name, image, stockTotal, categoryId, pricePerDay]);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/customers', async (req, res) => {
  const search = req.query.cpf;
  try {
    const { rows: custumers } = await pool.query('SELECT * FROM customers;');
    if (custumers.length === 0) return res.send([]).status(204);
    if (!!search) {
      const re = new RegExp('^' + search);
      const filteredList = custumers.filter(c => re.test(c.cpf));
      return res.status(200).send(filteredList);
    }
    res.status(200).send(custumers);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.get('/customers/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { rows: custumer } = await pool.query(`SELECT * FROM customers WHERE id = $1;`, [id]);
    if (custumer.length === 0) return res.sendStatus(404);

    res.status(200).send(custumer[0]);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/customers', async (req, res) => {
  const body = req.body;
  const schema = joi.object({
    cpf: joi.string().length(11).required(),
    phone: joi.string().min(10).max(11).required(),
    name: joi.string().min(1).required(),
    birthday: joi.date().required()
  })
  if (!!schema.validate(body).error) return res.sendStatus(400);
  const { cpf, phone, name, birthday } = body;
  try {
    const { rows: customers } = await pool.query('SELECT * FROM customers WHERE cpf=$1;', [cpf]);
    if (customers.length) return res.sendStatus(409);
    await pool.query('INSERT INTO customers (cpf,phone,name,birthday) VALUES ( $1, $2, $3, $4);', [cpf, phone, name, birthday]);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.put('/customers/:id', async (req, res) => {
  const id = req.params.id;
  const body = req.body;
  const schema = joi.object({
    cpf: joi.string().length(11).required(),
    phone: joi.string().min(10).max(11).required(),
    name: joi.string().min(1).required(),
    birthday: joi.date().required()
  })
  if (!!schema.validate(body).error) return res.sendStatus(400);
  const { cpf, phone, name, birthday } = body;
  try {
    const { rows: customers } = await pool.query('SELECT * FROM customers WHERE cpf=$1 AND id!=$2;', [cpf, id]);
    if (customers.length) return res.sendStatus(409);
    await pool.query('UPDATE customers SET cpf=$2, phone=$3, name=$4, birthday=$5 WHERE id=$1;', [id, cpf, phone, name, birthday]);
    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
})

app.get('/rentals', async (req, res) => {
  const customerId = req.query.customerId;
  const gameId = req.query.gameId;
  async function createRentalObjectsLsts(rentalsList){
    const arr = [];
    for (let i = 0; i < rentalsList.length; i++) {
      const { rows: customer } = await pool.query('SELECT id,name FROM customers WHERE id = $1', [rentalsList[i].customerId]);
      const { rows: game } = await pool.query('SELECT games.id,games.name,games."categoryId",categories.name FROM games JOIN categories ON games."categoryId"=categories.id WHERE games.id = $1', [rentalsList[i].gameId]);
      arr.push({
        ...rentalsList[i],
        customer: customer[0],
        game: game[0]
      });
    }
    return arr;
  }
  try {
    
    const { rows: rentals } = await pool.query('SELECT * FROM rentals WHERE "returnDate" IS NULL');
    if (rentals.length === 0) return res.send([]).status(204);
    
    if (!!gameId) {
      const { rows: filteredList } = await pool.query('SELECT * FROM rentals WHERE "gameId"=$1 AND "returnDate" IS NULL', [gameId]);
      const result = await createRentalObjectsLsts(filteredList);
      return res.status(200).send(result);
    }
    if (!!customerId) {
      const { rows: filteredList } = await pool.query('SELECT * FROM rentals WHERE "customerId"=$1 AND "returnDate" IS NULL', [customerId]);
      const result = await createRentalObjectsLsts(filteredList);
      console.log(result);
      return res.status(200).send(result);
    }
    const result = await createRentalObjectsLsts(rentals);
    res.status(200).send(result);
  } catch (err) {
    res.status(500).send(err.message);
  }
})

app.post('/rentals', async (req, res) => {
  const { customerId, gameId, daysRented } = req.body;
  if (daysRented <= 0) return res.sendStatus(400);
  try {
    const { rows: customer } = await pool.query('SELECT * FROM customers WHERE id=$1', [customerId]);
    const { rows: game } = await pool.query('SELECT * FROM games WHERE id=$1', [gameId]);
    const { rows: gameRentals } = await pool.query('SELECT * FROM rentals WHERE "gameId"=$1 AND "returnDate" IS NULL', [gameId]);

    if (!customer.length || !game.length || game[0].stockTotal < gameRentals.length) return res.sendStatus(400);
    console.log(gameRentals.length);
    const originalPrice = game[0].pricePerDay * daysRented;
    const rentDate = dayjs().format('YYYY-MM-DD');

    await pool.query(`
      INSERT INTO rentals
      ("customerId","gameId","daysRented","returnDate","originalPrice","delayFee","rentDate") 
      VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [customerId, gameId, daysRented, null, originalPrice, null, rentDate]
    )
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
})

app.post('/rentals/:id/return', async (req, res) => {
  const id = req.params.id;

  try {
    const { rows: rent } = await pool.query('SELECT * FROM rentals WHERE id =$1', [id]);
    if (rent.length === 0 || rent[0].returnDate !== null) return res.sendStatus(400);
    const { rentDate, daysRented, gameId } = rent[0];
    const { rows: pricePerDay } = await pool.query('SELECT "pricePerDay" FROM games WHERE id = $1', [gameId]);
    const returnDate = dayjs().format('YYYY-MM-DD');
    dayjs.extend(relativeTime);
    let daysPassed = dayjs(returnDate).from(rentDate, true);
    if (daysPassed === 'a day') daysPassed = 1; else daysPassed = daysPassed.match(/[0-9]/);
    let delayFee = (daysPassed - daysRented) * pricePerDay[0].pricePerDay;
    if (delayFee < 0) delayFee = null;
    await pool.query(`
    UPDATE rentals 
    SET "returnDate"=$1, "delayFee"=$2 WHERE id=$3`, [returnDate, delayFee, id]);

    res.sendStatus(200);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.delete('/rentals/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const { rows: rentals } = await pool.query('SELECT * FROM rentals WHERE id =$1', [id]);
    if (rentals.length === 0) return res.sendStatus(404);
    if (rentals[0].returnDate !== null) return res.sendStatus(400);
    await pool.query('DELETE FROM rentals WHERE id =$1', [id]);
    res.sendStatus(200);
  } catch (err) { res.status(500).send(err.message) }
})

app.listen(4000, () => {
  console.log('Server is litening on port 4000.');
});
