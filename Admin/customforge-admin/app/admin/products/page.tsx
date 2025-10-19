"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus,
  Edit,
  Trash2,
  Star,
  Search,
  Filter,
  X,
  SortAsc,
  SortDesc,
  Eye,
  Package,
  DollarSign,
  BarChart3,
  Tag,
  Ruler,
  Weight,
} from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Product {
  id: string
  name: string
  brand: string
  category: string
  originalPrice: number
  finalPrice: number
  discountPercentage: number
  stock: number
  availability: string
  images: string[]
  ratings: {
    average: number
    totalReviews: number
  }
  isFeatured: boolean
  isActive: boolean
  sku: string
  description?: string
  specifications?: { [key: string]: string } | Array<{ key: string; value: string }>
  features?: string[]
  weight?: number
  dimensions?: {
    length: number
    width: number
    height: number
  }
  createdAt?: string
  updatedAt?: string
  tags?: string[]
  warranty?: string
  manufacturer?: string
  model?: string
}

interface Filters {
  search: string
  categories: string[]
  brands: string[]
  availability: string[]
  priceRange: {
    min: string
    max: string
  }
  stockRange: {
    min: string
    max: string
  }
  isFeatured: string
  isActive: string
  minRating: string
}

type SortField = "name" | "brand" | "category" | "finalPrice" | "stock" | "ratings.average" | "createdAt"
type SortOrder = "asc" | "desc"

