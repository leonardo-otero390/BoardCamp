import express from 'express';
import pg from 'pg';
import cors from 'cors';
import joi from 'joi';
import dayjs from 'dayjs';

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
    if (categories.length === 0) return res.sendStatus(204);
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
    if (games.length === 0) return res.sendStatus(204);
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
    if (custumers.length === 0) return res.sendStatus(204);
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
  try {
    const { rows: rentals } = await pool.query('SELECT * FROM rentals;');
    if (rentals.length === 0) return res.sendStatus(204);
    if (!!gameId) {
      const filteredList = rentals.filter(r => r.game.id === gameId);
      return res.status(200).send(filteredList);
    }
    if (!!customerId) {
      const filteredList = rentals.filter(r => r.customerId === customerId);
      return res.status(200).send(filteredList);
    }
    res.status(200).send(rentals);
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
    const { rows: gameRentals } = await pool.query('SELECT * FROM rentals WHERE "gameId"=$1 AND "returnDate"=NULL', [gameId]);

    if (!customer.length || !game.length || game[0].stockTotal < gameRentals.length) return res.sendStatus(400);

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

app.listen(4000, () => {
  console.log('Server is litening on port 4000.');
});
