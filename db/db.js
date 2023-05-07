const Pool = require('pg').Pool
const pool = new Pool({
  user: "postgres",
  password: '4815',
  host: "localhost",
  port: 5432,
  database: "gametest"
})

const addNewGameState = async (chatId) => {
  const client = await pool.connect();
  try {
    const queryResult = await client.query('SELECT COUNT(*) FROM game_state WHERE chat_id = $1', [chatId]);
    const userExists = queryResult.rows[0].count > 0;
    if (!userExists) {
      await client.query('INSERT INTO game_state (chat_id) VALUES ($1)', [chatId]);
      await client.query('INSERT INTO journey (chat_id) VALUES ($1)', [chatId]);
      return true;
    } else {
      return false;
    }
  } finally {
    client.release();
  }
};

const getUserGameState = async (chatId) => {
  const client = await pool.connect();
  try {
    const queryResult = await client.query('SELECT * FROM game_state WHERE chat_id = $1', [chatId]);
    return queryResult.rows[0];
  } finally {
    client.release();
  }
};

const updateGameState = async (chatId, currentConversationId) => {
  const client = await pool.connect();
  try {
    await client.query('UPDATE game_state SET current_conversation_id = $1 WHERE chat_id = $2', [currentConversationId, chatId]);
    return true;
  } finally {
    client.release();
  }
};

const updatePlayerHistory = async (chatId, text) => {
  const client = await pool.connect();
  try {
    const oldText = await client.query('SELECT history FROM journey WHERE chat_id = $1', [chatId]);
    const newText = oldText.rows[0].history + ', ' + text;
    await client.query('UPDATE journey SET history = $1 WHERE chat_id = $2', [newText, chatId]);
  } finally {
    client.release();
  }
}

module.exports = { addNewGameState, getUserGameState, updateGameState };
