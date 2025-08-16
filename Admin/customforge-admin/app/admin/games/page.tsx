"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Trash2,
  Search,
  Filter,
  X,
  Eye,
  Edit,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Gamepad2,
  Calendar,
  Users,
  Trophy,
  Monitor,
  Smartphone,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface Game {
  id: string
  title: string
  developer: string
  publisher: string
  releaseDate: string
  platforms: string[]
  genres: string[]
  ageRating: string
  price: number
  discountPrice?: number
  discountPercentage?: number
  stock: number
  metacriticScore: number
  userScore?: number
  isActive: boolean
  isFeatured?: boolean
  images: string[]
  description: string
  systemRequirements?: {
    minimum: {
      os: string
      processor: string
      memory: string
      graphics: string
      storage: string
    }
    recommended: {
      os: string
      processor: string
      memory: string
      graphics: string
      storage: string
    }
  }
  languages?: {
    interface: string[]
    audio: string[]
    subtitles: string[]
  }
  features?: string[]
  multiplayer?: "None" | "Local" | "Online" | "Both"
  editions?: string[]
  createdAt: string
  updatedAt: string
}

interface GameFilters {
  search: string
  genre: string[]
  platform: string[]
  ageRating: string
  multiplayer: string
  priceRange: {
    min: string
    max: string
  }
  scoreRange: {
    min: string
    max: string
  }
  dateRange: {
    start: string
    end: string
  }
  status: string
}

interface SortConfig {
  key: keyof Game | "discountPercentage"
  direction: "asc" | "desc"
}

