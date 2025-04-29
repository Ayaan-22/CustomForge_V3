const samplePrebuiltPcs = [
  {
    product: "<PRODUCT_ID_OF_CYBERPOWERPC>", // Replace with actual Product ID
    name: "CyberPowerPC Gamer Xtreme",
    description: "Ultimate gaming PC with top-tier components.",
    category: "gaming",
    price: 3499,
    cpu: {
      model: "Intel Core i9-12900K",
      manufacturer: "Intel",
      cores: 16,
      speed: 3.2,
      cache: 30,
    },
    gpu: {
      model: "NVIDIA RTX 4090",
      manufacturer: "NVIDIA",
      vram: 24,
    },
    motherboard: {
      model: "ASUS ROG Maximus Z790",
      formFactor: "ATX",
      chipset: "Z790",
    },
    ram: {
      capacity: 64,
      speed: 5600,
      type: "DDR5",
    },
    storage: [{ type: "NVMe", capacity: 2000 }],
    powerSupply: {
      wattage: 1000,
      rating: "80+ Platinum",
    },
    case: {
      model: "CyberPowerPC Xtreme Case",
      manufacturer: "CyberPowerPC",
      color: "Black",
    },
    coolingSystem: {
      type: "liquid",
      description: "360mm AIO Liquid Cooler",
    },
    operatingSystem: "Windows 11",
    warrantyPeriod: 24,
    images: ["https://example.com/cyberpowerpc.jpg"],
    stock: 5,
    features: ["4K Gaming", "Liquid Cooling", "RGB Lighting"],
    sku: "CPP-PC-GAMERXTREME",
  },
];

export default samplePrebuiltPcs;
