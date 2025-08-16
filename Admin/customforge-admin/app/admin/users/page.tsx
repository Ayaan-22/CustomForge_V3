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
import { Separator } from "@/components/ui/separator"
import {
  Eye,
  Trash2,
  Search,
  Filter,
  X,
  Mail,
  Shield,
  ShieldCheck,
  User,
  Crown,
  Building,
  Heart,
  MapPin,
  CreditCard,
  UserCheck,
  UserX,
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface Address {
  id: string
  fullName: string
  address: string
  city: string
  state: string
  postalCode: string
  country: string
  isDefault: boolean
}

interface PaymentMethod {
  id: string
  type: "card" | "paypal"
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

interface AdminUser {
  id: string
  name: string
  email: string
  role: "user" | "publisher" | "admin"
  avatar: string
  isEmailVerified: boolean
  twoFactorEnabled: boolean
  active: boolean
  wishlist: string[]
  addresses: Address[]
  paymentMethods: PaymentMethod[]
  createdAt: string
  updatedAt: string
  passwordChangedAt?: string
}

interface UserFilters {
  search: string
  role: string
  isEmailVerified: string
  twoFactorEnabled: string
  active: string
  dateRange: {
    start: string
    end: string
  }
}

export default function Users() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)

  const [filters, setFilters] = useState<UserFilters>({
    search: "",
    role: "all",
    isEmailVerified: "all",
    twoFactorEnabled: "all",
    active: "all",
    dateRange: { start: "", end: "" },
  })

  const { toast } = useToast()

  const roles = ["user", "publisher", "admin"]

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const data = await api.get("/admin/users")
      setUsers(data.data)
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          user.name.toLowerCase().includes(searchTerm) ||
          user.email.toLowerCase().includes(searchTerm) ||
          user.id.toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false
      }

      // Role filter
      if (filters.role !== "all" && user.role !== filters.role) return false

      // Email verification filter
      if (filters.isEmailVerified === "true" && !user.isEmailVerified) return false
      if (filters.isEmailVerified === "false" && user.isEmailVerified) return false

      // Two-factor filter
      if (filters.twoFactorEnabled === "true" && !user.twoFactorEnabled) return false
      if (filters.twoFactorEnabled === "false" && user.twoFactorEnabled) return false

      // Active status filter
      if (filters.active === "true" && !user.active) return false
      if (filters.active === "false" && user.active) return false

      // Date range filter
      if (filters.dateRange.start && new Date(user.createdAt) < new Date(filters.dateRange.start)) return false
      if (filters.dateRange.end && new Date(user.createdAt) > new Date(filters.dateRange.end)) return false

      return true
    })
  }, [users, filters])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      try {
        await api.delete(`/admin/users/${id}`)
        setUsers(users.filter((u) => u.id !== id))
        toast({
          title: "Success",
          description: "User deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting user:", error)
        toast({
          title: "Error",
          description: "Failed to delete user",
          variant: "destructive",
        })
      }
    }
  }

  const handleToggleActive = async (id: string, active: boolean) => {
    try {
      await api.put(`/admin/users/${id}/toggle-active`, { active: !active })
      setUsers(users.map((u) => (u.id === id ? { ...u, active: !active } : u)))
      toast({
        title: "Success",
        description: `User ${!active ? "activated" : "deactivated"} successfully`,
      })
    } catch (error) {
      console.error("Error toggling user status:", error)
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      })
    }
  }

  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${id}/role`, { role: newRole })
      setUsers(users.map((u) => (u.id === id ? { ...u, role: newRole as any } : u)))
      toast({
        title: "Success",
        description: "User role updated successfully",
      })
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Error",
        description: "Failed to update user role",
        variant: "destructive",
      })
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4 text-yellow-600" />
      case "publisher":
        return <Building className="h-4 w-4 text-blue-600" />
      default:
        return <User className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "default"
      case "publisher":
        return "secondary"
      default:
        return "outline"
    }
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      role: "all",
      isEmailVerified: "all",
      twoFactorEnabled: "all",
      active: "all",
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Users</h1>
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogTrigger asChild>
            <Button>
              <User className="h-4 w-4 mr-2" />
              Create User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <UserForm
              onSubmit={async (data) => {
                try {
                  const newUser = await api.post("/admin/users", data)
                  setUsers([
                    ...users,
                    {
                      ...data,
                      id: newUser.id,
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    },
                  ])
                  setShowCreateModal(false)
                  toast({
                    title: "Success",
                    description: "User created successfully",
                  })
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to create user",
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
            <CardTitle>Search & Filter Users</CardTitle>
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
              placeholder="Search by name, email, or ID..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Role</Label>
                <Select
                  value={filters.role}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Email Verified</Label>
                <Select
                  value={filters.isEmailVerified}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, isEmailVerified: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Two-Factor Auth</Label>
                <Select
                  value={filters.twoFactorEnabled}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, twoFactorEnabled: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Account Status</Label>
                <Select
                  value={filters.active}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, active: value }))}
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

              <div className="md:col-span-2">
                <Label className="text-sm font-medium mb-2 block">Registration Date Range</Label>
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
              Showing {filteredUsers.length} of {users.length} users
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Security</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Registered</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Image
                        src={user.avatar || "/placeholder.svg?height=40&width=40"}
                        alt={user.name}
                        width={40}
                        height={40}
                        className="rounded-full object-cover"
                      />
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        <div className="text-xs text-gray-400">ID: {user.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getRoleIcon(user.role)}
                      <Badge variant={getRoleColor(user.role) as any}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge variant={user.active ? "default" : "destructive"}>
                        {user.active ? "Active" : "Inactive"}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        {user.isEmailVerified ? (
                          <Mail className="h-3 w-3 text-green-600" />
                        ) : (
                          <Mail className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs">{user.isEmailVerified ? "Verified" : "Unverified"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        {user.twoFactorEnabled ? (
                          <ShieldCheck className="h-3 w-3 text-green-600" />
                        ) : (
                          <Shield className="h-3 w-3 text-gray-400" />
                        )}
                        <span className="text-xs">2FA {user.twoFactorEnabled ? "On" : "Off"}</span>
                      </div>
                      {user.passwordChangedAt && (
                        <div className="text-xs text-gray-500">
                          Pwd: {new Date(user.passwordChangedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1">
                        <Heart className="h-3 w-3 text-red-500" />
                        <span className="text-xs">{user.wishlist?.length || 0} items</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-blue-500" />
                        <span className="text-xs">{user.addresses?.length || 0} addresses</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CreditCard className="h-3 w-3 text-purple-500" />
                        <span className="text-xs">{user.paymentMethods?.length || 0} payments</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{new Date(user.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">
                        Updated: {new Date(user.updatedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedUser(user)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>User Details - {user.name}</DialogTitle>
                          </DialogHeader>
                          {selectedUser && (
                            <UserDetailsModal
                              user={selectedUser}
                              onRoleChange={handleRoleChange}
                              onToggleActive={handleToggleActive}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Select value={user.role} onValueChange={(value) => handleRoleChange(user.id, value)}>
                        <SelectTrigger className="w-24 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role.charAt(0).toUpperCase() + role.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(user.id, user.active)}>
                        {user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(user.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-gray-500">No users found matching your criteria.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// User Details Modal Component
function UserDetailsModal({
  user,
  onRoleChange,
  onToggleActive,
}: {
  user: AdminUser
  onRoleChange: (id: string, role: string) => void
  onToggleActive: (id: string, active: boolean) => void
}) {
  return (
    <div className="space-y-6">
      {/* User Profile */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Profile Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Image
                src={user.avatar || "/placeholder.svg?height=80&width=80"}
                alt={user.name}
                width={80}
                height={80}
                className="rounded-full object-cover"
              />
              <div>
                <h3 className="text-lg font-semibold">{user.name}</h3>
                <p className="text-gray-600">{user.email}</p>
                <p className="text-sm text-gray-500">ID: {user.id}</p>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Role:</span>
                <Badge variant={getRoleColor(user.role) as any}>
                  {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={user.active ? "default" : "destructive"}>{user.active ? "Active" : "Inactive"}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Email Verified:</span>
                <Badge variant={user.isEmailVerified ? "default" : "secondary"}>
                  {user.isEmailVerified ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Two-Factor Auth:</span>
                <Badge variant={user.twoFactorEnabled ? "default" : "secondary"}>
                  {user.twoFactorEnabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Wishlist Items</span>
                </div>
                <span className="font-medium">{user.wishlist?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Saved Addresses</span>
                </div>
                <span className="font-medium">{user.addresses?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Payment Methods</span>
                </div>
                <span className="font-medium">{user.paymentMethods?.length || 0}</span>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Registered:</span>
                <span className="text-sm">{new Date(user.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Last Updated:</span>
                <span className="text-sm">{new Date(user.updatedAt).toLocaleString()}</span>
              </div>
              {user.passwordChangedAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Password Changed:</span>
                  <span className="text-sm">{new Date(user.passwordChangedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Addresses */}
      {user.addresses && user.addresses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Saved Addresses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.addresses.map((address, index) => (
                <div key={address.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{address.fullName}</h4>
                    {address.isDefault && <Badge variant="outline">Default</Badge>}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div>{address.address}</div>
                    <div>
                      {address.city}, {address.state} {address.postalCode}
                    </div>
                    <div>{address.country}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      {user.paymentMethods && user.paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Methods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user.paymentMethods.map((method, index) => (
                <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-gray-500" />
                    <div>
                      <div className="font-medium">
                        {method.type === "card" ? `${method.brand} ****${method.last4}` : "PayPal"}
                      </div>
                      {method.type === "card" && method.expiryMonth && method.expiryYear && (
                        <div className="text-sm text-gray-500">
                          Expires {method.expiryMonth.toString().padStart(2, "0")}/{method.expiryYear}
                        </div>
                      )}
                    </div>
                  </div>
                  {method.isDefault && <Badge variant="outline">Default</Badge>}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Change Role</Label>
              <Select value={user.role} onValueChange={(value) => onRoleChange(user.id, value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="publisher">Publisher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Button
                onClick={() => onToggleActive(user.id, user.active)}
                variant={user.active ? "destructive" : "default"}
                className="w-full"
              >
                {user.active ? (
                  <>
                    <UserX className="h-4 w-4 mr-2" />
                    Deactivate Account
                  </>
                ) : (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Activate Account
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// User Form Component
function UserForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: AdminUser
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    email: initialData?.email || "",
    password: "",
    role: initialData?.role || "user",
    avatar: initialData?.avatar || "",
    isEmailVerified: initialData?.isEmailVerified ?? false,
    twoFactorEnabled: initialData?.twoFactorEnabled ?? false,
    active: initialData?.active ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.name || !formData.email || (!initialData && !formData.password)) {
      return
    }

    const submitData = {
      ...formData,
      ...(formData.password && { password: formData.password }),
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            maxLength={50}
            required
          />
        </div>
        <div>
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="password">{initialData ? "New Password" : "Password *"}</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            minLength={8}
            required={!initialData}
          />
        </div>
        <div>
          <Label htmlFor="role">Role</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value as any }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="publisher">Publisher</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="avatar">Avatar URL</Label>
          <Input
            id="avatar"
            value={formData.avatar}
            onChange={(e) => setFormData((prev) => ({ ...prev, avatar: e.target.value }))}
            placeholder="https://example.com/avatar.jpg"
          />
        </div>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isEmailVerified"
              checked={formData.isEmailVerified}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, isEmailVerified: checked as boolean }))}
            />
            <Label htmlFor="isEmailVerified">Email Verified</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="twoFactorEnabled"
              checked={formData.twoFactorEnabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, twoFactorEnabled: checked as boolean }))}
            />
            <Label htmlFor="twoFactorEnabled">Two-Factor Authentication</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="active"
              checked={formData.active}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, active: checked as boolean }))}
            />
            <Label htmlFor="active">Account Active</Label>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 pt-4">
        <Button type="submit">{initialData ? "Update" : "Create"} User</Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

function getRoleColor(role: string) {
  switch (role) {
    case "admin":
      return "default"
    case "publisher":
      return "secondary"
    default:
      return "outline"
  }
}