const getAgeRatingColor = (rating: string) => {
  switch (rating) {
    case "E":
      return "bg-green-100 text-green-800"
    case "E10+":
      return "bg-blue-100 text-blue-800"
    case "T":
      return "bg-yellow-100 text-yellow-800"
    case "M":
      return "bg-red-100 text-red-800"
    case "AO":
      return "bg-purple-100 text-purple-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

const getPlatformIcon = (platform: string) => {
  switch (platform) {
    case "PC":
      return <Monitor className="h-3 w-3" />
    case "Mobile":
      return <Smartphone className="h-3 w-3" />
    default:
      return <Gamepad2 className="h-3 w-3" />
  }
}

export default function Games() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedGame, setSelectedGame] = useState<Game | null>(null)
  const [showGameDetails, setShowGameDetails] = useState(false)
  const [showCreateGame, setShowCreateGame] = useState(false)
  const [showEditGame, setShowEditGame] = useState(false)
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: "title", direction: "asc" })

  const [filters, setFilters] = useState<GameFilters>({
    search: "",
    genre: [],
    platform: [],
    ageRating: "all",
    multiplayer: "all",
    priceRange: { min: "", max: "" },
    scoreRange: { min: "", max: "" },
    dateRange: { start: "", end: "" },
    status: "all",
  })

  const { toast } = useToast()

  const genres = [
    "Action",
    "Adventure",
    "RPG",
    "Strategy",
    "Simulation",
    "Sports",
    "Racing",
    "Puzzle",
    "Indie",
    "Horror",
    "Shooter",
    "Fighting",
    "Platform",
    "Open World",
    "Survival",
    "Sandbox",
  ]
  const platforms = ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile", "VR"]
  const ageRatings = ["E", "E10+", "T", "M", "AO", "RP"]
  const multiplayerTypes = ["None", "Local", "Online", "Both"]

  // Mock data - comprehensive game collection
  const mockGamesData: Game[] = [
    {
      id: "1",
      title: "Cyberpunk 2077",
      developer: "CD Projekt RED",
      publisher: "CD Projekt",
      releaseDate: "2020-12-10",
      platforms: ["PC", "PlayStation", "Xbox"],
      genres: ["RPG", "Action", "Open World"],
      ageRating: "M",
      price: 59.99,
      discountPrice: 29.99,
      discountPercentage: 50,
      stock: 150,
      metacriticScore: 86,
      userScore: 7.2,
      isActive: true,
      isFeatured: true,
      images: [
        "/placeholder.svg?height=400&width=400&text=Cyberpunk+2077",
        "/placeholder.svg?height=400&width=400&text=Night+City",
        "/placeholder.svg?height=400&width=400&text=V+Character",
      ],
      description:
        "An open-world, action-adventure RPG set in the dark future of Night City — a dangerous megalopolis obsessed with power, glamour, and ceaseless body modification.",
      systemRequirements: {
        minimum: {
          os: "Windows 10 64-bit",
          processor: "Intel Core i5-3570K / AMD FX-8310",
          memory: "8 GB RAM",
          graphics: "NVIDIA GTX 780 / AMD Radeon RX 470",
          storage: "70 GB available space",
        },
        recommended: {
          os: "Windows 10 64-bit",
          processor: "Intel Core i7-4790 / AMD Ryzen 3 3200G",
          memory: "12 GB RAM",
          graphics: "NVIDIA GTX 1060 6GB / AMD Radeon R9 Fury",
          storage: "70 GB available space",
        },
      },
      languages: {
        interface: ["English", "French", "German", "Spanish", "Japanese", "Korean", "Chinese"],
        audio: ["English", "French", "German", "Spanish", "Japanese"],
        subtitles: ["English", "French", "German", "Spanish", "Japanese", "Korean", "Chinese", "Russian"],
      },
      features: [
        "Single-player",
        "Steam Achievements",
        "Steam Cloud",
        "Steam Trading Cards",
        "Partial Controller Support",
      ],
      multiplayer: "None",
      editions: ["Standard", "Deluxe", "Collector's"],
      createdAt: "2024-01-15T10:30:00Z",
      updatedAt: "2024-01-20T14:45:00Z",
    },
    {
      id: "2",
      title: "The Witcher 3: Wild Hunt",
      developer: "CD Projekt RED",
      publisher: "CD Projekt",
      releaseDate: "2015-05-19",
      platforms: ["PC", "PlayStation", "Xbox", "Nintendo"],
      genres: ["RPG", "Action", "Adventure", "Open World"],
      ageRating: "M",
      price: 39.99,
      discountPrice: 9.99,
      discountPercentage: 75,
      stock: 200,
      metacriticScore: 93,
      userScore: 9.3,
      isActive: true,
      isFeatured: true,
      images: [
        "/placeholder.svg?height=400&width=400&text=Witcher+3",
        "/placeholder.svg?height=400&width=400&text=Geralt",
        "/placeholder.svg?height=400&width=400&text=Novigrad",
      ],
      description:
        "You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract? Tracking down Ciri — the Child of Prophecy, a living weapon that can alter the shape of the world.",
      features: [
        "Single-player",
        "Steam Achievements",
        "Steam Cloud",
        "Steam Trading Cards",
        "Full Controller Support",
        "Steam Workshop",
      ],
      multiplayer: "None",
      editions: ["Standard", "Game of the Year", "Complete"],
      createdAt: "2024-01-10T08:15:00Z",
      updatedAt: "2024-01-18T11:20:00Z",
    },
    {
      id: "3",
      title: "Minecraft",
      developer: "Mojang Studios",
      publisher: "Microsoft Studios",
      releaseDate: "2011-11-18",
      platforms: ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile"],
      genres: ["Sandbox", "Survival", "Adventure", "Indie"],
      ageRating: "E10+",
      price: 26.95,
      stock: 999,
      metacriticScore: 93,
      userScore: 8.0,
      isActive: true,
      isFeatured: true,
      images: [
        "/placeholder.svg?height=400&width=400&text=Minecraft",
        "/placeholder.svg?height=400&width=400&text=Minecraft+World",
        "/placeholder.svg?height=400&width=400&text=Minecraft+Crafting",
      ],
      description:
        "Minecraft is a game made up of blocks, creatures, and community. You can survive the night or build a work of art – the choice is all yours. But if the thought of exploring a vast new world all on your own feels overwhelming, then it's a good thing that Minecraft can be played with friends.",
      features: [
        "Single-player",
        "Multi-player",
        "Co-op",
        "Steam Achievements",
        "Steam Cloud",
        "Full Controller Support",
        "Cross-Platform Multiplayer",
      ],
      multiplayer: "Both",
      editions: ["Java", "Bedrock", "Education"],
      createdAt: "2024-01-12T09:45:00Z",
      updatedAt: "2024-01-19T16:30:00Z",
    },
    {
      id: "4",
      title: "Grand Theft Auto V",
      developer: "Rockstar North",
      publisher: "Rockstar Games",
      releaseDate: "2013-09-17",
      platforms: ["PC", "PlayStation", "Xbox"],
      genres: ["Action", "Adventure", "Open World"],
      ageRating: "M",
      price: 29.99,
      discountPrice: 14.99,
      discountPercentage: 50,
      stock: 300,
      metacriticScore: 96,
      userScore: 7.9,
      isActive: true,
      isFeatured: false,
      images: [
        "/placeholder.svg?height=400&width=400&text=GTA+V",
        "/placeholder.svg?height=400&width=400&text=Los+Santos",
        "/placeholder.svg?height=400&width=400&text=GTA+Online",
      ],
      description:
        "Grand Theft Auto V for PC offers players the option to explore the award-winning world of Los Santos and Blaine County in resolutions of up to 4k and beyond, as well as the chance to experience the game running at 60 frames per second.",
      features: [
        "Single-player",
        "Multi-player",
        "Co-op",
        "Steam Achievements",
        "Steam Cloud",
        "Full Controller Support",
        "In-App Purchases",
      ],
      multiplayer: "Online",
      editions: ["Standard", "Premium", "Criminal Enterprise Starter Pack"],
      createdAt: "2024-01-08T14:20:00Z",
      updatedAt: "2024-01-16T10:15:00Z",
    },
    {
      id: "5",
      title: "Among Us",
      developer: "InnerSloth",
      publisher: "InnerSloth",
      releaseDate: "2018-06-15",
      platforms: ["PC", "Mobile", "PlayStation", "Xbox", "Nintendo"],
      genres: ["Strategy", "Indie"],
      ageRating: "E10+",
      price: 4.99,
      stock: 500,
      metacriticScore: 85,
      userScore: 6.2,
      isActive: true,
      isFeatured: false,
      images: [
        "/placeholder.svg?height=400&width=400&text=Among+Us",
        "/placeholder.svg?height=400&width=400&text=Crewmates",
        "/placeholder.svg?height=400&width=400&text=Emergency+Meeting",
      ],
      description:
        "An online and local party game of teamwork and betrayal for 4-15 players...in space! Play with 1-3 friends locally, or online with up to 10 players as you attempt to prep your spaceship for departure.",
      features: ["Single-player", "Multi-player", "Co-op", "Cross-Platform Multiplayer", "Online Co-op", "Local Co-op"],
      multiplayer: "Both",
      editions: ["Standard"],
      createdAt: "2024-01-05T11:30:00Z",
      updatedAt: "2024-01-14T09:45:00Z",
    },
  ]

  useEffect(() => {
    // Simulate API call
    const fetchGames = async () => {
      setLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate loading
      setGames(mockGamesData)
      setLoading(false)
    }

    fetchGames()
  }, [])

  const filteredAndSortedGames = useMemo(() => {
    const filtered = games.filter((game) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          game.title.toLowerCase().includes(searchTerm) ||
          game.developer.toLowerCase().includes(searchTerm) ||
          game.publisher.toLowerCase().includes(searchTerm) ||
          game.genres.some((genre) => genre.toLowerCase().includes(searchTerm))
        if (!matchesSearch) return false
      }

      // Genre filter
      if (filters.genre.length > 0) {
        const hasMatchingGenre = filters.genre.some((filterGenre) =>
          game.genres.some((gameGenre) => gameGenre === filterGenre),
        )
        if (!hasMatchingGenre) return false
      }

      // Platform filter
      if (filters.platform.length > 0) {
        const hasMatchingPlatform = filters.platform.some((filterPlatform) =>
          game.platforms.some((gamePlatform) => gamePlatform === filterPlatform),
        )
        if (!hasMatchingPlatform) return false
      }

      // Age rating filter
      if (filters.ageRating !== "all" && game.ageRating !== filters.ageRating) return false

      // Multiplayer filter
      if (filters.multiplayer !== "all" && game.multiplayer !== filters.multiplayer) return false

      // Price range filter
      const currentPrice = game.discountPrice || game.price
      if (filters.priceRange.min && currentPrice < Number.parseFloat(filters.priceRange.min)) return false
      if (filters.priceRange.max && currentPrice > Number.parseFloat(filters.priceRange.max)) return false

      // Score range filter
      if (filters.scoreRange.min && game.metacriticScore < Number.parseInt(filters.scoreRange.min)) return false
      if (filters.scoreRange.max && game.metacriticScore > Number.parseInt(filters.scoreRange.max)) return false

      // Date range filter
      if (filters.dateRange.start && new Date(game.releaseDate) < new Date(filters.dateRange.start)) return false
      if (filters.dateRange.end && new Date(game.releaseDate) > new Date(filters.dateRange.end)) return false

      // Status filter
      if (filters.status === "active" && !game.isActive) return false
      if (filters.status === "inactive" && game.isActive) return false

      return true
    })

    // Sort the filtered results
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      if (sortConfig.key === "discountPercentage") {
        aValue = a.discountPercentage || 0
        bValue = b.discountPercentage || 0
      } else {
        aValue = a[sortConfig.key]
        bValue = b[sortConfig.key]
      }

      // Handle different data types
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    return filtered
  }, [games, filters, sortConfig])

  const handleSort = (key: keyof Game | "discountPercentage") => {
    setSortConfig((prevConfig) => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc",
    }))
  }

  const getSortIcon = (key: keyof Game | "discountPercentage") => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4" />
    }
    return sortConfig.direction === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
  }

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this game? This action cannot be undone.")) {
      try {
        setGames(games.filter((g) => g.id !== id))
        toast({
          title: "Success",
          description: "Game deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting game:", error)
        toast({
          title: "Error",
          description: "Failed to delete game",
          variant: "destructive",
        })
      }
    }
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      genre: [],
      platform: [],
      ageRating: "all",
      multiplayer: "all",
      priceRange: { min: "", max: "" },
      scoreRange: { min: "", max: "" },
      dateRange: { start: "", end: "" },
      status: "all",
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Games</h1>
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2">
            <Badge variant="outline" className="text-sm">
              Total: {games.length}
            </Badge>
            <Badge variant="default" className="text-sm">
              Active: {games.filter((g) => g.isActive).length}
            </Badge>
            <Badge variant="secondary" className="text-sm">
              Featured: {games.filter((g) => g.isFeatured).length}
            </Badge>
          </div>
          <Button onClick={() => setShowCreateGame(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Game
          </Button>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter Games</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by title, developer, publisher, or genre..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="space-y-4 pt-4 border-t">
              {/* Genre Filter */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Genres</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {genres.map((genre) => (
                    <div key={genre} className="flex items-center space-x-2">
                      <Checkbox
                        id={`genre-${genre}`}
                        checked={filters.genre.includes(genre)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters((prev) => ({ ...prev, genre: [...prev.genre, genre] }))
                          } else {
                            setFilters((prev) => ({ ...prev, genre: prev.genre.filter((g) => g !== genre) }))
                          }
                        }}
                      />
                      <Label htmlFor={`genre-${genre}`} className="text-sm">
                        {genre}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Platform Filter */}
              <div>
                <Label className="text-sm font-medium mb-3 block">Platforms</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                  {platforms.map((platform) => (
                    <div key={platform} className="flex items-center space-x-2">
                      <Checkbox
                        id={`platform-${platform}`}
                        checked={filters.platform.includes(platform)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFilters((prev) => ({ ...prev, platform: [...prev.platform, platform] }))
                          } else {
                            setFilters((prev) => ({ ...prev, platform: prev.platform.filter((p) => p !== platform) }))
                          }
                        }}
                      />
                      <Label htmlFor={`platform-${platform}`} className="text-sm flex items-center space-x-1">
                        {getPlatformIcon(platform)}
                        <span>{platform}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Filters */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Age Rating</Label>
                  <Select
                    value={filters.ageRating}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, ageRating: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Ratings" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Ratings</SelectItem>
                      {ageRatings.map((rating) => (
                        <SelectItem key={rating} value={rating}>
                          {rating}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Multiplayer</Label>
                  <Select
                    value={filters.multiplayer}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, multiplayer: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {multiplayerTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Status</Label>
                  <Select
                    value={filters.status}
                    onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Range Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Price Range ($)</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={filters.priceRange.min}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, priceRange: { ...prev.priceRange, min: e.target.value } }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={filters.priceRange.max}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, priceRange: { ...prev.priceRange, max: e.target.value } }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Metacritic Score</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      min="0"
                      max="100"
                      value={filters.scoreRange.min}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, scoreRange: { ...prev.scoreRange, min: e.target.value } }))
                      }
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      min="0"
                      max="100"
                      value={filters.scoreRange.max}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, scoreRange: { ...prev.scoreRange, max: e.target.value } }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Release Date Range</Label>
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      value={filters.dateRange.start}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))
                      }
                    />
                    <Input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) =>
                        setFilters((prev) => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results and Clear */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedGames.length} of {games.length} games
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Games Table */}
      <Card>
        <CardHeader>
          <CardTitle>Game Library</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Game</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("developer")}>
                    Developer {getSortIcon("developer")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("releaseDate")}>
                    Release Date {getSortIcon("releaseDate")}
                  </Button>
                </TableHead>
                <TableHead>Platforms</TableHead>
                <TableHead>Genres</TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("price")}>
                    Price {getSortIcon("price")}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort("metacriticScore")}>
                    Score {getSortIcon("metacriticScore")}
                  </Button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedGames.map((game) => (
                <TableRow key={game.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Image
                        src={game.images[0] || "/placeholder.svg?height=60&width=60&text=Game"}
                        alt={game.title}
                        width={60}
                        height={60}
                        className="rounded-lg object-cover"
                      />
                      <div>
                        <div className="font-medium text-sm">{game.title}</div>
                        <div className="text-xs text-gray-500">{game.publisher}</div>
                        <div className="flex items-center space-x-1 mt-1">
                          <Badge className={`text-xs ${getAgeRatingColor(game.ageRating)}`}>{game.ageRating}</Badge>
                          {game.isFeatured && (
                            <Badge variant="secondary" className="text-xs">
                              Featured
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{game.developer}</div>
                      <div className="text-xs text-gray-500">{game.publisher}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{new Date(game.releaseDate).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">
                        {new Date().getFullYear() - new Date(game.releaseDate).getFullYear()} years ago
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {game.platforms.slice(0, 3).map((platform) => (
                        <Badge key={platform} variant="outline" className="text-xs flex items-center space-x-1">
                          {getPlatformIcon(platform)}
                          <span>{platform}</span>
                        </Badge>
                      ))}
                      {game.platforms.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{game.platforms.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {game.genres.slice(0, 2).map((genre) => (
                        <Badge key={genre} variant="secondary" className="text-xs">
                          {genre}
                        </Badge>
                      ))}
                      {game.genres.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{game.genres.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {game.discountPrice ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-green-600">${game.discountPrice}</span>
                            <Badge variant="destructive" className="text-xs">
                              -{game.discountPercentage}%
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 line-through">${game.price}</div>
                        </div>
                      ) : (
                        <span className="text-sm font-medium">${game.price}</span>
                      )}
                      <div className="text-xs text-gray-500">Stock: {game.stock}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Trophy className="h-3 w-3 text-yellow-500" />
                        <span className="text-sm font-medium">{game.metacriticScore}</span>
                      </div>
                      {game.userScore && (
                        <div className="flex items-center space-x-1">
                          <Users className="h-3 w-3 text-blue-500" />
                          <span className="text-xs text-gray-500">{game.userScore}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={game.isActive ? "default" : "secondary"}>
                      {game.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedGame(game)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Game Details</DialogTitle>
                          </DialogHeader>
                          {selectedGame && <GameDetailsModal game={selectedGame} />}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedGame(game)
                          setShowEditGame(true)
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(game.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedGames.length === 0 && (
            <div className="text-center py-8 text-gray-500">No games found matching your criteria.</div>
          )}
        </CardContent>
      </Card>

      {/* Create Game Modal */}
      <Dialog open={showCreateGame} onOpenChange={setShowCreateGame}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Game</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-gray-500">Game creation form will be implemented here.</div>
        </DialogContent>
      </Dialog>

      {/* Edit Game Modal */}
      <Dialog open={showEditGame} onOpenChange={setShowEditGame}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Game</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-gray-500">Game editing form will be implemented here.</div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Game Details Modal Component
function GameDetailsModal({ game }: { game: Game }) {
  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Image
            src={game.images[0] || "/placeholder.svg?height=300&width=400&text=Game"}
            alt={game.title}
            width={400}
            height={300}
            className="rounded-lg object-cover w-full"
          />
          <div className="grid grid-cols-3 gap-2">
            {game.images.slice(1, 4).map((image, index) => (
              <Image
                key={index}
                src={image || "/placeholder.svg?height=100&width=100&text=Game"}
                alt={`${game.title} ${index + 2}`}
                width={100}
                height={100}
                className="rounded-md object-cover w-full h-20"
              />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-bold">{game.title}</h2>
            <p className="text-gray-600">
              {game.developer} • {game.publisher}
            </p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <span className="text-sm">Released: {new Date(game.releaseDate).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Metacritic: {game.metacriticScore}/100</span>
            </div>
            {game.userScore && (
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-500" />
                <span className="text-sm">User Score: {game.userScore}/10</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className={`${getAgeRatingColor(game.ageRating)}`}>{game.ageRating}</Badge>
              <Badge variant="outline">{game.multiplayer}</Badge>
              {game.isFeatured && <Badge variant="secondary">Featured</Badge>}
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium">Price:</div>
            {game.discountPrice ? (
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-green-600">${game.discountPrice}</span>
                <span className="text-sm text-gray-500 line-through">${game.price}</span>
                <Badge variant="destructive" className="text-xs">
                  -{game.discountPercentage}% OFF
                </Badge>
              </div>
            ) : (
              <span className="text-lg font-bold">${game.price}</span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{game.description}</p>
        </CardContent>
      </Card>

      {/* Platforms and Genres */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {game.platforms.map((platform) => (
                <Badge key={platform} variant="outline" className="flex items-center space-x-1">
                  {getPlatformIcon(platform)}
                  <span>{platform}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Genres</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {game.genres.map((genre) => (
                <Badge key={genre} variant="secondary">
                  {genre}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features */}
      {game.features && (
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {game.features.map((feature) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* System Requirements */}
      {game.systemRequirements && (
        <Card>
          <CardHeader>
            <CardTitle>System Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Minimum:</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>OS:</strong> {game.systemRequirements.minimum.os}
                  </div>
                  <div>
                    <strong>Processor:</strong> {game.systemRequirements.minimum.processor}
                  </div>
                  <div>
                    <strong>Memory:</strong> {game.systemRequirements.minimum.memory}
                  </div>
                  <div>
                    <strong>Graphics:</strong> {game.systemRequirements.minimum.graphics}
                  </div>
                  <div>
                    <strong>Storage:</strong> {game.systemRequirements.minimum.storage}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-2">Recommended:</h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>OS:</strong> {game.systemRequirements.recommended.os}
                  </div>
                  <div>
                    <strong>Processor:</strong> {game.systemRequirements.recommended.processor}
                  </div>
                  <div>
                    <strong>Memory:</strong> {game.systemRequirements.recommended.memory}
                  </div>
                  <div>
                    <strong>Graphics:</strong> {game.systemRequirements.recommended.graphics}
                  </div>
                  <div>
                    <strong>Storage:</strong> {game.systemRequirements.recommended.storage}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Game Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Stock:</span>
              <span className="font-medium">{game.stock} units</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <Badge variant={game.isActive ? "default" : "secondary"}>{game.isActive ? "Active" : "Inactive"}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Created:</span>
              <span>{new Date(game.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Updated:</span>
              <span>{new Date(game.updatedAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
        {game.editions && (
          <Card>
            <CardHeader>
              <CardTitle>Available Editions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {game.editions.map((edition) => (
                  <Badge key={edition} variant="outline">
                    {edition}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
