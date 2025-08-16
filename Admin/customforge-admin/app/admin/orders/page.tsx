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
import { Separator } from "@/components/ui/separator"
import { Eye, Search, Filter, X, CreditCard, Truck, CheckCircle, RefreshCw } from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface OrderItem {
  product: string
  name: string
  image: string
  price: number
  quantity: number
}

interface ShippingAddress {
  fullName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
}

interface PaymentResult {
  id: string
  status: "succeeded" | "failed" | "pending" | "refunded"
  update_time: string
  email_address: string
  payment_method: "stripe" | "paypal" | "cod"
}

interface Order {
  id: string
  user: {
    id: string
    name: string
    email: string
  }
  orderItems: OrderItem[]
  shippingAddress: ShippingAddress
  paymentMethod: "stripe" | "paypal" | "cod"
  paymentResult: PaymentResult
  itemsPrice: number
  taxPrice: number
  shippingPrice: number
  totalPrice: number
  isPaid: boolean
  paidAt?: string
  isDelivered: boolean
  deliveredAt?: string
  refundedAt?: string
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded"
  createdAt: string
  updatedAt: string
}

interface OrderFilters {
  search: string
  status: string
  paymentMethod: string
  isPaid: string
  isDelivered: string
  dateRange: {
    start: string
    end: string
  }
  priceRange: {
    min: string
    max: string
  }
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    status: "all",
    paymentMethod: "all",
    isPaid: "all",
    isDelivered: "all",
    dateRange: { start: "", end: "" },
    priceRange: { min: "", max: "" },
  })

  const { toast } = useToast()

  const statusOptions = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]
  const paymentMethods = ["stripe", "paypal", "cod"]

  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      const data = await api.get("/orders")
      setOrders(data)
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast({
        title: "Error",
        description: "Failed to fetch orders",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          order.id.toLowerCase().includes(searchTerm) ||
          order.user.name.toLowerCase().includes(searchTerm) ||
          order.user.email.toLowerCase().includes(searchTerm) ||
          order.shippingAddress.fullName.toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false
      }

      // Status filter
      if (filters.status !== "all" && order.status !== filters.status) return false

      // Payment method filter
      if (filters.paymentMethod !== "all" && order.paymentMethod !== filters.paymentMethod) return false

      // Payment status filter
      if (filters.isPaid === "true" && !order.isPaid) return false
      if (filters.isPaid === "false" && order.isPaid) return false

      // Delivery status filter
      if (filters.isDelivered === "true" && !order.isDelivered) return false
      if (filters.isDelivered === "false" && order.isDelivered) return false

      // Date range filter
      if (filters.dateRange.start && new Date(order.createdAt) < new Date(filters.dateRange.start)) return false
      if (filters.dateRange.end && new Date(order.createdAt) > new Date(filters.dateRange.end)) return false

      // Price range filter
      if (filters.priceRange.min && order.totalPrice < Number.parseFloat(filters.priceRange.min)) return false
      if (filters.priceRange.max && order.totalPrice > Number.parseFloat(filters.priceRange.max)) return false

      return true
    })
  }, [orders, filters])

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      await api.put(`/orders/${orderId}/status`, { status: newStatus })
      setOrders(orders.map((order) => (order.id === orderId ? { ...order, status: newStatus as any } : order)))
      toast({
        title: "Success",
        description: "Order status updated successfully",
      })
    } catch (error) {
      console.error("Error updating order status:", error)
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      })
    }
  }

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/mark-paid`)
      setOrders(
        orders.map((order) =>
          order.id === orderId ? { ...order, isPaid: true, paidAt: new Date().toISOString() } : order,
        ),
      )
      toast({
        title: "Success",
        description: "Order marked as paid",
      })
    } catch (error) {
      console.error("Error marking order as paid:", error)
      toast({
        title: "Error",
        description: "Failed to mark order as paid",
        variant: "destructive",
      })
    }
  }

  const handleMarkAsDelivered = async (orderId: string) => {
    try {
      await api.put(`/orders/${orderId}/deliver`)
      setOrders(
        orders.map((order) =>
          order.id === orderId
            ? { ...order, isDelivered: true, deliveredAt: new Date().toISOString(), status: "delivered" }
            : order,
        ),
      )
      toast({
        title: "Success",
        description: "Order marked as delivered",
      })
    } catch (error) {
      console.error("Error marking order as delivered:", error)
      toast({
        title: "Error",
        description: "Failed to mark order as delivered",
        variant: "destructive",
      })
    }
  }
  
  const handleRefund = async (orderId: string) => {
    if (confirm("Are you sure you want to process a refund for this order?")) {
      try {
        await api.post(`/orders/${orderId}/refund`) // use POST to match backend
        setOrders(
          orders.map((order) =>
            order.id === orderId
              ? { ...order, status: "refunded", refundedAt: new Date().toISOString() }
              : order,
          ),
        )
        toast({
          title: "Success",
          description: "Refund processed successfully",
        })
      } catch (error) {
        console.error("Error processing refund:", error)
        toast({
          title: "Error",
          description: "Failed to process refund",
          variant: "destructive",
        })
      }
    }
  }  

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "secondary"
      case "processing":
        return "default"
      case "shipped":
        return "default"
      case "delivered":
        return "default"
      case "cancelled":
        return "destructive"
      case "refunded":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getPaymentStatusColor = (isPaid: boolean) => {
    return isPaid ? "default" : "destructive"
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      status: "all",
      paymentMethod: "all",
      isPaid: "all",
      isDelivered: "all",
      dateRange: { start: "", end: "" },
      priceRange: { min: "", max: "" },
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter Orders</CardTitle>
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
              placeholder="Search by order ID, customer name, or email..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Order Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Payment Method</Label>
                <Select
                  value={filters.paymentMethod}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, paymentMethod: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Methods" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Methods</SelectItem>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Payment Status</Label>
                <Select
                  value={filters.isPaid}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, isPaid: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Paid</SelectItem>
                    <SelectItem value="false">Unpaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Delivery Status</Label>
                <Select
                  value={filters.isDelivered}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, isDelivered: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Delivered</SelectItem>
                    <SelectItem value="false">Not Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Date Range</Label>
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

              <div>
                <Label className="text-sm font-medium mb-2 block">Price Range</Label>
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
            </div>
          )}

          {/* Results and Clear */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Order List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{order.user.name}</div>
                      <div className="text-sm text-gray-500">{order.user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{order.orderItems.length} items</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">${order.totalPrice.toFixed(2)}</div>
                      <div className="text-sm text-gray-500">{order.paymentMethod.toUpperCase()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getPaymentStatusColor(order.isPaid)}>{order.isPaid ? "Paid" : "Unpaid"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={getStatusColor(order.status)}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </Badge>
                      {order.isDelivered && (
                        <div className="text-xs text-green-600">
                          <CheckCircle className="h-3 w-3 inline mr-1" />
                          Delivered
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Order Details - #{order.id}</DialogTitle>
                          </DialogHeader>
                          {selectedOrder && (
                            <OrderDetailsModal
                              order={selectedOrder}
                              onStatusUpdate={handleStatusUpdate}
                              onMarkAsPaid={handleMarkAsPaid}
                              onMarkAsDelivered={handleMarkAsDelivered}
                              onRefund={handleRefund}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredOrders.length === 0 && (
            <div className="text-center py-8 text-gray-500">No orders found matching your criteria.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Order Details Modal Component
function OrderDetailsModal({
  order,
  onStatusUpdate,
  onMarkAsPaid,
  onMarkAsDelivered,
  onRefund,
}: {
  order: Order
  onStatusUpdate: (orderId: string, status: string) => void
  onMarkAsPaid: (orderId: string) => void
  onMarkAsDelivered: (orderId: string) => void
  onRefund: (orderId: string) => void
}) {
  const statusOptions = ["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]

  return (
    <div className="space-y-6">
      {/* Order Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Order Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Order ID:</span>
              <span className="font-medium">#{order.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Status:</span>
              <Badge variant={getStatusColor(order.status)}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span>{new Date(order.createdAt).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Updated:</span>
              <span>{new Date(order.updatedAt).toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Name:</span>
              <span className="font-medium">{order.user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Email:</span>
              <span>{order.user.email}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            <div className="font-medium">{order.shippingAddress.fullName}</div>
            <div>{order.shippingAddress.address}</div>
            <div>
              {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
            </div>
            <div>{order.shippingAddress.country}</div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Order Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {order.orderItems.map((item, index) => (
              <div key={index} className="flex items-center space-x-4 p-4 border rounded-lg">
                <Image
                  src={item.image || "/placeholder.svg?height=60&width=60"}
                  alt={item.name}
                  width={60}
                  height={60}
                  className="rounded-md object-cover"
                />
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-sm text-gray-600">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </div>
                </div>
                <div className="font-medium">${(item.price * item.quantity).toFixed(2)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Items Price:</span>
              <span>${order.itemsPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Tax:</span>
              <span>${order.taxPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Shipping:</span>
              <span>${order.shippingPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${order.totalPrice.toFixed(2)}</span>
            </div>
          </div>
          <Separator />
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Method:</span>
              <span className="font-medium">{order.paymentMethod.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Payment Status:</span>
              <Badge variant={getPaymentStatusColor(order.isPaid)}>{order.isPaid ? "Paid" : "Unpaid"}</Badge>
            </div>
            {order.isPaid && order.paidAt && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Paid At:</span>
                <span>{new Date(order.paidAt).toLocaleString()}</span>
              </div>
            )}
            {order.paymentResult && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment ID:</span>
                  <span className="font-mono text-sm">{order.paymentResult.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Payment Email:</span>
                  <span>{order.paymentResult.email_address}</span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Update Status</Label>
              <Select value={order.status} onValueChange={(value) => onStatusUpdate(order.id, value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              {!order.isPaid && (
                <Button onClick={() => onMarkAsPaid(order.id)} className="w-full">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
              )}
              {order.isPaid && !order.isDelivered && (
                <Button onClick={() => onMarkAsDelivered(order.id)} className="w-full">
                  <Truck className="h-4 w-4 mr-2" />
                  Mark as Delivered
                </Button>
              )}
              {order.status === "delivered" && (
                <Button onClick={() => onRefund(order.id)} variant="destructive" className="w-full">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Process Refund
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "secondary"
    case "processing":
      return "default"
    case "shipped":
      return "default"
    case "delivered":
      return "default"
    case "cancelled":
      return "destructive"
    case "refunded":
      return "destructive"
    default:
      return "secondary"
  }
}

function getPaymentStatusColor(isPaid: boolean) {
  return isPaid ? "default" : "destructive"
}
