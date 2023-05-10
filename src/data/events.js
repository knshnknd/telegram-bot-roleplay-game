const Events = {
  START: {
    points: 0,
    description: 'Вы начали новую игру.'
  },
  APPLE_EATEN: {
    points: 10,
    description: 'Вы съели яблоко, +10 points.'
  },
  MELON_EATEN: {
    points: -10,
    description: 'Вы съели арбуз, -10 points.'
  },
};

module.exports = { Events };
