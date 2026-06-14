export const TOURS = {
  pantry: [
    {
      target: '#tour-stats',
      title: '📊 Your pantry at a glance',
      body: 'These three boxes show how many items are in stock, running low, or out of stock at a quick glance.'
    },
    {
      target: '#tour-filters',
      title: '🔍 Filter your items',
      body: 'Tap All, Stock, Low, or Out to filter what you see. Use ⚙ Actions to add low items to your cart or clear your pantry.'
    },
    {
      target: '#tour-add-item',
      title: '➕ Add items',
      body: 'Tap "+ Add item" to manually add a grocery item with quantity, status, category, and last purchase date.'
    },
    {
      target: '#tour-categories',
      title: '📂 Categories',
      body: 'Your items are grouped into categories. Tap a category to expand it. Drag items between categories, or use the 📂 button to move them.'
    }
  ],
  scan: [
    {
      target: '#tour-scan-upload',
      title: '📷 Upload a receipt',
      body: 'Tap "Choose from files" to upload a receipt photo, or "Take a photo" to use your camera directly.'
    },
    {
      target: '#tour-scan-text',
      title: '📝 Or paste text',
      body: 'You can also paste receipt text, type a grocery list, or enter items with prices manually.'
    }
  ],
  cart: [
    {
      target: '#tour-cart-input',
      title: '🛒 Add to your cart',
      body: 'Type an item name and optional quantity, then hit + Add. Press Enter to add quickly.'
    },
    {
      target: '#tour-cart-pull',
      title: '🧺 Pull from pantry',
      body: 'Tap this to automatically pull all your low or out-of-stock pantry items into your cart.'
    },
    {
      target: '#tour-cart-share',
      title: '📤 Share your cart',
      body: 'Share your shopping list with a friend on PantryPal. They\'ll see it in "Shared with me" in their profile.'
    },
    {
      target: '#tour-cart-list',
      title: '✓ Check items off',
      body: 'Tap the checkbox next to each item as you pick it up. Remove checked items when done shopping.'
    }
  ],
  history: [
    {
      target: '#tour-history-list',
      title: '🧾 Your receipt history',
      body: 'Every receipt you scan is saved here with the store name, date, and total. Tap any receipt to expand it.'
    },
    {
      target: '#tour-history-first',
      title: '📈 Price tracking',
      body: 'Expand a receipt to see each item\'s price. Green ▼ means the price dropped since last time. Red ▲ means it went up.'
    }
  ],
  recipes: [
    {
      target: '#tour-recipes-btn',
      title: '✨ Get recipe ideas',
      body: 'Tap this to get 4 recipe suggestions based on what\'s currently in your pantry.'
    },
    {
      target: '#tour-recipes-saved',
      title: '❤️ Save recipes',
      body: 'Tap the heart on any recipe to save it. View your saved recipes anytime with the Saved button.'
    }
  ]
}
