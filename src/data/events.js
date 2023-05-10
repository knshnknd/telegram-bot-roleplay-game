const Events = {
  START: {
    points: 0,
    description: 'You`ve started the game.'
  },
  APPLE_EATEN: {
    points: 10,
    description: 'Apple has been eaten, +10 points.'
  },
  MELON_EATEN: {
    points: -10,
    description: 'Melon has been eaten, -10 points.'
  },
};

module.exports = { Events };
