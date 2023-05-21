const Events = {
  START: {
    name: "Старт",
    points: 0,
    description: 'Вы начали новую игру.'
  },
  APPLE_EATEN: {
    name: "Яблоко",
    points: 10,
    description: 'Вы съели яблоко, +10 points.'
  },
  MELON_EATEN: {
    name: "Дыня",
    points: 222,
    description: 'Вы съели дыню, -10 points.'
  },
};

module.exports = { Events };
