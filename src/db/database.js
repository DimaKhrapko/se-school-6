import knex from 'knex';
import config from '../config/knexfile.cjs';

const db = knex(config.development);

export default db