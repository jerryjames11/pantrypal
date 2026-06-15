export const TOURS = {
  home: [
    {
      target: '#tour-home-pantry',
      title: '🧺 Your pantry at a glance',
      body: 'This card shows your pantry stats — items in stock, running low, and out. Tap it to go to your full pantry.'
    },
    {
      target: '#tour-home-shortcuts',
      title: '⚡ Quick shortcuts',
      body: 'Jump straight to Scan a receipt, View your cart, or Get recipe suggestions with one tap.'
    },
    {
      target: null,
      title: '🏠 Household & sharing',
      body: 'Create or join a household to share your pantry with family. Recipes and carts shared by friends appear in the Shared with you section below.'
    }
  ],
  pantry: [
    {
      target: '#tour-stats',
      title: '📊 Pantry overview',
      body: 'These three boxes show how many items are in stock, running low, or out of stock at a quick glance.'
    },
    {
      target: '#tour-filters',
      title: '🔍 Filter your items',
      body: 'Tap All, Stock, Low, or Out to filter your pantry view. Use ⚙ Actions to add low items to your cart or clear everything.'
    },
    {
      target: '#tour-add-item',
      title: '➕ Add an item',
      body: 'Tap this to add a grocery item manually — set the name, quantity, status, category and purchase date.'
    },
    {
      target: '#tour-categories',
      title: '📂 Categories',
      body: 'Items are grouped into categories. Tap a category to expand it. Use the ⚙ gear to clear or delete a category. Drag items between categories to reorganise.'
    }
  ],
  scan: [
    {
      target: '#tour-scan-upload',
      title: '📷 Upload a receipt',
      body: 'Tap "Choose from files" to upload a receipt photo, or "Take a photo" to use your camera. Items are scanned and added to your pantry automatically.'
    },
    {
      target: '#tour-scan-text',
      title: '📝 Or paste text',
      body: 'Paste receipt text, type a grocery list, or enter items with prices manually and tap Parse text.'
    }
  ],
  cart: [
    {
      target: '#tour-cart-input',
      title: '🛒 Add to your cart',
      body: 'Type an item name and optional quantity, then tap + Add or press Enter.'
    },
    {
      target: '#tour-cart-pull',
      title: '🧺 Pull from pantry',
      body: 'Tap this to automatically pull all your low or out-of-stock pantry items into your cart in one go.'
    },
    {
      target: '#tour-cart-share',
      title: '📤 Share your cart',
      body: 'Share your shopping list with a PantryPal friend. They\'ll see it in Shared with me in their profile menu.'
    },
    {
      target: '#tour-cart-list',
      title: '✓ Check items off',
      body: 'Tap the checkbox next to each item as you pick it up at the store. Remove all checked items when you\'re done.'
    }
  ],
  history: [
    {
      target: '#tour-history-list',
      title: '🧾 Receipt history',
      body: 'Every receipt you scan is saved here with the store name, date, and total. Tap any receipt to expand it and see all the items.'
    },
    {
      target: '#tour-history-list',
      title: '📈 Price tracking',
      body: 'When you expand a receipt you\'ll see each item\'s price. A ▼ means the price dropped since last time. A ▲ means it went up — useful for spotting price changes over time.'
    }
  ],
  recipes: [
    {
      target: '#tour-recipes-btn',
      title: '🍳 Suggest recipes',
      body: 'Tap this to get recipe suggestions based on what\'s currently in your pantry. The more items you have tracked, the better the matches.'
    },
    {
      target: '#tour-recipes-saved',
      title: '❤️ Save recipes',
      body: 'Tap the heart icon on any recipe to save it. View all your saved recipes with the Saved button. You can also share recipes directly with friends.'
    }
  ]
}
