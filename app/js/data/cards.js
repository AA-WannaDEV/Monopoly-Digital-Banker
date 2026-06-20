// ═══════════════════════════════════════
// ALL 16 CHANCE CARDS
// ═══════════════════════════════════════

export const CHANCE_CARDS = [
  {
    id: 'C1', deck: 'chance',
    text: 'Advance to Go. Collect $200.',
    effectType: 'advanceTo',
    effectPayload: { position: 1, collectGoSalary: true }
  },
  {
    id: 'C2', deck: 'chance',
    text: 'Advance to Illinois Avenue. If you pass Go, collect $200.',
    effectType: 'advanceTo',
    effectPayload: { position: 25, collectGoSalary: true },
    requiresChoice: true,
    choiceType: 'passedGo',
    choiceOptions: [
      { label: '✅ Yes, I passed Go (+$200)', passedGo: true },
      { label: '❌ No, I did not pass Go', passedGo: false }
    ]
  },
  {
    id: 'C3', deck: 'chance',
    text: 'Advance to St. Charles Place. If you pass Go, collect $200.',
    effectType: 'advanceTo',
    effectPayload: { position: 12, collectGoSalary: true },
    requiresChoice: true,
    choiceType: 'passedGo',
    choiceOptions: [
      { label: '✅ Yes, I passed Go (+$200)', passedGo: true },
      { label: '❌ No, I did not pass Go', passedGo: false }
    ]
  },
  {
    id: 'C4', deck: 'chance',
    text: 'Advance token to nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay owner twice the rental to which they are otherwise entitled.',
    effectType: 'advanceToNearest',
    effectPayload: { targetType: 'railroad', doubleRent: true },
    requiresChoice: true,
    choiceType: 'nearestProperty',
    choiceOptions: [
      { label: '🏦 It is Unowned — Buy from Bank', outcome: 'unowned' },
      { label: '💸 It is Owned — Pay Double Rent', outcome: 'owned' }
    ]
  },
  {
    id: 'C5', deck: 'chance',
    text: 'Advance token to nearest Railroad. If unowned, you may buy it from the Bank. If owned, pay owner twice the rental to which they are otherwise entitled.',
    effectType: 'advanceToNearest',
    effectPayload: { targetType: 'railroad', doubleRent: true },
    requiresChoice: true,
    choiceType: 'nearestProperty',
    choiceOptions: [
      { label: '🏦 It is Unowned — Buy from Bank', outcome: 'unowned' },
      { label: '💸 It is Owned — Pay Double Rent', outcome: 'owned' }
    ]
  },
  {
    id: 'C6', deck: 'chance',
    text: 'Advance token to nearest Utility. If unowned, you may buy it from the Bank. If owned, throw dice and pay owner 10 times the amount thrown.',
    effectType: 'advanceToNearest',
    effectPayload: { targetType: 'utility', multiplier: 10 },
    requiresChoice: true,
    choiceType: 'nearestProperty',
    choiceOptions: [
      { label: '🏦 It is Unowned — Buy from Bank', outcome: 'unowned' },
      { label: '🎲 It is Owned — Roll Dice & Pay 10×', outcome: 'owned' }
    ]
  },
  {
    id: 'C7', deck: 'chance',
    text: 'Bank pays you dividend of $50.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 50 }
  },
  {
    id: 'C8', deck: 'chance',
    text: 'Get Out of Jail Free. This card may be kept until needed or sold.',
    effectType: 'getOutOfJailFree',
    effectPayload: { cardType: 'chance' }
  },
  {
    id: 'C9', deck: 'chance',
    text: 'Go Back 3 Spaces.',
    effectType: 'goBack',
    effectPayload: { spaces: 3 }
  },
  {
    id: 'C10', deck: 'chance',
    text: 'Go to Jail. Go directly to Jail. Do not pass Go, do not collect $200.',
    effectType: 'goToJail',
    effectPayload: {}
  },
  {
    id: 'C11', deck: 'chance',
    text: 'Make general repairs on all your property. For each house pay $25, for each hotel pay $100.',
    effectType: 'repairs',
    effectPayload: { perHouse: 25, perHotel: 100 }
  },
  {
    id: 'C12', deck: 'chance',
    text: 'Pay poor tax of $15.',
    effectType: 'payToBank',
    effectPayload: { amount: 15 }
  },
  {
    id: 'C13', deck: 'chance',
    text: 'Take a trip to Reading Railroad. If you pass Go, collect $200.',
    effectType: 'advanceTo',
    effectPayload: { position: 6, collectGoSalary: true },
    requiresChoice: true,
    choiceType: 'passedGo',
    choiceOptions: [
      { label: '✅ Yes, I passed Go (+$200)', passedGo: true },
      { label: '❌ No, I did not pass Go', passedGo: false }
    ]
  },
  {
    id: 'C14', deck: 'chance',
    text: 'Take a walk on the Boardwalk. Advance token to Boardwalk.',
    effectType: 'advanceTo',
    effectPayload: { position: 40, collectGoSalary: true },
    requiresChoice: true,
    choiceType: 'passedGo',
    choiceOptions: [
      { label: '✅ Yes, I passed Go (+$200)', passedGo: true },
      { label: '❌ No, I did not pass Go', passedGo: false }
    ]
  },
  {
    id: 'C15', deck: 'chance',
    text: 'You have been elected Chairman of the Board. Pay each player $50.',
    effectType: 'payToAllPlayers',
    effectPayload: { amount: 50 }
  },
  {
    id: 'C16', deck: 'chance',
    text: 'Your building and loan matures. Collect $150.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 150 }
  },
];

