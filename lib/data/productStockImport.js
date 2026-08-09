// Product and physical stock list transcribed from the supplied handwritten sheets.
// `ctn` = cartons, `bt` = loose bottles. Pack size defaults to 12 unless explicitly overridden.
// Names marked review:true should be checked against the original sheet because the handwriting is ambiguous.
export const DEFAULT_PACK_SIZE = 12;

export const productStockImport = [
  // Beer
  { main: "Guinness", sub: "Bottle", category: "Beer", ctn: 11, bt: 0 },
  { main: "Heineken", sub: "Bottle", category: "Beer", ctn: 5, bt: 0 },
  { main: "Kingfisher", sub: "Bottle", category: "Beer", ctn: 1, bt: 0 },
  { main: "Tiger", sub: "Bottle", category: "Beer", ctn: 6, bt: 0 },

  // Whisky / whiskey
  { main: "Tullamore D.E.W.", sub: "Original", category: "Whisky", ctn: 2, bt: 4 },
  { main: "Jameson", sub: "Original", category: "Whisky", ctn: 3, bt: 0 },
  { main: "Dewar's", sub: "15 Year", category: "Whisky", ctn: 3, bt: 3 },
  { main: "Dewar's", sub: "12 Year", category: "Whisky", ctn: 3, bt: 2 },
  { main: "Kingram", sub: "LL", category: "Whisky", ctn: 2, bt: 0, review: true },
  { main: "Mortlach", sub: "16 Year", category: "Whisky", ctn: 3, bt: 1 },
  { main: "Johnnie Walker", sub: "15 Year", category: "Whisky", ctn: 0, bt: 4, review: true },
  { main: "Carlos", sub: "Original", category: "Whisky", ctn: 0, bt: 3, review: true },
  { main: "Jameson", sub: "Black Barrel", category: "Whisky", ctn: 1, bt: 1 },
  { main: "Glen Grant", sub: "Lager / variant", category: "Whisky", ctn: 1, bt: 3, review: true },
  { main: "Monkey Shoulder", sub: "70cl", category: "Whisky", ctn: 1, bt: 0 },
  { main: "Lagavulin", sub: "16 Year", category: "Whisky", ctn: 0, bt: 3 },
  { main: "Singleton", sub: "21 Year", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Singleton", sub: "12 Year Glendullan 1L", category: "Whisky", ctn: 3, bt: 5 },
  { main: "Singleton", sub: "12 Year Glendullan", category: "Whisky", ctn: 0, bt: 3 },
  { main: "Jameson", sub: "Stout Edition 70cl", category: "Whisky", ctn: 1, bt: 0 },
  { main: "Highland Queen", sub: "Sherry", category: "Whisky", ctn: 0, bt: 11, review: true },
  { main: "Bushmills", sub: "Original", category: "Whisky", ctn: 1, bt: 10 },
  { main: "Johnnie Walker", sub: "Gold Label", category: "Whisky", ctn: 1, bt: 3 },
  { main: "William Lawson's", sub: "Original", category: "Whisky", ctn: 0, bt: 9 },
  { main: "Jameson", sub: "1L", category: "Whisky", ctn: 2, bt: 11 },
  { main: "Glenfiddich", sub: "18 Year", category: "Whisky", ctn: 1, bt: 0 },
  { main: "Bowmore", sub: "Original", category: "Whisky", ctn: 0, bt: 4 },
  { main: "Glenfiddich", sub: "15 Year", category: "Whisky", ctn: 0, bt: 9 },
  { main: "Canadian Club", sub: "Original", category: "Whisky", ctn: 1, bt: 0 },
  { main: "Glenlivet", sub: "12 Year", category: "Whisky", ctn: 1, bt: 2 },
  { main: "Ballantine's", sub: "Original", category: "Whisky", ctn: 1, bt: 17 },

  { main: "William Lawson's", sub: "1.14L", category: "Whisky", ctn: 3, bt: 3, review: true },
  { main: "Royal Brackla", sub: "18 Year", category: "Whisky", ctn: 2, bt: 4, packSize: 6 },
  { main: "Johnnie Walker", sub: "Blue Label", category: "Whisky", ctn: 0, bt: 1 },
  { main: "Royal Salute", sub: "Original", category: "Whisky", ctn: 0, bt: 3 },
  { main: "Glenfiddich", sub: "12 Year", category: "Whisky", ctn: 0, bt: 5 },
  { main: "Glenfiddich", sub: "18 Year / variant", category: "Whisky", ctn: 1, bt: 5, review: true },
  { main: "MG", sub: "1.14L", category: "Whisky", ctn: 1, bt: 11, review: true },
  { main: "Johnnie Walker", sub: "Double Black", category: "Whisky", ctn: 1, bt: 0 },
  { main: "Glenlivet", sub: "Triple Cask", category: "Whisky", ctn: 1, bt: 10 },
  { main: "Glenlivet", sub: "12 Year 70cl", category: "Whisky", ctn: 0, bt: 6 },
  { main: "Chivas Regal", sub: "18 Year", category: "Whisky", ctn: 0, bt: 6 },
  { main: "Singleton", sub: "18 Year Dufftown", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Dalmore", sub: "12 Year", category: "Whisky", ctn: 0, bt: 1 },
  { main: "Balvenie", sub: "12 Year", category: "Whisky", ctn: 0, bt: 1 },
  { main: "Martell", sub: "VSOP", category: "Cognac", ctn: 0, bt: 4 },
  { main: "Bushmills", sub: "Black Bush", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Jameson", sub: "1L", category: "Whisky", ctn: 0, bt: 3 },
  { main: "Cutty Sark", sub: "Original", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Glenfiddich", sub: "12 Year / variant", category: "Whisky", ctn: 0, bt: 1, review: true },
  { main: "Old Cask", sub: "Original", category: "Whisky", ctn: 0, bt: 3 },
  { main: "Johnnie Walker", sub: "XR 21 Year", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Aberfeldy", sub: "12 Year", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Dewar's", sub: "18 Year", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Grant's", sub: "1.125L", category: "Whisky", ctn: 0, bt: 3, review: true },
  { main: "Beehive", sub: "XO", category: "Brandy", ctn: 0, bt: 1 },
  { main: "Copper Dog", sub: "Original", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Laphroaig", sub: "40 / variant", category: "Whisky", ctn: 0, bt: 3, review: true },
  { main: "Singleton", sub: "18 Year Glendullan", category: "Whisky", ctn: 0, bt: 2 },
  { main: "Johnnie Walker", sub: "Black Label", category: "Whisky", ctn: 0, bt: 1 },
  { main: "JID", sub: "Original", category: "Whisky", ctn: 0, bt: 1, review: true },
  { main: "Jameson", sub: "Black Barrel 70cl", category: "Whisky", ctn: 3, bt: 0 },

  // Rum
  { main: "Bacardi", sub: "Original", category: "Rum", ctn: 0, bt: 6 },
  { main: "Bacardi", sub: "70cl", category: "Rum", ctn: 2, bt: 2 },
  { main: "Plantation Rum", sub: "Original", category: "Rum", ctn: 1, bt: 4 },

  // Tequila
  { main: "Patrón", sub: "Añejo", category: "Tequila", ctn: 0, bt: 5 },
  { main: "Jose Cuervo", sub: "Original", category: "Tequila", ctn: 0, bt: 2 },

  // Liqueur / aperitif
  { main: "Aperol", sub: "Original", category: "Liqueur", ctn: 0, bt: 4 },
  { main: "Cointreau", sub: "Original", category: "Liqueur", ctn: 0, bt: 5 },
  { main: "Kahlúa", sub: "Original", category: "Liqueur", ctn: 0, bt: 11 },
  { main: "Baileys", sub: "Original", category: "Liqueur", ctn: 0, bt: 7 },
  { main: "Campari", sub: "Original", category: "Liqueur", ctn: 0, bt: 4 },

  // Vodka
  { main: "Absolut Vodka", sub: "Original", category: "Vodka", ctn: 0, bt: 3, review: true },
  { main: "Absolut Vodka", sub: "70cl", category: "Vodka", ctn: 0, bt: 6, review: true },
  { main: "Finlandia", sub: "Original", category: "Vodka", ctn: 0, bt: 1, review: true },
  { main: "Cîroc", sub: "Original", category: "Vodka", ctn: 0, bt: 2 },

  // Gin
  { main: "Bombay", sub: "Original", category: "Gin", ctn: 0, bt: 3 },
  { main: "The Botanist", sub: "Original", category: "Gin", ctn: 0, bt: 1 },
  { main: "Tanqueray", sub: "Ten Grapefruit", category: "Gin", ctn: 1, bt: 0, review: true },
  { main: "Roku", sub: "Original", category: "Gin", ctn: 0, bt: 5 },
  { main: "Tanqueray", sub: "London Dry", category: "Gin", ctn: 1, bt: 7 },
  { main: "Tanqueray", sub: "Malacca", category: "Gin", ctn: 0, bt: 2 },
  { main: "Hendrick's", sub: "1L", category: "Gin", ctn: 1, bt: 1 },
  { main: "Bulldog", sub: "Original", category: "Gin", ctn: 1, bt: 0 },
  { main: "Gordon's", sub: "Pink", category: "Gin", ctn: 1, bt: 0 },
  { main: "Gin Mare", sub: "Original", category: "Gin", ctn: 0, bt: 3 },
  { main: "Gordon's", sub: "Original", category: "Gin", ctn: 1, bt: 6 },
  { main: "Griffen", sub: "Original", category: "Gin", ctn: 0, bt: 2, review: true },
  { main: "Sui Gin", sub: "Original", category: "Gin", ctn: 0, bt: 1, review: true },

  // Japanese whisky
  { main: "Suntory", sub: "AO", category: "Whisky", ctn: 2, bt: 0 },
];
