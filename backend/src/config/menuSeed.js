const { Menu } = require('../models/menu.model');

const sampleMenuItems = [
  // 1. Starters
  {
    name: 'Paneer Tikka',
    category: 'Starters',
    price: 260,
    foodType: 'veg',
    description: 'Cottage cheese cubes marinated in spiced hung curd and grilled with peppers.',
    isAvailable: true,
  },
  {
    name: 'Chicken Tikka',
    category: 'Starters',
    price: 320,
    foodType: 'non-veg',
    description: 'Boneless chicken morsels steeped in red tandoori marinade and char-grilled.',
    isAvailable: true,
  },
  {
    name: 'Veg Manchurian',
    category: 'Starters',
    price: 220,
    foodType: 'veg',
    description: 'Crispy vegetable dumplings tossed in garlic, soy sauce, and fresh scallions.',
    isAvailable: true,
  },
  {
    name: 'Crispy Corn',
    category: 'Starters',
    price: 190,
    foodType: 'veg',
    description: 'Crisp batter-fried golden sweet corn tossed with peppers and chat masala.',
    isAvailable: true,
  },

  // 2. Main Course
  {
    name: 'Paneer Butter Masala',
    category: 'Main Course',
    price: 310,
    foodType: 'veg',
    description: 'Soft cottage cheese simmered in a rich tomato, butter, and cashew gravy.',
    isAvailable: true,
  },
  {
    name: 'Butter Chicken',
    category: 'Main Course',
    price: 380,
    foodType: 'non-veg',
    description: 'Tandoori roasted chicken in an aromatic, velvety makhani butter sauce.',
    isAvailable: true,
  },
  {
    name: 'Dal Tadka',
    category: 'Main Course',
    price: 210,
    foodType: 'veg',
    description: 'Yellow lentils cooked and tempered with desi ghee, cumin, garlic, and chilies.',
    isAvailable: true,
  },
  {
    name: 'Kadai Chicken',
    category: 'Main Course',
    price: 350,
    foodType: 'non-veg',
    description: 'Chicken cooked with freshly ground coriander, chili, capsicum, and onion gravy.',
    isAvailable: true,
  },

  // 3. Breads
  {
    name: 'Butter Naan',
    category: 'Breads',
    price: 55,
    foodType: 'veg',
    description: 'Traditional leavened flatbread baked in the tandoor and glazed with melted butter.',
    isAvailable: true,
  },
  {
    name: 'Tandoori Roti',
    category: 'Breads',
    price: 30,
    foodType: 'veg',
    description: 'Whole wheat flatbread baked crisp in a clay oven.',
    isAvailable: true,
  },
  {
    name: 'Garlic Naan',
    category: 'Breads',
    price: 70,
    foodType: 'veg',
    description: 'Tandoori flatbread topped with minced garlic and cilantro, brushed with butter.',
    isAvailable: true,
  },
  {
    name: 'Laccha Paratha',
    category: 'Breads',
    price: 60,
    foodType: 'veg',
    description: 'Multi-layered spiral whole wheat bread cooked in tandoor with pure ghee.',
    isAvailable: true,
  },

  // 4. Biryani
  {
    name: 'Veg Dum Biryani',
    category: 'Biryani',
    price: 280,
    foodType: 'veg',
    description: 'Aromatic basmati rice cooked on dum with seasonal vegetables, saffron, and mint.',
    isAvailable: true,
  },
  {
    name: 'Chicken Dum Biryani',
    category: 'Biryani',
    price: 350,
    foodType: 'non-veg',
    description: 'Hyderabadi style long-grain rice layered with spiced marinated chicken and herbs.',
    isAvailable: true,
  },
  {
    name: 'Mutton Biryani',
    category: 'Biryani',
    price: 440,
    foodType: 'non-veg',
    description: 'Aged basmati rice slow-cooked on dum with tender mutton chunks and spices.',
    isAvailable: false, // Seeded as unavailable for testing cashier filtering
  },
  {
    name: 'Egg Biryani',
    category: 'Biryani',
    price: 290,
    foodType: 'non-veg',
    description: 'Fragrant basmati rice tossed with spiced boiled eggs, mint, and fried onions.',
    isAvailable: true,
  },

  // 5. Beverages
  {
    name: 'Masala Chai',
    category: 'Beverages',
    price: 45,
    foodType: 'veg',
    description: 'Freshly brewed strong Indian milk tea infused with crushed ginger and cardamom.',
    isAvailable: true,
  },
  {
    name: 'Cold Coffee',
    category: 'Beverages',
    price: 120,
    foodType: 'veg',
    description: 'Creamy chilled blended coffee topped with vanilla ice cream and chocolate drizzle.',
    isAvailable: true,
  },
  {
    name: 'Fresh Lime Soda',
    category: 'Beverages',
    price: 70,
    foodType: 'veg',
    description: 'Chilled sparkling soda with freshly squeezed lime, mint, and black salt.',
    isAvailable: true,
  },
  {
    name: 'Mango Lassi',
    category: 'Beverages',
    price: 90,
    foodType: 'veg',
    description: 'Traditional thick churned yogurt drink sweetened with ripe mango pulp.',
    isAvailable: true,
  },

  // 6. Desserts
  {
    name: 'Gulab Jamun',
    category: 'Desserts',
    price: 90,
    foodType: 'veg',
    description: 'Deep-fried golden milk solid dumplings soaked in warm saffron-rose syrup.',
    isAvailable: true,
  },
  {
    name: 'Sizzling Brownie',
    category: 'Desserts',
    price: 180,
    foodType: 'veg',
    description: 'Warm walnut brownie on a sizzler plate with vanilla ice cream and hot fudge.',
    isAvailable: true,
  },
  {
    name: 'Vanilla Ice Cream',
    category: 'Desserts',
    price: 80,
    foodType: 'veg',
    description: 'Rich and creamy double vanilla bean dairy ice cream scoops.',
    isAvailable: true,
  },
  {
    name: 'Rasmalai',
    category: 'Desserts',
    price: 110,
    foodType: 'veg',
    description: 'Spongy cottage cheese patties steeped in sweetened condensed milk with nuts.',
    isAvailable: false, // Seeded as unavailable for testing cashier filtering
  },
];

/**
 * Seed sample menu items idempotently without overwriting existing items
 */
const seedMenuItems = async () => {
  try {
    let createdCount = 0;

    for (const item of sampleMenuItems) {
      const existing = await Menu.findOne({
        name: new RegExp(`^${item.name}$`, 'i'),
        category: item.category,
      });

      if (!existing) {
        await Menu.create(item);
        createdCount++;
      }
    }

    const totalCount = await Menu.countDocuments();
    if (createdCount > 0) {
      console.log(`[Menu Seed] Initialized ${createdCount} new menu items. Total items in catalog: ${totalCount}`);
    } else {
      console.log(`[Menu Seed] Menu catalog verified (${totalCount} items active).`);
    }
  } catch (error) {
    console.error('[Menu Seed Error] Failed to seed menu items:', error.message);
  }
};

module.exports = seedMenuItems;