// ═══════════════════════════════════════
// ALL 16 COMMUNITY CHEST CARDS
// ═══════════════════════════════════════

export const COMMUNITY_CHEST_CARDS = [
  {
    id: 'CC1', deck: 'communityChest',
    text: 'Advance to Go. Collect $200.',
    effectType: 'advanceTo',
    effectPayload: { position: 1, collectGoSalary: true }
  },
  {
    id: 'CC2', deck: 'communityChest',
    text: 'Bank error in your favor. Collect $200.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 200 }
  },
  {
    id: 'CC3', deck: 'communityChest',
    text: "Doctor's fees. Pay $50.",
    effectType: 'payToBank',
    effectPayload: { amount: 50 }
  },
  {
    id: 'CC4', deck: 'communityChest',
    text: 'From sale of stock you get $50.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 50 }
  },
  {
    id: 'CC5', deck: 'communityChest',
    text: 'Get Out of Jail Free. This card may be kept until needed or sold.',
    effectType: 'getOutOfJailFree',
    effectPayload: { cardType: 'communityChest' }
  },
  {
    id: 'CC6', deck: 'communityChest',
    text: 'Go to Jail. Go directly to Jail. Do not pass Go, do not collect $200.',
    effectType: 'goToJail',
    effectPayload: {}
  },
  {
    id: 'CC7', deck: 'communityChest',
    text: 'Grand Opera Night. Collect $50 from every player for opening night seats.',
    effectType: 'collectFromAllPlayers',
    effectPayload: { amount: 50 }
  },
  {
    id: 'CC8', deck: 'communityChest',
    text: 'Holiday Fund matures. Receive $100.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 100 }
  },
  {
    id: 'CC9', deck: 'communityChest',
    text: 'Income tax refund. Collect $20.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 20 }
  },
  {
    id: 'CC10', deck: 'communityChest',
    text: 'It is your birthday. Collect $10 from every player.',
    effectType: 'collectFromAllPlayers',
    effectPayload: { amount: 10 }
  },
  {
    id: 'CC11', deck: 'communityChest',
    text: 'Life insurance matures. Collect $100.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 100 }
  },
  {
    id: 'CC12', deck: 'communityChest',
    text: 'Pay hospital fees of $100.',
    effectType: 'payToBank',
    effectPayload: { amount: 100 }
  },
  {
    id: 'CC13', deck: 'communityChest',
    text: 'Pay school fees of $150.',
    effectType: 'payToBank',
    effectPayload: { amount: 150 }
  },
  {
    id: 'CC14', deck: 'communityChest',
    text: 'Receive $25 consultancy fee.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 25 }
  },
  {
    id: 'CC15', deck: 'communityChest',
    text: 'You are assessed for street repairs. $40 per house, $115 per hotel.',
    effectType: 'repairs',
    effectPayload: { perHouse: 40, perHotel: 115 }
  },
  {
    id: 'CC16', deck: 'communityChest',
    text: 'You have won second prize in a beauty contest. Collect $10.',
    effectType: 'collectFromBank',
    effectPayload: { amount: 10 }
  },
];
