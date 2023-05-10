const Pool = require('pg').Pool
const pool = new Pool({
  user: "postgres",
  password: '4815',
  host: "localhost",
  port: 5432,
  database: "gametest"
})

// game_state
const addNewPlayer = async (chatId) => {
  const client = await pool.connect();
  try {
    const queryResult = await client.query('SELECT COUNT(*) FROM game_state WHERE chat_id = $1', [chatId]);
    const userExists = queryResult.rows[0].count > 0;
    if (!userExists) {
      await client.query('INSERT INTO game_state (chat_id, subchapter, current_conversation_id, flags) VALUES ($1, $2, $3, $4)', [chatId, '0START', 0, 'START']);
      await client.query('INSERT INTO journey (chat_id, connected_chat_id) VALUES ($1, $2)', [chatId, chatId]);
      return true;
    } else {
      await client.query('UPDATE game_state SET subchapter = $1, current_conversation_id = $2, flags = $3 WHERE chat_id = $4', ['0START', 0, 'START', chatId]);

      const searchResult = await client.query('SELECT id FROM journey WHERE connected_chat_id = $1', [chatId]);
      journeyId = searchResult.rows[0].id;
      await client.query('UPDATE journey SET connected_chat_id = NULL WHERE id = $1', [journeyId]);
      await client.query('INSERT INTO journey (chat_id, connected_chat_id) VALUES ($1, $2) RETURNING id', [chatId, chatId]);

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

const updateConversationId = async (chatId, currentConversationId) => {
  const client = await pool.connect();
  try {
    await client.query('UPDATE game_state SET current_conversation_id = $1 WHERE chat_id = $2', [currentConversationId, chatId]);
    return true;
  } finally {
    client.release();
  }
};

const updateIsSubchapterEnd = async (chatId, isEnd) => {
  const client = await pool.connect();
  try {
    await client.query('UPDATE game_state SET is_subchapter_end = $1 WHERE chat_id = $2', [isEnd, chatId]);
    return true;
  } finally {
    client.release();
  }
};

const updateFlag = async (chatId, newText) => {
  const client = await pool.connect();

  try {
    const oldFlagResult = await client.query('SELECT flags FROM game_state WHERE chat_id = $1', [chatId]);
    const oldFlag = oldFlagResult.rows[0].flags;
    const updatedFlag = `${oldFlag}, ${newText}`;

    await client.query('UPDATE game_state SET flags = $1 WHERE chat_id = $2', [updatedFlag, chatId]);
    await pool.query(`UPDATE journey SET history = $1 WHERE connected_chat_id = $2`, [updatedFlag, chatId]);
  } finally {
    client.release();
  }
};

const updateSubchapter = async (chatId, subchapter) => {
  const client = await pool.connect();

  try {
    const oldFlagResult = await client.query('UPDATE game_state SET subchapter = $2, current_conversation_id = 0 WHERE chat_id = $1', [chatId, subchapter]);
  } finally {
    client.release();
  }
};

const addPoints = async (chatId, pointsToAdd) => {
  const client = await pool.connect();

  try {
    await pool.query(`UPDATE game_state SET points = points + $1 WHERE chat_id = $2`, [pointsToAdd, chatId]);
    await pool.query(`UPDATE journey SET points = points + $1 WHERE connected_chat_id = $2`, [pointsToAdd, chatId]);
  } finally {
    client.release();
  }
};

// journey
const updatePlayerHistory = async (chatId, text) => {
  const client = await pool.connect();

  try {
    const oldText = await client.query('SELECT history FROM journey WHERE chat_id = $1', [chatId]);
    const newText = oldText.rows[0].history + ', ' + text;
    await client.query('UPDATE journey SET history = $1 WHERE connected_chat_id = $2', [newText, chatId]);
  } finally {
    client.release();
  }
};

const getHistory = async (chatId) => {
  const client = await pool.connect();

  try {
      const result = await client.query('SELECT id, history FROM journey WHERE chat_id = $1', [chatId]);
      if (result != null) {
        return result.rows;
      } else {
        return "History is empty!"
      }
  } finally {
    client.release();
  }

  return "Some error!";
};

module.exports = { addNewPlayer, getUserGameState, updateConversationId, updateFlag, updateSubchapter, updateIsSubchapterEnd, addPoints, updatePlayerHistory, getHistory };
