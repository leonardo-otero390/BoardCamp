import express from 'express';
import pg from 'pg';
import cors from 'cors';

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

app.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM gghames;');
    console.log(result.rows);
    res.sendStatus(201);
  } catch (err) {
    console.log(err.message);
    res.sendStatus(500);
  }
});

app.get('/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM categories;');
    res.status(200).send(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.post('/categories', async (req, res) => {
  const { name } = req.body;

  if (name === '') return res.sendStatus(400);

  try {
    const result = await pool.query('SELECT * FROM categories;');
    const categories = result.rows;
    if (categories.find(c => c.name === name)) return res.sendStatus(409);
    await pool.query('INSERT INTO categories (id,name) VALUES ( $1, $2);', [categories.length + 1, name]);
    res.sendStatus(201);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(4000, () => {
  console.log('Server is litening on port 4000.');
});
