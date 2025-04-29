const sampleGames = [
  {
    product: "<PRODUCT_ID_OF_CYBERPUNK2077>", // Replace with actual Product ID
    genre: ["RPG"],
    platform: ["PC"],
    developer: "CD Projekt Red",
    publisher: "CD Projekt Red",
    releaseDate: new Date("2020-12-10"),
    ageRating: "Mature",
    multiplayer: "None",
    systemRequirements: {
      minimum: {
        os: "Windows 10",
        processor: "Intel Core i5-3570K",
        memory: "8GB",
        graphics: "NVIDIA GTX 780",
        storage: "70GB",
      },
      recommended: {
        os: "Windows 10",
        processor: "Intel Core i7-4790",
        memory: "16GB",
        graphics: "NVIDIA GTX 1060",
        storage: "70GB",
      },
    },
    languages: [
      { name: "English", interface: true, audio: true, subtitles: true },
      { name: "Polish", interface: true, audio: true, subtitles: true },
    ],
    edition: "Standard",
    metacriticScore: 86,
    features: {
      achievements: true,
      cloudSaves: true,
      crossPlatform: false,
      modSupport: true,
    },
  },
];

export default sampleGames;
