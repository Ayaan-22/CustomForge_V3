"use client"

import type React from "react"

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
import { Plus, Edit, Trash2, Search, Filter, X, Copy, Calendar, Percent, DollarSign } from "lucide-react"
import { api } from "@/lib/api"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

interface Coupon {
  id: string
  code: string
  discountType: "percentage" | "fixed"
  discountValue: number
  validFrom: string
  validTo: string
  minPurchase?: number
  maxDiscount?: number
  isActive: boolean
  createdAt: string
}

interface CouponFilters {
  search: string
  discountType: string
  isActive: string
  validityStatus: string
  dateRange: {
    start: string
    end: string
  }
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null)

  const [filters, setFilters] = useState<CouponFilters>({
    search: "",
    discountType: "all",
    isActive: "all",
    validityStatus: "all",
    dateRange: { start: "", end: "" },
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    fetchCoupons()
  }, [])

  const fetchCoupons = async () => {
    try {
      const data = await api.get("/coupons")
      setCoupons(data)
    } catch (error) {
      console.error("Error fetching coupons:", error)
      toast({
        title: "Error",
        description: "Failed to fetch coupons",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredCoupons = useMemo(() => {
    return coupons.filter((coupon) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        if (!coupon.code.toLowerCase().includes(searchTerm)) return false
      }

      // Discount type filter
      if (filters.discountType !== "all" && coupon.discountType !== filters.discountType) return false

      // Active status filter
      if (filters.isActive === "true" && !coupon.isActive) return false
      if (filters.isActive === "false" && coupon.isActive) return false

      // Validity status filter
      const now = new Date()
      const validFrom = new Date(coupon.validFrom)
      const validTo = new Date(coupon.validTo)

      if (filters.validityStatus === "active" && (now < validFrom || now > validTo || !coupon.isActive)) return false
      if (filters.validityStatus === "expired" && now <= validTo) return false
      if (filters.validityStatus === "upcoming" && now >= validFrom) return false

      // Date range filter
      if (filters.dateRange.start && new Date(coupon.createdAt) < new Date(filters.dateRange.start)) return false
      if (filters.dateRange.end && new Date(coupon.createdAt) > new Date(filters.dateRange.end)) return false

      return true
    })
  }, [coupons, filters])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      try {
        await api.delete(`/coupons/${id}`)
        setCoupons(coupons.filter((c) => c.id !== id))
        toast({
          title: "Success",
          description: "Coupon deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting coupon:", error)
        toast({
          title: "Error",
          description: "Failed to delete coupon",
          variant: "destructive",
        })
      }
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      await api.put(`/coupons/${id}/toggle-active`, { isActive: !isActive })
      setCoupons(coupons.map((c) => (c.id === id ? { ...c, isActive: !isActive } : c)))
      toast({
        title: "Success",
        description: `Coupon ${!isActive ? "activated" : "deactivated"} successfully`,
      })
    } catch (error) {
      console.error("Error toggling coupon status:", error)
      toast({
        title: "Error",
        description: "Failed to update coupon status",
        variant: "destructive",
      })
    }
  }

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied!",
      description: `Coupon code "${code}" copied to clipboard`,
    })
  }

  const getValidityStatus = (coupon: Coupon) => {
    const now = new Date()
    const validFrom = new Date(coupon.validFrom)
    const validTo = new Date(coupon.validTo)

    if (!coupon.isActive) return { status: "inactive", color: "secondary" }
    if (now < validFrom) return { status: "upcoming", color: "secondary" }
    if (now > validTo) return { status: "expired", color: "destructive" }
    return { status: "active", color: "default" }
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      discountType: "all",
      isActive: "all",
      validityStatus: "all",
      dateRange: { start: "", end: "" },
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Coupons</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Coupon
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Coupon</DialogTitle>
            </DialogHeader>
            <CouponForm
              onSubmit={async (data) => {
                try {
                  const newCoupon = await api.post("/coupons", data)
                  setCoupons([...coupons, { ...data, id: newCoupon.id, createdAt: new Date().toISOString() }])
                  setShowCreateModal(false)
                  toast({
                    title: "Success",
                    description: "Coupon created successfully",
                  })
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create coupon",
                    variant: "destructive",
                  })
                }
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter Coupons</CardTitle>
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
              placeholder="Search coupon codes..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Discount Type</Label>
                <Select
                  value={filters.discountType}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, discountType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="percentage">Percentage</SelectItem>
                    <SelectItem value="fixed">Fixed Amount</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Status</Label>
                <Select
                  value={filters.isActive}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, isActive: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Validity</Label>
                <Select
                  value={filters.validityStatus}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, validityStatus: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="active">Currently Valid</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Created Date Range</Label>
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
          )}

          {/* Results and Clear */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredCoupons.length} of {coupons.length} coupons
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Coupon List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Valid Period</TableHead>
                <TableHead>Conditions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCoupons.map((coupon) => {
                const validity = getValidityStatus(coupon)
                return (
                  <TableRow key={coupon.id}>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-mono">
                          {coupon.code}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(coupon.code)}
                          className="h-6 w-6 p-0"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        {coupon.discountType === "percentage" ? (
                          <Percent className="h-4 w-4 text-green-600" />
                        ) : (
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="font-medium">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : `$${coupon.discountValue}`}
                        </span>
                      </div>
                      {coupon.maxDiscount && coupon.discountType === "percentage" && (
                        <div className="text-xs text-gray-500">Max: ${coupon.maxDiscount}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">
                          <Calendar className="h-3 w-3 inline mr-1" />
                          {new Date(coupon.validFrom).toLocaleDateString()}
                        </div>
                        <div className="text-sm text-gray-500">to {new Date(coupon.validTo).toLocaleDateString()}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {coupon.minPurchase ? (
                        <div className="text-sm">Min: ${coupon.minPurchase}</div>
                      ) : (
                        <div className="text-sm text-gray-500">No minimum</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={validity.color as any}>{validity.status}</Badge>
                        <div className="flex items-center space-x-1">
                          <div className={`w-2 h-2 rounded-full ${coupon.isActive ? "bg-green-500" : "bg-gray-400"}`} />
                          <span className="text-xs">{coupon.isActive ? "Active" : "Inactive"}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{new Date(coupon.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => setEditingCoupon(coupon)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Coupon</DialogTitle>
                            </DialogHeader>
                            {editingCoupon && (
                              <CouponForm
                                initialData={editingCoupon}
                                onSubmit={async (data) => {
                                  try {
                                    await api.put(`/coupons/${editingCoupon.id}`, data)
                                    setCoupons(coupons.map((c) => (c.id === editingCoupon.id ? { ...c, ...data } : c)))
                                    setEditingCoupon(null)
                                    toast({
                                      title: "Success",
                                      description: "Coupon updated successfully",
                                    })
                                  } catch (error) {
                                    toast({
                                      title: "Error",
                                      description: "Failed to update coupon",
                                      variant: "destructive",
                                    })
                                  }
                                }}
                                onCancel={() => setEditingCoupon(null)}
                              />
                            )}
                          </DialogContent>
                        </Dialog>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(coupon.id, coupon.isActive)}
                        >
                          {coupon.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(coupon.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredCoupons.length === 0 && (
            <div className="text-center py-8 text-gray-500">No coupons found matching your criteria.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Coupon Form Component
function CouponForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: Coupon
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    code: initialData?.code || "",
    discountType: initialData?.discountType || "percentage",
    discountValue: initialData?.discountValue?.toString() || "",
    validFrom: initialData?.validFrom ? initialData.validFrom.split("T")[0] : "",
    validTo: initialData?.validTo ? initialData.validTo.split("T")[0] : "",
    minPurchase: initialData?.minPurchase?.toString() || "",
    maxDiscount: initialData?.maxDiscount?.toString() || "",
    isActive: initialData?.isActive ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.code || !formData.discountValue || !formData.validFrom || !formData.validTo) {
      return
    }

    if (new Date(formData.validTo) <= new Date(formData.validFrom)) {
      return
    }

    const submitData = {
      code: formData.code.toUpperCase(),
      discountType: formData.discountType,
      discountValue: Number.parseFloat(formData.discountValue),
      validFrom: new Date(formData.validFrom).toISOString(),
      validTo: new Date(formData.validTo).toISOString(),
      minPurchase: formData.minPurchase ? Number.parseFloat(formData.minPurchase) : undefined,
      maxDiscount: formData.maxDiscount ? Number.parseFloat(formData.maxDiscount) : undefined,
      isActive: formData.isActive,
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="code">Coupon Code *</Label>
          <Input
            id="code"
            value={formData.code}
            onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
            placeholder="SAVE20"
            required
          />
        </div>
        <div>
          <Label htmlFor="discountType">Discount Type *</Label>
          <Select
            value={formData.discountType}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, discountType: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="percentage">Percentage</SelectItem>
              <SelectItem value="fixed">Fixed Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="discountValue">
            Discount Value * {formData.discountType === "percentage" ? "(%)" : "($)"}
          </Label>
          <Input
            id="discountValue"
            type="number"
            step="0.01"
            min="0"
            max={formData.discountType === "percentage" ? "100" : undefined}
            value={formData.discountValue}
            onChange={(e) => setFormData((prev) => ({ ...prev, discountValue: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="maxDiscount">Max Discount ($)</Label>
          <Input
            id="maxDiscount"
            type="number"
            step="0.01"
            min="0"
            value={formData.maxDiscount}
            onChange={(e) => setFormData((prev) => ({ ...prev, maxDiscount: e.target.value }))}
            disabled={formData.discountType === "fixed"}
          />
        </div>
        <div>
          <Label htmlFor="validFrom">Valid From *</Label>
          <Input
            id="validFrom"
            type="date"
            value={formData.validFrom}
            onChange={(e) => setFormData((prev) => ({ ...prev, validFrom: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="validTo">Valid To *</Label>
          <Input
            id="validTo"
            type="date"
            value={formData.validTo}
            onChange={(e) => setFormData((prev) => ({ ...prev, validTo: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="minPurchase">Minimum Purchase ($)</Label>
          <Input
            id="minPurchase"
            type="number"
            step="0.01"
            min="0"
            value={formData.minPurchase}
            onChange={(e) => setFormData((prev) => ({ ...prev, minPurchase: e.target.value }))}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isActive: checked as boolean }))}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit">{initialData ? "Update" : "Create"} Coupon</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
