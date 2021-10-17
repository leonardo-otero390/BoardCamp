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
      res.status(200).send(filteredList);
    }
    res.status(200).send(gamesList);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(4000, () => {
  console.log('Server is litening on port 4000.');
});
