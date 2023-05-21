process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 0;

const TelegramApi = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { addNewPlayer, getUserGameState, updateConversationId, updateFlag, addPoints, updatePlayerHistory, updateIsSubchapterEnd, updateSubchapter, getHistory, getHistoryRowCount, secretCountHistoryWords } = require('./src/db/db');
const { Events } = require('./src/data/events');
const { Subchapters } = require('./src/data/subchapters');

const token = ''
const bot = new TelegramApi(token, {polling: true});

const NEXT_BUTTON = "... продолжить"

// Util function
const getTexts = () => {
  const textsPath = path.join(__dirname, 'resources/util_texts.json');
  const textsContent = fs.readFileSync(textsPath, 'utf8');
  return JSON.parse(textsContent);
};
const texts = getTexts();

const start = () => {
  bot.setMyCommands([
    {command: '/start', description: 'Начать сначала'},
    {command: '/help', description: 'Информация'}
  ])

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text

    if (text == "/help" || text == "/help@Strela1Bot") {
      const helpText = texts.helpText;
      bot.sendMessage(chatId, helpText, {parse_mode: "HTML"});
    }

    if (text == "/history" || text == "/history@Strela1Bot") {
      const history = await getHistory(chatId);
      bot.sendMessage(chatId, history, {parse_mode: "HTML"});
    }

    if (text == "/skolkoigr" || text == "/skolkoigr@Strela1Bot") {
      const gameCount = "<b>Всего игр сыграно: " + await getHistoryRowCount() + "</b>\n\n" + await secretCountHistoryWords();
      bot.sendMessage(chatId, gameCount, {parse_mode: "HTML"});
    }

    if (text == "/start" || text == "/start@Strela1Bot") {
      const isNewUser = await addNewPlayer(chatId);
      sendConversationPart(chatId)
    }
  });

  bot.on('callback_query', async msg => {
    const chatId = msg.message.chat.id;
    const messageId = msg.message.message_id;
    const optionId = msg.data.toString();

    const gameState = await getUserGameState(chatId);
    bot.editMessageReplyMarkup({
      reply_markup: {inline_keyboard: [[],]}},
      {chat_id: chatId, message_id: messageId});

    const conversationPath = path.join(__dirname, 'resources\\conversations', `${gameState.subchapter}.json`);
    const options = JSON.parse(fs.readFileSync(conversationPath));
    const selectedOption = options.options.find((option) => option.uuid === optionId);

    if (!gameState.is_subchapter_end) {
      await updateConversationId(chatId, selectedOption.toId);
    }
    sendConversationPart(chatId)
  })
}

// Util function
const getConversations = (subchapter) => {
  const conversationPath = path.join(__dirname, 'resources\\conversations', `${subchapter}.json`);
  return JSON.parse(fs.readFileSync(conversationPath));
};

// Util function
const createInlineKeyboard = (currentOptions, flags) => {
  return currentOptions
    .filter((option) => {
      if (option.optionConditionId === '') {
        return true;
      } else {
        return flags.includes(option.optionConditionId);
      }
    })
    .map((option) => ({
      text: option.optionText === '...' ? NEXT_BUTTON : option.optionText,
      callback_data: option.uuid,
    }));
};

async function sendConversationPart(chatId) {
  updateIsSubchapterEnd(chatId, false);
  const gameState = await getUserGameState(chatId);
  const flags = gameState.flags.split(', ');
  const conversations = getConversations(gameState.subchapter);
  const currentConversationIdInteger = parseInt(gameState.current_conversation_id);

  const currentConversation = conversations.conversationParts.find(
    (part) => part.id === currentConversationIdInteger
  );

  const messageText = currentConversation.text;
  const character = currentConversation.character;
  const newFlag = currentConversation.processorId;

  if (newFlag != "" && newFlag != null) {
    console.log(newFlag)
    if (Object.keys(Events).includes(newFlag)) {
      await updateFlag(chatId, newFlag);
      const status = Events[newFlag];
      const points = status.points;
      if (points != 0) {
        addPoints(points);
      }
    }

    if (Object.keys(Subchapters).includes(newFlag)) {
      const subchapter = Subchapters[newFlag];
      const id = subchapter.id;
      updateSubchapter(chatId, subchapter.name);
      updateIsSubchapterEnd(chatId, true);
    }

    flags.push(newFlag);
  }

  const currentOptions = conversations.options.filter(
    (option) => option.fromId === currentConversation.id
  );

  const inlineKeyboard = createInlineKeyboard(currentOptions, flags);

  if (currentConversation.illustration != "") {
    const illustrationName = currentConversation.illustration;
    const illustration = fs.readFileSync(__dirname + `\\resources\\pics\\${illustrationName}.png`);
    if ( illustration != null ) {
      bot.sendPhoto(chatId, illustration, {
        parse_mode: 'HTML',
        caption: `<b>${character}:</b>\n${messageText}`,
        reply_markup: {
          inline_keyboard: [inlineKeyboard],
        },
      });
      return;
    }
  }

  bot.sendMessage(chatId, `<b>${character}:</b>\n${messageText}`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [inlineKeyboard],
    },
  });
}

start()
