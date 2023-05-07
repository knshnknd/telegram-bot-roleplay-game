process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 0;

const TelegramApi = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { addNewGameState, getUserGameState, updateConversationId, updateFlag } = require('./db/db');

const token = ''
const bot = new TelegramApi(token, {polling: true});

const NEXT_BUTTON = "... продолжить"

// Util function
const getTexts = () => {
  const textsPath = path.join(__dirname, 'util_texts .json');
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
      bot.sendMessage(chatId, helpText);
    }

    if (text == "/start" || text == "/start@Strela1Bot") {
      const isNewUser = await addNewGameState(chatId);
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

    const conversationPath = path.join(__dirname, 'resources', 'conversations.json');
    const options = JSON.parse(fs.readFileSync(conversationPath));
    const selectedOption = options.options.find((option) => option.uuid === optionId);

    await updateConversationId(chatId, selectedOption.toId);
    sendConversationPart(chatId)
  })
}

// Util function
const getConversations = () => {
  const conversationPath = path.join(__dirname, 'resources', 'conversations.json');
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
  const gameState = await getUserGameState(chatId);
  const flags = gameState.flags.split(', ');
  const conversations = getConversations();
  const currentConversationIdInteger = parseInt(gameState.current_conversation_id);

  const currentConversation = conversations.conversationParts.find(
    (part) => part.id === currentConversationIdInteger
  );

  const messageText = currentConversation.text;
  const character = currentConversation.character;
  const newFlag = currentConversation.processorId;

  if (newFlag != "") {
    await updateFlag(chatId, newFlag);
    flags.push(newFlag);
  }

  const currentOptions = conversations.options.filter(
    (option) => option.fromId === currentConversation.id
  );

  const inlineKeyboard = createInlineKeyboard(currentOptions, flags);

  if (currentConversation.illustration != "") {
    const illustrationName = currentConversation.illustration;
    const illustration = fs.readFileSync(__dirname + `\\resources\\pics\\${illustrationName}.png`);
    bot.sendPhoto(chatId, illustration, {
      parse_mode: 'HTML',
      caption: `<b>${character}:</b>\n${messageText}`,
      reply_markup: {
        inline_keyboard: [inlineKeyboard],
      },
    });
    return;
  }

  bot.sendMessage(chatId, `<b>${character}:</b>\n${messageText}`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [inlineKeyboard],
    },
  });
}

start()
