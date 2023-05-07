process.env.NTBA_FIX_319 = 1;
process.env.NTBA_FIX_350 = 0;

const TelegramApi = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const { addNewGameState, getUserGameState, updateGameState, updatePlayerHistory } = require('./db/db');

const token = ''
const bot = new TelegramApi(token, {polling: true});

const NEXT_BUTTON = "... продолжить"

const buttons = [
  {
    text: 'ДАЛЕЕ',
    callback_data: 'next_1'
  }
];

const keyboard = {
  inline_keyboard: [buttons]
};

const buttons1 = [
  {
    text: 'ДАЛЕЕ',
    callback_data: 'next_2'
  }
];

const keyboard1 = {
  inline_keyboard: [buttons1]
};

const start = () => {
  bot.setMyCommands([
    {command: '/start', description: 'Начать сначала'},
    {command: '/info', description: 'Информация'}
  ])

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id
    const text = msg.text

    if (text == "/start" || text == "/start@Strela1Bot") {
      const isNewUser = await addNewGameState(chatId);
      if (isNewUser) {
        // bot.sendMessage(chatId, 'Добро пожаловать в игру!')
        sendConversationPart(chatId)
      } else {
        const gameState = await getUserGameState(chatId)
        // bot.sendMessage(chatId, `Добро пожаловать обратно в игру! Ваша текущая подглава – ${gameState.subchapter}`)
        sendConversationPart(chatId)
      }
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

    await updateGameState(chatId, selectedOption.toId);
    await updatePlayerHistory(chatId, selectedOption.optionText);
    sendConversationPart(chatId)
  })
}

async function sendConversationPart(chatId) {
  const gameState = await getUserGameState(chatId);
  if (!gameState) {
    // Handle the case where the game state doesn't exist for this user
    return;
  }

  const conversationPath = path.join(__dirname, 'resources', 'conversations.json');
  const conversations = JSON.parse(fs.readFileSync(conversationPath));
  const currentConversationIdInteger = parseInt(gameState.current_conversation_id)

  const currentConversation = conversations.conversationParts.find(
    (part) => part.id === currentConversationIdInteger
  );

  if (!currentConversation) {
    throw new Error(`Conversation part not found for id ${gameState.current_conversation_id}`);
  }

  const messageText = currentConversation.text;
  const character = currentConversation.character;

  const currentOptions = conversations.options.filter(
    (option) => option.fromId === currentConversation.id
  );

  const inlineKeyboard = currentOptions.map((option) => ({
    text: option.optionText === "..." ? NEXT_BUTTON : option.optionText,
    callback_data: option.uuid,
  }));

  if (currentConversation.illustration != "") {
    const illustrationName = currentConversation.illustration
    const illustration = fs.readFileSync(__dirname + `\\resources\\pics\\${illustrationName}.png`);
    bot.sendPhoto(chatId, illustration, {
      parse_mode: 'HTML',
      caption: `<b>${character}:</b>\n${messageText}`,
      reply_markup: {
        inline_keyboard: [inlineKeyboard],
        }
      });
    return;
  }

  bot.sendMessage(chatId, `<b>${character}:</b>\n${messageText}`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [inlineKeyboard],
      }
  });
}

start()