export default function Products() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<SortField>("name")
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc")
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const [filters, setFilters] = useState<Filters>({
    search: "",
    categories: [],
    brands: [],
    availability: [],
    priceRange: { min: "", max: "" },
    stockRange: { min: "", max: "" },
    isFeatured: "all",
    isActive: "all",
    minRating: "all",
  })

  const router = useRouter()
  const { toast } = useToast()

  const categories = [
    "Prebuilt PCs",
    "CPU",
    "GPU",
    "Motherboard",
    "RAM",
    "Storage",
    "Power Supply",
    "Cooler",
    "Case",
    "OS",
    "Networking",
    "RGB",
    "CaptureCard",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Mousepad",
    "Headset",
    "Speakers",
    "Controller",
    "ExternalStorage",
    "VR",
    "StreamingGear",
    "Microphone",
    "Webcam",
    "GamingChair",
    "GamingDesk",
    "SoundCard",
    "Cables",
    "GamingLaptop",
    "Games",
    "PCGames",
    "ConsoleGames",
    "VRGames",
  ]

  const availabilityOptions = ["In Stock", "Out of Stock", "Preorder"]

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "In Stock":
        return "default"
      case "Out of Stock":
        return "destructive"
      case "Preorder":
        return "secondary"
      default:
        return "secondary"
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const data = await api.get("/products")
      setProducts(data.data)
    } catch (error) {
      console.error("Error fetching products:", error)
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Get unique brands from products
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand))).sort()
  }, [products])

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          product.name.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm) ||
          product.category.toLowerCase().includes(searchTerm) ||
          product.sku.toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false
      }

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(product.category)) {
        return false
      }

      // Brand filter
      if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) {
        return false
      }

      // Availability filter
      if (filters.availability.length > 0 && !filters.availability.includes(product.availability)) {
        return false
      }

      // Price range filter
      if (filters.priceRange.min && product.finalPrice < Number.parseFloat(filters.priceRange.min)) {
        return false
      }
      if (filters.priceRange.max && product.finalPrice > Number.parseFloat(filters.priceRange.max)) {
        return false
      }

      // Stock range filter
      if (filters.stockRange.min && product.stock < Number.parseInt(filters.stockRange.min)) {
        return false
      }
      if (filters.stockRange.max && product.stock > Number.parseInt(filters.stockRange.max)) {
        return false
      }

      // Featured filter
      if (filters.isFeatured === "true" && !product.isFeatured) {
        return false
      }
      if (filters.isFeatured === "false" && product.isFeatured) {
        return false
      }

      // Active filter
      if (filters.isActive === "true" && !product.isActive) {
        return false
      }
      if (filters.isActive === "false" && product.isActive) {
        return false
      }

      // Rating filter
      if (filters.minRating !== "all" && product.ratings.average < Number.parseFloat(filters.minRating)) {
        return false
      }

      return true
    })

    // Sort products
    filtered.sort((a, b) => {
      let aValue: any
      let bValue: any

      switch (sortField) {
        case "ratings.average":
          aValue = a.ratings.average
          bValue = b.ratings.average
          break
        case "finalPrice":
          aValue = a.finalPrice
          bValue = b.finalPrice
          break
        case "stock":
          aValue = a.stock
          bValue = b.stock
          break
        default:
          aValue = a[sortField as keyof Product]
          bValue = b[sortField as keyof Product]
      }

      if (typeof aValue === "string") {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === "asc") {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      }
    })

    return filtered
  }, [products, filters, sortField, sortOrder])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await api.delete(`/admin/products/${id}`)
        setProducts(products.filter((p) => p.id !== id))
        toast({
          title: "Success",
          description: "Product deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting product:", error)
        toast({
          title: "Error",
          description: "Failed to delete product",
          variant: "destructive",
        })
      }
    }
  }

  const handleFilterChange = (key: keyof Filters, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleArrayFilterChange = (key: "categories" | "brands" | "availability", value: string, checked: boolean) => {
    setFilters((prev) => ({
      ...prev,
      [key]: checked ? [...prev[key], value] : prev[key].filter((item) => item !== value),
    }))
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      categories: [],
      brands: [],
      availability: [],
      priceRange: { min: "", max: "" },
      stockRange: { min: "", max: "" },
      isFeatured: "all",
      isActive: "all",
      minRating: "all",
    })
  }

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortField(field)
      setSortOrder("asc")
    }
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortOrder === "asc" ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Products</h1>
        <Button onClick={() => router.push("/admin/products/create")}>
          <Plus className="h-4 w-4 mr-2" />
          Create Product
        </Button>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter</CardTitle>
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
              placeholder="Search products by name, brand, category, or SKU..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t">
              {/* Categories */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Categories</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                  {categories.map((category) => (
                    <div key={category} className="flex items-center space-x-2">
                      <Checkbox
                        id={`category-${category}`}
                        checked={filters.categories.includes(category)}
                        onCheckedChange={(checked) =>
                          handleArrayFilterChange("categories", category, checked as boolean)
                        }
                      />
                      <Label htmlFor={`category-${category}`} className="text-sm">
                        {category}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brands */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Brands</Label>
                <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                  {uniqueBrands.map((brand) => (
                    <div key={brand} className="flex items-center space-x-2">
                      <Checkbox
                        id={`brand-${brand}`}
                        checked={filters.brands.includes(brand)}
                        onCheckedChange={(checked) => handleArrayFilterChange("brands", brand, checked as boolean)}
                      />
                      <Label htmlFor={`brand-${brand}`} className="text-sm">
                        {brand}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Availability */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Availability</Label>
                <div className="space-y-2">
                  {availabilityOptions.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <Checkbox
                        id={`availability-${option}`}
                        checked={filters.availability.includes(option)}
                        onCheckedChange={(checked) =>
                          handleArrayFilterChange("availability", option, checked as boolean)
                        }
                      />
                      <Label htmlFor={`availability-${option}`} className="text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Price Range</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.priceRange.min}
                    onChange={(e) => handleFilterChange("priceRange", { ...filters.priceRange, min: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.priceRange.max}
                    onChange={(e) => handleFilterChange("priceRange", { ...filters.priceRange, max: e.target.value })}
                  />
                </div>
              </div>

              {/* Stock Range */}
              <div>
                <Label className="text-sm font-medium mb-2 block">Stock Range</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.stockRange.min}
                    onChange={(e) => handleFilterChange("stockRange", { ...filters.stockRange, min: e.target.value })}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.stockRange.max}
                    onChange={(e) => handleFilterChange("stockRange", { ...filters.stockRange, max: e.target.value })}
                  />
                </div>
              </div>

              {/* Other Filters */}
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Featured Status</Label>
                  <Select value={filters.isFeatured} onValueChange={(value) => handleFilterChange("isFeatured", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Featured Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="true">Featured Only</SelectItem>
                      <SelectItem value="false">Not Featured</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Active Status</Label>
                  <Select value={filters.isActive} onValueChange={(value) => handleFilterChange("isActive", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Active Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="true">Active Only</SelectItem>
                      <SelectItem value="false">Inactive Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Min Rating</Label>
                  <Select value={filters.minRating} onValueChange={(value) => handleFilterChange("minRating", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any Rating" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any Rating</SelectItem>
                      <SelectItem value="4">4+ Stars</SelectItem>
                      <SelectItem value="3">3+ Stars</SelectItem>
                      <SelectItem value="2">2+ Stars</SelectItem>
                      <SelectItem value="1">1+ Stars</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Active Filters & Clear */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedProducts.length} of {products.length} products
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Product List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort("name")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Product</span>
                    <SortIcon field="name" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort("brand")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Brand</span>
                    <SortIcon field="brand" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort("category")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Category</span>
                    <SortIcon field="category" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort("finalPrice")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Price</span>
                    <SortIcon field="finalPrice" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort("stock")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Stock</span>
                    <SortIcon field="stock" />
                  </div>
                </TableHead>
                <TableHead
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                  onClick={() => handleSort("ratings.average")}
                >
                  <div className="flex items-center space-x-1">
                    <span>Rating</span>
                    <SortIcon field="ratings.average" />
                  </div>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <Image
                      src={product.images?.[0] || "/placeholder.svg?height=50&width=50"}
                      alt={product.name}
                      width={50}
                      height={50}
                      className="rounded-md object-cover"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">SKU: {product.sku}</div>
                      {product.isFeatured && (
                        <Badge variant="outline" className="text-xs">
                          Featured
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{product.brand}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">${product.finalPrice}</div>
                      {product.discountPercentage > 0 && (
                        <div className="text-sm text-gray-500 line-through">${product.originalPrice}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getAvailabilityColor(product.availability)}>
                      {product.stock} - {product.availability}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span>{product.ratings?.average || 0}</span>
                      <span className="text-sm text-gray-500">({product.ratings?.totalReviews || 0})</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedProduct(product)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <Package className="h-5 w-5" />
                              <span>Product Details - {product.name}</span>
                            </DialogTitle>
                          </DialogHeader>
                          {selectedProduct && <ProductDetailsModal product={selectedProduct} />}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/products/edit/${product.id}`)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredAndSortedProducts.length === 0 && (
            <div className="text-center py-8 text-gray-500">No products found matching your criteria.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Comprehensive Product Details Modal Component
function ProductDetailsModal({ product }: { product: Product }) {
  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case "In Stock":
        return "default"
      case "Out of Stock":
        return "destructive"
      case "Preorder":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <ScrollArea className="h-[70vh] pr-4">
      <div className="space-y-6">
        {/* Product Header */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Package className="h-5 w-5" />
                <span>Basic Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start space-x-4">
                <Image
                  src={product.images?.[0] || "/placeholder.svg?height=120&width=120"}
                  alt={product.name}
                  width={120}
                  height={120}
                  className="rounded-lg object-cover border"
                />
                <div className="flex-1 space-y-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{product.name}</h3>
                  <div className="space-y-1">
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Brand:</span> {product.brand}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-medium">SKU:</span> {product.sku}
                    </p>
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="font-medium">Category:</span> {product.category}
                    </p>
                    {product.model && (
                      <p className="text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Model:</span> {product.model}
                      </p>
                    )}
                    {product.manufacturer && (
                      <p className="text-gray-600 dark:text-gray-300">
                        <span className="font-medium">Manufacturer:</span> {product.manufacturer}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant={product.isFeatured ? "default" : "outline"}>
                      {product.isFeatured ? "Featured" : "Regular"}
                    </Badge>
                    <Badge variant={product.isActive ? "default" : "secondary"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing & Stock */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <DollarSign className="h-5 w-5" />
                <span>Pricing & Inventory</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Original Price</Label>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">${product.originalPrice}</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-600 dark:text-gray-300">Final Price</Label>
                  <p className="text-2xl font-bold text-green-600">${product.finalPrice}</p>
                </div>
              </div>

              {product.discountPercentage > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">Discount</span>
                    <span className="text-lg font-bold text-red-600">{product.discountPercentage}% OFF</span>
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Save ${(product.originalPrice - product.finalPrice).toFixed(2)}
                  </p>
                </div>
              )}

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Stock Quantity</span>
                  <span className="text-lg font-semibold">{product.stock} units</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Availability</span>
                  <Badge variant={getAvailabilityColor(product.availability)}>{product.availability}</Badge>
                </div>
                {product.warranty && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Warranty</span>
                    <span className="text-sm font-medium">{product.warranty}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Description */}
        {product.description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Product Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{product.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Features & Tags */}
        {(product.features?.length || product.tags?.length) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {product.features && product.features.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center space-x-2 text-lg">
                    <Tag className="h-5 w-5" />
                    <span>Features</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {product.features.map((feature, index) => (
                      <Badge key={index} variant="secondary" className="text-sm">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {product.tags && product.tags.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {product.tags.map((tag, index) => (
                      <Badge key={index} variant="outline" className="text-sm">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Specifications */}
        {product.specifications && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Technical Specifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.isArray(product.specifications)
                  ? product.specifications.map((spec, idx) => (
                      <div
                        key={`${spec.key}-${idx}`}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">
                          {spec.key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{spec.value}</span>
                      </div>
                    ))
                  : Object.entries(product.specifications as { [key: string]: string }).map(([key, value]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                      >
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 capitalize">
                          {key.replace(/([A-Z])/g, " $1").trim()}
                        </span>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">{value}</span>
                      </div>
                    ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Physical Properties */}
        {(product.weight || product.dimensions) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center space-x-2 text-lg">
                <Ruler className="h-5 w-5" />
                <span>Physical Properties</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {product.weight && (
                  <div className="flex items-center space-x-3">
                    <Weight className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Weight</p>
                      <p className="text-lg font-semibold">{product.weight} kg</p>
                    </div>
                  </div>
                )}

                {product.dimensions && (
                  <div className="flex items-center space-x-3">
                    <Ruler className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Dimensions (L × W × H)</p>
                      <p className="text-lg font-semibold">
                        {product.dimensions.length} × {product.dimensions.width} × {product.dimensions.height} cm
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Images Gallery */}
        {product.images && product.images.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Product Images</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <Image
                      src={image || "/placeholder.svg?height=200&width=200"}
                      alt={`${product.name} ${index + 1}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover w-full h-40 border hover:shadow-lg transition-shadow"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all rounded-lg flex items-center justify-center">
                      <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
                        Image {index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Customer Reviews & Ratings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <BarChart3 className="h-5 w-5" />
              <span>Customer Reviews & Ratings</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Star className="h-8 w-8 text-yellow-400 fill-current" />
                  <div>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{product.ratings?.average || 0}</p>
                    <p className="text-sm text-gray-500">out of 5</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Reviews</span>
                  <span className="text-lg font-semibold">{product.ratings?.totalReviews || 0}</span>
                </div>

                {/* Rating Distribution (Mock data for display) */}
                <div className="space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <div key={rating} className="flex items-center space-x-2">
                      <span className="text-sm w-3">{rating}</span>
                      <Star className="h-3 w-3 text-yellow-400 fill-current" />
                      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-yellow-400 h-2 rounded-full"
                          style={{ width: `${Math.random() * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-500 w-8">{Math.floor(Math.random() * 50)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Product Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Created</span>
                <span className="text-sm font-semibold">{formatDate(product.createdAt)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Last Updated</span>
                <span className="text-sm font-semibold">{formatDate(product.updatedAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  )
}
