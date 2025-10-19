"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, X, Save } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

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
  warranty?: string
  manufacturer?: string
  model?: string
  tags?: string[]
}

export default function EditProduct() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [product, setProduct] = useState<Product>({
    id: "",
    name: "",
    brand: "",
    category: "",
    originalPrice: 0,
    finalPrice: 0,
    discountPercentage: 0,
    stock: 0,
    availability: "In Stock",
    images: [""],
    ratings: { average: 0, totalReviews: 0 },
    isFeatured: false,
    isActive: true,
    sku: "",
    description: "",
    specifications: {},
    features: [],
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    warranty: "",
    manufacturer: "",
    model: "",
    tags: [],
  })

  const [newSpecKey, setNewSpecKey] = useState("")
  const [newSpecValue, setNewSpecValue] = useState("")
  const [newFeature, setNewFeature] = useState("")
  const [newTag, setNewTag] = useState("")

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

  useEffect(() => {
    if (params.id) {
      fetchProduct(params.id as string)
    }
  }, [params.id])

  useEffect(() => {
    // Calculate discount percentage when prices change
    if (product.originalPrice > 0 && product.finalPrice > 0) {
      const discount = ((product.originalPrice - product.finalPrice) / product.originalPrice) * 100
      setProduct((prev) => ({ ...prev, discountPercentage: Math.round(discount) }))
    }
  }, [product.originalPrice, product.finalPrice])

  const fetchProduct = async (id: string) => {
    try {
      const resp = await api.get(`/products/${id}`)
      const payload: any = resp?.data ?? resp
      const p = payload?.data ?? payload
      const apiProduct = p as any

      // Normalize specifications into an object map for editing
      let specsObj: { [key: string]: string } = {}
      if (Array.isArray(apiProduct?.specifications)) {
        for (const spec of apiProduct.specifications) {
          if (spec && typeof spec.key === "string") {
            specsObj[spec.key] = String(spec.value ?? "")
          }
        }
      } else if (apiProduct?.specifications && typeof apiProduct.specifications === "object") {
        specsObj = apiProduct.specifications as { [key: string]: string }
      }

      setProduct((prev) => ({
        ...prev,
        ...apiProduct,
        images: Array.isArray(apiProduct?.images) ? apiProduct.images : [],
        features: Array.isArray(apiProduct?.features) ? apiProduct.features : [],
        tags: Array.isArray(apiProduct?.tags) ? apiProduct.tags : [],
        specifications: specsObj,
      }))
    } catch (error) {
      console.error("Error fetching product:", error)
      toast({
        title: "Error",
        description: "Failed to fetch product details",
        variant: "destructive",
      })
      router.push("/admin/products")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      await api.put(`/admin/products/${product.id}`, product)
      toast({
        title: "Success",
        description: "Product updated successfully",
      })
      router.push("/admin/products")
    } catch (error) {
      console.error("Error updating product:", error)
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof Product, value: any) => {
    setProduct((prev) => ({ ...prev, [field]: value }))
  }

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...product.images]
    newImages[index] = value
    setProduct((prev) => ({ ...prev, images: newImages }))
  }

  const addImage = () => {
    setProduct((prev) => ({ ...prev, images: [...prev.images, ""] }))
  }

  const removeImage = (index: number) => {
    const newImages = product.images.filter((_, i) => i !== index)
    setProduct((prev) => ({ ...prev, images: newImages }))
  }

  const addSpecification = () => {
    if (newSpecKey && newSpecValue) {
      setProduct((prev) => ({
        ...prev,
        specifications: { ...prev.specifications, [newSpecKey]: newSpecValue },
      }))
      setNewSpecKey("")
      setNewSpecValue("")
    }
  }

  const removeSpecification = (key: string) => {
    const newSpecs = { ...product.specifications }
    delete newSpecs[key]
    setProduct((prev) => ({ ...prev, specifications: newSpecs }))
  }

  const addFeature = () => {
    if (newFeature && !product.features?.includes(newFeature)) {
      setProduct((prev) => ({
        ...prev,
        features: [...(prev.features || []), newFeature],
      }))
      setNewFeature("")
    }
  }

  const removeFeature = (feature: string) => {
    setProduct((prev) => ({
      ...prev,
      features: prev.features?.filter((f) => f !== feature) || [],
    }))
  }

  const addTag = () => {
    if (newTag && !product.tags?.includes(newTag)) {
      setProduct((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag],
      }))
      setNewTag("")
    }
  }

  const removeTag = (tag: string) => {
    setProduct((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }))
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
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.push("/admin/products")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Products
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Edit Product</h1>
        </div>
        <Button onClick={handleSubmit} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Updating..." : "Update Product"}
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={product.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={product.sku}
                  onChange={(e) => handleInputChange("sku", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select value={product.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  value={product.brand}
                  onChange={(e) => handleInputChange("brand", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="manufacturer">Manufacturer</Label>
                <Input
                  id="manufacturer"
                  value={product.manufacturer || ""}
                  onChange={(e) => handleInputChange("manufacturer", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={product.model || ""}
                  onChange={(e) => handleInputChange("model", e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={product.description || ""}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing and Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="originalPrice">Original Price *</Label>
                <Input
                  id="originalPrice"
                  type="number"
                  step="0.01"
                  value={product.originalPrice}
                  onChange={(e) => handleInputChange("originalPrice", Number.parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="finalPrice">Final Price *</Label>
                <Input
                  id="finalPrice"
                  type="number"
                  step="0.01"
                  value={product.finalPrice}
                  onChange={(e) => handleInputChange("finalPrice", Number.parseFloat(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label>Discount Percentage</Label>
                <Input value={`${product.discountPercentage}%`} disabled className="bg-gray-50 dark:bg-gray-800" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={product.stock}
                  onChange={(e) => handleInputChange("stock", Number.parseInt(e.target.value) || 0)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="availability">Availability</Label>
                <Select
                  value={product.availability}
                  onValueChange={(value) => handleInputChange("availability", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="In Stock">In Stock</SelectItem>
                    <SelectItem value="Out of Stock">Out of Stock</SelectItem>
                    <SelectItem value="Preorder">Preorder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="warranty">Warranty</Label>
                <Input
                  id="warranty"
                  value={product.warranty || ""}
                  onChange={(e) => handleInputChange("warranty", e.target.value)}
                  placeholder="e.g., 2 years"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(product.images || []).map((image, index) => (
              <div key={index} className="flex space-x-2">
                <Input
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  placeholder="Image URL"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeImage(index)}
                  disabled={product.images.length === 1}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addImage}>
              <Plus className="h-4 w-4 mr-2" />
              Add Image
            </Button>
          </CardContent>
        </Card>

        {/* Specifications */}
        <Card>
          <CardHeader>
            <CardTitle>Specifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {product.specifications &&
                Object.entries(product.specifications).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                    <span className="font-medium">{key}:</span>
                    <span>{value}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSpecification(key)}
                      className="ml-auto"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Specification name"
                value={newSpecKey}
                onChange={(e) => setNewSpecKey(e.target.value)}
              />
              <Input
                placeholder="Specification value"
                value={newSpecValue}
                onChange={(e) => setNewSpecValue(e.target.value)}
              />
              <Button type="button" onClick={addSpecification}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(product.features || []).map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                  <span>{feature}</span>
                  <button type="button" onClick={() => removeFeature(feature)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Add feature"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        <Card>
          <CardHeader>
            <CardTitle>Tags</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {(product.tags || []).map((tag, index) => (
                <Badge key={index} variant="outline" className="flex items-center space-x-1">
                  <span>{tag}</span>
                  <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-red-500">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex space-x-2">
              <Input
                placeholder="Add tag"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Physical Properties */}
        <Card>
          <CardHeader>
            <CardTitle>Physical Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.01"
                  value={product.weight || ""}
                  onChange={(e) => handleInputChange("weight", Number.parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="length">Length (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.01"
                  value={product.dimensions?.length || ""}
                  onChange={(e) =>
                    handleInputChange("dimensions", {
                      ...product.dimensions,
                      length: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.01"
                  value={product.dimensions?.width || ""}
                  onChange={(e) =>
                    handleInputChange("dimensions", {
                      ...product.dimensions,
                      width: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.01"
                  value={product.dimensions?.height || ""}
                  onChange={(e) =>
                    handleInputChange("dimensions", {
                      ...product.dimensions,
                      height: Number.parseFloat(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={product.isActive}
                onCheckedChange={(checked) => handleInputChange("isActive", checked)}
              />
              <Label htmlFor="isActive">Active Product</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={product.isFeatured}
                onCheckedChange={(checked) => handleInputChange("isFeatured", checked)}
              />
              <Label htmlFor="isFeatured">Featured Product</Label>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
