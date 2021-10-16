import express from 'express';
import pg from 'pg';

const { Pool } = pg;

const connection = new Pool({
  user: 'bootcamp_role',
  host: 'localhost',
  port: 5432,
  database: 'exercicio_mystoreultrasystemincremented_9560838b',
  password: 'senha_super_hiper_ultra_secreta_do_role_do_bootcamp'
});

const app = express();
app.use(express.json());

app.listen(4000, () => {
  console.log('Server is litening on port 4000.');
});
