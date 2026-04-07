import knex from 'knex';
import config from '../db/knexfile.cjs';

const db = knex(config.development);

export default db