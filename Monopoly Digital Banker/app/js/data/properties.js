// ═══════════════════════════════════════
// COMPLETE PROPERTY DATA
// ═══════════════════════════════════════

export const COLOR_GROUPS = {
  brown:     { name: 'Brown',      hex: '#955436', size: 2, buildCost: 50  },
  lightBlue: { name: 'Light Blue', hex: '#AAE0FA', size: 3, buildCost: 50  },
  pink:      { name: 'Pink',       hex: '#D93A96', size: 3, buildCost: 100 },
  orange:    { name: 'Orange',     hex: '#F7941D', size: 3, buildCost: 100 },
  red:       { name: 'Red',        hex: '#ED1B24', size: 3, buildCost: 150 },
  yellow:    { name: 'Yellow',     hex: '#FEF200', size: 3, buildCost: 150 },
  green:     { name: 'Green',      hex: '#1FB25A', size: 3, buildCost: 200 },
  darkBlue:  { name: 'Dark Blue',  hex: '#0072BB', size: 2, buildCost: 200 },
  railroad:  { name: 'Railroad',   hex: '#000000', size: 4, buildCost: 0   },
  utility:   { name: 'Utility',    hex: '#AAAAAA', size: 2, buildCost: 0   },
};

export const PROPERTIES = [
  // BROWN
  { id: 'mediterranean', boardPosition: 2,  name: 'Mediterranean Avenue', type: 'property', colorGroup: 'brown',
    purchasePrice: 60, mortgageValue: 30, rent: { base: 2, h1: 10, h2: 30, h3: 90, h4: 160, hotel: 250 } },
  { id: 'baltic',        boardPosition: 4,  name: 'Baltic Avenue',        type: 'property', colorGroup: 'brown',
    purchasePrice: 60, mortgageValue: 30, rent: { base: 4, h1: 20, h2: 60, h3: 180, h4: 320, hotel: 450 } },

  // LIGHT BLUE
  { id: 'oriental',   boardPosition: 7,  name: 'Oriental Avenue',   type: 'property', colorGroup: 'lightBlue',
    purchasePrice: 100, mortgageValue: 50, rent: { base: 6, h1: 30, h2: 90, h3: 270, h4: 400, hotel: 550 } },
  { id: 'vermont',    boardPosition: 9,  name: 'Vermont Avenue',    type: 'property', colorGroup: 'lightBlue',
    purchasePrice: 100, mortgageValue: 50, rent: { base: 6, h1: 30, h2: 90, h3: 270, h4: 400, hotel: 550 } },
  { id: 'connecticut',boardPosition: 10, name: 'Connecticut Avenue',type: 'property', colorGroup: 'lightBlue',
    purchasePrice: 120, mortgageValue: 60, rent: { base: 8, h1: 40, h2: 100, h3: 300, h4: 450, hotel: 600 } },

  // PINK
  { id: 'stCharles', boardPosition: 12, name: 'St. Charles Place',  type: 'property', colorGroup: 'pink',
    purchasePrice: 140, mortgageValue: 70, rent: { base: 10, h1: 50, h2: 150, h3: 450, h4: 625, hotel: 750 } },
  { id: 'states',     boardPosition: 14, name: 'States Avenue',     type: 'property', colorGroup: 'pink',
    purchasePrice: 140, mortgageValue: 70, rent: { base: 10, h1: 50, h2: 150, h3: 450, h4: 625, hotel: 750 } },
  { id: 'virginia',   boardPosition: 15, name: 'Virginia Avenue',   type: 'property', colorGroup: 'pink',
    purchasePrice: 160, mortgageValue: 80, rent: { base: 12, h1: 60, h2: 180, h3: 500, h4: 700, hotel: 900 } },

  // ORANGE
  { id: 'stJames',   boardPosition: 17, name: 'St. James Place',   type: 'property', colorGroup: 'orange',
    purchasePrice: 180, mortgageValue: 90, rent: { base: 14, h1: 70, h2: 200, h3: 550, h4: 750, hotel: 950 } },
  { id: 'tennessee',  boardPosition: 19, name: 'Tennessee Avenue',  type: 'property', colorGroup: 'orange',
    purchasePrice: 180, mortgageValue: 90, rent: { base: 14, h1: 70, h2: 200, h3: 550, h4: 750, hotel: 950 } },
  { id: 'newYork',    boardPosition: 20, name: 'New York Avenue',   type: 'property', colorGroup: 'orange',
    purchasePrice: 200, mortgageValue: 100, rent: { base: 16, h1: 80, h2: 220, h3: 600, h4: 800, hotel: 1000 } },

  // RED
  { id: 'kentucky',  boardPosition: 22, name: 'Kentucky Avenue',   type: 'property', colorGroup: 'red',
    purchasePrice: 220, mortgageValue: 110, rent: { base: 18, h1: 90, h2: 250, h3: 700, h4: 875, hotel: 1050 } },
  { id: 'indiana',   boardPosition: 24, name: 'Indiana Avenue',    type: 'property', colorGroup: 'red',
    purchasePrice: 220, mortgageValue: 110, rent: { base: 18, h1: 90, h2: 250, h3: 700, h4: 875, hotel: 1050 } },
  { id: 'illinois',  boardPosition: 25, name: 'Illinois Avenue',   type: 'property', colorGroup: 'red',
    purchasePrice: 240, mortgageValue: 120, rent: { base: 20, h1: 100, h2: 300, h3: 750, h4: 925, hotel: 1100 } },

  // YELLOW
  { id: 'atlantic',  boardPosition: 27, name: 'Atlantic Avenue',   type: 'property', colorGroup: 'yellow',
    purchasePrice: 260, mortgageValue: 130, rent: { base: 22, h1: 110, h2: 330, h3: 800, h4: 975, hotel: 1150 } },
  { id: 'ventnor',   boardPosition: 28, name: 'Ventnor Avenue',    type: 'property', colorGroup: 'yellow',
    purchasePrice: 260, mortgageValue: 130, rent: { base: 22, h1: 110, h2: 330, h3: 800, h4: 975, hotel: 1150 } },
  { id: 'marvin',    boardPosition: 30, name: 'Marvin Gardens',    type: 'property', colorGroup: 'yellow',
    purchasePrice: 280, mortgageValue: 140, rent: { base: 24, h1: 120, h2: 360, h3: 850, h4: 1025, hotel: 1200 } },

  // GREEN
  { id: 'pacific',       boardPosition: 32, name: 'Pacific Avenue',       type: 'property', colorGroup: 'green',
    purchasePrice: 300, mortgageValue: 150, rent: { base: 26, h1: 130, h2: 390, h3: 900, h4: 1100, hotel: 1275 } },
  { id: 'northCarolina', boardPosition: 33, name: 'North Carolina Avenue',type: 'property', colorGroup: 'green',
    purchasePrice: 300, mortgageValue: 150, rent: { base: 26, h1: 130, h2: 390, h3: 900, h4: 1100, hotel: 1275 } },
  { id: 'pennsylvaniaAve',boardPosition: 35, name: 'Pennsylvania Avenue', type: 'property', colorGroup: 'green',
    purchasePrice: 320, mortgageValue: 160, rent: { base: 28, h1: 150, h2: 450, h3: 1000, h4: 1200, hotel: 1400 } },

  // DARK BLUE
  { id: 'parkPlace', boardPosition: 38, name: 'Park Place',  type: 'property', colorGroup: 'darkBlue',
    purchasePrice: 350, mortgageValue: 175, rent: { base: 35, h1: 175, h2: 500, h3: 1100, h4: 1300, hotel: 1500 } },
  { id: 'boardwalk', boardPosition: 40, name: 'Boardwalk',   type: 'property', colorGroup: 'darkBlue',
    purchasePrice: 400, mortgageValue: 200, rent: { base: 50, h1: 200, h2: 600, h3: 1400, h4: 1700, hotel: 2000 } },

  // RAILROADS
  { id: 'readingRR',      boardPosition: 6,  name: 'Reading Railroad',      type: 'railroad', colorGroup: 'railroad',
    purchasePrice: 200, mortgageValue: 100 },
  { id: 'pennsylvaniaRR', boardPosition: 16, name: 'Pennsylvania Railroad', type: 'railroad', colorGroup: 'railroad',
    purchasePrice: 200, mortgageValue: 100 },
  { id: 'boRR',           boardPosition: 26, name: 'B&O Railroad',          type: 'railroad', colorGroup: 'railroad',
    purchasePrice: 200, mortgageValue: 100 },
  { id: 'shortLineRR',    boardPosition: 36, name: 'Short Line Railroad',   type: 'railroad', colorGroup: 'railroad',
    purchasePrice: 200, mortgageValue: 100 },

  // UTILITIES
  { id: 'electricCompany', boardPosition: 13, name: 'Electric Company', type: 'utility', colorGroup: 'utility',
    purchasePrice: 150, mortgageValue: 75 },
  { id: 'waterWorks',      boardPosition: 29, name: 'Water Works',      type: 'utility', colorGroup: 'utility',
    purchasePrice: 150, mortgageValue: 75 },
];

// Railroad rent by count
export const RAILROAD_RENT = { 1: 25, 2: 50, 3: 100, 4: 200 };

// Board positions for nearest calculations
export const RAILROAD_POSITIONS = [6, 16, 26, 36];
export const UTILITY_POSITIONS = [13, 29];
