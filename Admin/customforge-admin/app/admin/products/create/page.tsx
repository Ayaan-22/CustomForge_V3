"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Specification {
  key: string
  value: string
}

interface Dimensions {
  length: number | ""
  width: number | ""
  height: number | ""
}

export default function CreateProduct() {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    brand: "",
    originalPrice: "",
    discountPercentage: "0",
    stock: "",
    description: "",
    sku: "",
    warranty: "1 year limited warranty",
    weight: "",
    isActive: true,
    isFeatured: false,
  })

  const [specifications, setSpecifications] = useState<Specification[]>([{ key: "", value: "" }])
  const [images, setImages] = useState<string[]>([""])
  const [features, setFeatures] = useState<string[]>([])
  const [newFeature, setNewFeature] = useState("")
  const [dimensions, setDimensions] = useState<Dimensions>({
    length: "",
    width: "",
    height: "",
  })

  const [loading, setLoading] = useState(false)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (
        !formData.name ||
        !formData.category ||
        !formData.brand ||
        !formData.originalPrice ||
        !formData.stock ||
        !formData.description ||
        !formData.sku
      ) {
        toast({
          title: "Validation Error",
          description: "Please fill in all required fields",
          variant: "destructive",
        })
        return
      }

      // Validate images
      const validImages = images.filter((img) => img.trim() !== "")
      if (validImages.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one image is required",
          variant: "destructive",
        })
        return
      }

      // Validate specifications
      const validSpecs = specifications.filter((spec) => spec.key.trim() !== "" && spec.value.trim() !== "")

      const productData = {
        ...formData,
        originalPrice: Number.parseFloat(formData.originalPrice),
        discountPercentage: Number.parseFloat(formData.discountPercentage),
        stock: Number.parseInt(formData.stock),
        weight: formData.weight ? Number.parseFloat(formData.weight) : undefined,
        specifications: validSpecs,
        images: validImages,
        features,
        dimensions: {
          length: dimensions.length ? Number.parseFloat(dimensions.length.toString()) : undefined,
          width: dimensions.width ? Number.parseFloat(dimensions.width.toString()) : undefined,
          height: dimensions.height ? Number.parseFloat(dimensions.height.toString()) : undefined,
        },
      }

      await api.post("/products", productData)
      toast({
        title: "Success",
        description: "Product created successfully",
      })
      router.push("/admin/products")
    } catch (error) {
      console.error("Error creating product:", error)
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const addSpecification = () => {
    setSpecifications([...specifications, { key: "", value: "" }])
  }

  const updateSpecification = (index: number, field: "key" | "value", value: string) => {
    const updated = [...specifications]
    updated[index][field] = value
    setSpecifications(updated)
  }

  const removeSpecification = (index: number) => {
    setSpecifications(specifications.filter((_, i) => i !== index))
  }

  const addImage = () => {
    setImages([...images, ""])
  }

  const updateImage = (index: number, value: string) => {
    const updated = [...images]
    updated[index] = value
    setImages(updated)
  }

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const addFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()])
      setNewFeature("")
    }
  }

  const removeFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Create Product</h1>

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
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  maxLength={100}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => handleChange("sku", e.target.value)}
                  placeholder="e.g., GPU-RTX4090-001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select onValueChange={(value) => handleChange("category", value)}>
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
                  value={formData.brand}
                  onChange={(e) => handleChange("brand", e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                rows={4}
                maxLength={2000}
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Stock */}
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
                  min="0"
                  value={formData.originalPrice}
                  onChange={(e) => handleChange("originalPrice", e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="discountPercentage">Discount Percentage</Label>
                <Input
                  id="discountPercentage"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.discountPercentage}
                  onChange={(e) => handleChange("discountPercentage", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => handleChange("stock", e.target.value)}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.map((image, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={image}
                  onChange={(e) => updateImage(index, e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="flex-1"
                />
                {images.length > 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => removeImage(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
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
            {specifications.map((spec, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={spec.key}
                  onChange={(e) => updateSpecification(index, "key", e.target.value)}
                  placeholder="Specification name (e.g., Memory)"
                  className="flex-1"
                />
                <Input
                  value={spec.value}
                  onChange={(e) => updateSpecification(index, "value", e.target.value)}
                  placeholder="Specification value (e.g., 16GB DDR4)"
                  className="flex-1"
                />
                {specifications.length > 1 && (
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSpecification(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" onClick={addSpecification}>
              <Plus className="h-4 w-4 mr-2" />
              Add Specification
            </Button>
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <CardTitle>Features</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add a feature"
                className="flex-1"
                onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addFeature())}
              />
              <Button type="button" onClick={addFeature}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((feature, index) => (
                <Badge key={index} variant="secondary" className="flex items-center gap-1">
                  {feature}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => removeFeature(index)} />
                </Badge>
              ))}
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
                  min="0"
                  value={formData.weight}
                  onChange={(e) => handleChange("weight", e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="length">Length (cm)</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimensions.length}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      length: e.target.value ? Number.parseFloat(e.target.value) : "",
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="width">Width (cm)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimensions.width}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      width: e.target.value ? Number.parseFloat(e.target.value) : "",
                    }))
                  }
                />
              </div>
              <div>
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  min="0"
                  value={dimensions.height}
                  onChange={(e) =>
                    setDimensions((prev) => ({
                      ...prev,
                      height: e.target.value ? Number.parseFloat(e.target.value) : "",
                    }))
                  }
                />
              </div>
            </div>
            <div>
              <Label htmlFor="warranty">Warranty</Label>
              <Input
                id="warranty"
                value={formData.warranty}
                onChange={(e) => handleChange("warranty", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Product Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleChange("isActive", checked as boolean)}
              />
              <Label htmlFor="isActive">Product is active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isFeatured"
                checked={formData.isFeatured}
                onCheckedChange={(checked) => handleChange("isFeatured", checked as boolean)}
              />
              <Label htmlFor="isFeatured">Featured product</Label>
            </div>
          </CardContent>
        </Card>

        {/* Submit Buttons */}
        <div className="flex space-x-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Product"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
