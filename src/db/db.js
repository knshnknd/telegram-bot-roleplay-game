const Pool = require('pg').Pool
const { Events } = require('../data/events.js');
const { Subchapters } = require('../data/subchapters.js');

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
      await client.query('INSERT INTO game_state (chat_id, subchapter, current_conversation_id, flags) VALUES ($1, $2, $3, $4)', [chatId, 'A_START', 0, 'START']);
      await client.query('INSERT INTO journey (chat_id, connected_chat_id) VALUES ($1, $2)', [chatId, chatId]);
      return true;
    } else {
      await client.query('UPDATE game_state SET subchapter = $1, current_conversation_id = $2, flags = $3 WHERE chat_id = $4', ['A_START', 0, 'START', chatId]);

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
    await client.query('UPDATE game_state SET subchapter = $2, current_conversation_id = 0 WHERE chat_id = $1', [chatId, subchapter]);
    await client.query('UPDATE journey SET subchapter = $2 WHERE connected_chat_id = $1', [chatId, subchapter]);
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
    const allHistoriesResult = await client.query('SELECT history FROM journey');

    // count occurrences of each event in all histories
    const allHistories = allHistoriesResult.rows.map(row => row.history);
    const allEvents = allHistories.join(',').split(',').map(s => s.trim());
    const allEventsCount = allEvents.length;
    const eventCounts = allEvents.reduce((counts, event) => {
      counts[event] = (counts[event] || 0) + 1;
      return counts;
    }, {});

    if (result != null) {
      result.rows;

      const rows = result.rows;
      let history = `<b>📜 Ваша история</b>\n\n`;

      rows.forEach((row) => {
        history += `<b>Игра №${row.id}</b>\n`;

        const historyFullText = row.history;
        const historyArray = historyFullText.split(",");

        for (let i = 0; i < historyArray.length; i++) {
          historyText = historyArray[i].trim();
          if (historyText in Events) {
            const event = Events[historyText];
            const eventCount = eventCounts[historyText] || 0;
            const eventPercentage = ((eventCount / allEventsCount) * 100).toFixed(1);

            history += `— <b>${event.name}</b>. ${event.description} Есть в ${eventPercentage}% историй.\n`;
          }
        }

        history += "\n";
      });

      return history;
    } else {
      return "Ваша история пуста."
    }
  } finally {
    client.release();
  }
};

async function getHistoryRowCount() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT COUNT(*) FROM journey');
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}

// secret func for journey
async function secretCountHistoryWords() {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT history FROM journey');
    const rows = result.rows;

    // Split history texts and count word occurrences
    const wordCounts = {};
    rows.forEach((row) => {
      const history = row.history;
      const words = history.split(',').map((word) => word.trim());

      words.forEach((word) => {
        if (wordCounts[word]) {
          wordCounts[word]++;
        } else {
          wordCounts[word] = 1;
        }
      });
    });

    // Create output string with word counts
    let output = '<b>✔️ Статистика решений:</b>';
    const gameCount = await getHistoryRowCount();
    for (const word in wordCounts) {
      const percentage = ((wordCounts[word] / gameCount) * 100).toFixed(1);
      // Check if the word matches a name in Events object
      if (Events[word] && Events[word].name) {
        output += `\n— <b>${Events[word].name}: ${wordCounts[word]} - ${percentage}%.</b> `;
        output += `${Events[word].description}`;
      } else {
        output += `— ${word} = ${wordCounts[word]}`;
      }
    }

    output += `\n\n`;

    // Count subchapters
    const resultSubchapter = await client.query('SELECT subchapter FROM journey');
    const rowsSubchapter = resultSubchapter.rows;

    const subchapterCounts = {};

    rowsSubchapter.forEach((row) => {
      const subchapter = row.subchapter;
      if (subchapterCounts[subchapter]) {
        subchapterCounts[subchapter]++;
      } else {
        subchapterCounts[subchapter] = 1;
      }
    });

    output += `<b>🗡 Сколько игр на какой подглаве:</b>\n`;

    // Create an array of subchapter keys
    const subchapterKeys = Object.keys(subchapterCounts);

    // Sort the array based on the id in the Subchapters object
    const sortedSubchapterKeys = subchapterKeys.sort((a, b) => {
      if (!Subchapters[a] || !Subchapters[b]) {
        return 0;
      }
      return Subchapters[a].id - Subchapters[b].id;
    });

    for (const subchapter of sortedSubchapterKeys) {
      const count = subchapterCounts[subchapter];
      const percentageSub = ((count / gameCount) * 100).toFixed(1);
      let subTextInfo = "";

      if (Subchapters[subchapter]) {
        const subchapterId = Subchapters[subchapter].id;
        const subchapterName = Subchapters[subchapter].fullName;
        const subchapterDescription = Subchapters[subchapter].description;

        subTextInfo += `— <b>${subchapterId}. ${subchapterName}: ${count} - ${percentageSub}%.</b> `;
        subTextInfo += `${subchapterDescription}\n`;
      }

      output += subTextInfo;
    }

  return output;
  } finally {
    client.release();
  }
}

module.exports = { addNewPlayer, getUserGameState, updateConversationId, updateFlag, updateSubchapter, updateIsSubchapterEnd, addPoints, updatePlayerHistory, getHistory, getHistoryRowCount, secretCountHistoryWords };
