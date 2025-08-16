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
import {
  Trash2,
  Star,
  Search,
  Filter,
  X,
  Eye,
  ThumbsUp,
  Flag,
  Shield,
  ShieldCheck,
  Package,
  Gamepad2,
  Clock,
  Monitor,
  ImageIcon,
  Play,
} from "lucide-react"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import Image from "next/image"

interface ReviewUser {
  id: string
  name: string
  avatar: string
  verified: boolean
}

interface AdminReview {
  id: string
  product?: {
    id: string
    name: string
    image: string
  }
  game?: {
    id: string
    name: string
    image: string
  }
  user: ReviewUser
  rating: number
  title: string
  comment: string
  verifiedPurchase: boolean
  helpfulVotes: number
  reported: boolean
  reportReason?: string
  media: string[]
  platform?: "PC" | "PlayStation" | "Xbox" | "Nintendo" | "Mobile" | "VR"
  playtimeHours?: number
  createdAt: string
  updatedAt: string
}

interface ReviewFilters {
  search: string
  type: string // "all", "product", "game"
  rating: string
  verifiedPurchase: string
  reported: string
  platform: string
  dateRange: {
    start: string
    end: string
  }
  helpfulVotes: {
    min: string
    max: string
  }
}

export default function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [selectedReview, setSelectedReview] = useState<AdminReview | null>(null)
  const [showReviewDetails, setShowReviewDetails] = useState(false)

  const [filters, setFilters] = useState<ReviewFilters>({
    search: "",
    type: "all",
    rating: "all",
    verifiedPurchase: "all",
    reported: "all",
    platform: "all",
    dateRange: { start: "", end: "" },
    helpfulVotes: { min: "", max: "" },
  })

  const { toast } = useToast()

  const platforms = ["PC", "PlayStation", "Xbox", "Nintendo", "Mobile", "VR"]
  const ratings = [1, 2, 3, 4, 5]

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const data = await api.get("/admin/reviews")
      setReviews(data)
    } catch (error) {
      console.error("Error fetching reviews:", error)
      toast({
        title: "Error",
        description: "Failed to fetch reviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      // Search filter
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        const matchesSearch =
          review.title.toLowerCase().includes(searchTerm) ||
          review.comment.toLowerCase().includes(searchTerm) ||
          review.user.name.toLowerCase().includes(searchTerm) ||
          (review.product?.name || review.game?.name || "").toLowerCase().includes(searchTerm)
        if (!matchesSearch) return false
      }

      // Type filter
      if (filters.type === "product" && !review.product) return false
      if (filters.type === "game" && !review.game) return false

      // Rating filter
      if (filters.rating !== "all" && review.rating !== Number.parseInt(filters.rating)) return false

      // Verified purchase filter
      if (filters.verifiedPurchase === "true" && !review.verifiedPurchase) return false
      if (filters.verifiedPurchase === "false" && review.verifiedPurchase) return false

      // Reported filter
      if (filters.reported === "true" && !review.reported) return false
      if (filters.reported === "false" && review.reported) return false

      // Platform filter (for game reviews)
      if (filters.platform !== "all" && review.platform !== filters.platform) return false

      // Date range filter
      if (filters.dateRange.start && new Date(review.createdAt) < new Date(filters.dateRange.start)) return false
      if (filters.dateRange.end && new Date(review.createdAt) > new Date(filters.dateRange.end)) return false

      // Helpful votes filter
      if (filters.helpfulVotes.min && review.helpfulVotes < Number.parseInt(filters.helpfulVotes.min)) return false
      if (filters.helpfulVotes.max && review.helpfulVotes > Number.parseInt(filters.helpfulVotes.max)) return false

      return true
    })
  }, [reviews, filters])

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this review? This action cannot be undone.")) {
      try {
        await api.delete(`/admin/reviews/${id}`)
        setReviews(reviews.filter((r) => r.id !== id))
        toast({
          title: "Success",
          description: "Review deleted successfully",
        })
      } catch (error) {
        console.error("Error deleting review:", error)
        toast({
          title: "Error",
          description: "Failed to delete review",
          variant: "destructive",
        })
      }
    }
  }

  const handleToggleReported = async (id: string, reported: boolean) => {
    try {
      await api.put(`/admin/reviews/${id}/toggle-reported`, { reported: !reported })
      setReviews(reviews.map((r) => (r.id === id ? { ...r, reported: !reported } : r)))
      toast({
        title: "Success",
        description: `Review ${!reported ? "marked as reported" : "unmarked as reported"}`,
      })
    } catch (error) {
      console.error("Error toggling review report status:", error)
      toast({
        title: "Error",
        description: "Failed to update review status",
        variant: "destructive",
      })
    }
  }

  const handleMarkHelpful = async (id: string) => {
    try {
      await api.put(`/admin/reviews/${id}/mark-helpful`)
      setReviews(reviews.map((r) => (r.id === id ? { ...r, helpfulVotes: r.helpfulVotes + 1 } : r)))
      toast({
        title: "Success",
        description: "Review marked as helpful",
      })
    } catch (error) {
      console.error("Error marking review as helpful:", error)
      toast({
        title: "Error",
        description: "Failed to mark review as helpful",
        variant: "destructive",
      })
    }
  }

  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`h-4 w-4 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
        ))}
      </div>
    )
  }

  const getReviewTypeIcon = (review: AdminReview) => {
    return review.product ? (
      <Package className="h-4 w-4 text-blue-600" />
    ) : (
      <Gamepad2 className="h-4 w-4 text-purple-600" />
    )
  }

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "PC":
        return <Monitor className="h-3 w-3" />
      case "PlayStation":
      case "Xbox":
      case "Nintendo":
        return <Gamepad2 className="h-3 w-3" />
      default:
        return <Monitor className="h-3 w-3" />
    }
  }

  const clearFilters = () => {
    setFilters({
      search: "",
      type: "all",
      rating: "all",
      verifiedPurchase: "all",
      reported: "all",
      platform: "all",
      dateRange: { start: "", end: "" },
      helpfulVotes: { min: "", max: "" },
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews</h1>
        <div className="flex space-x-2">
          <Badge variant="outline" className="text-sm">
            Total: {reviews.length}
          </Badge>
          <Badge variant="destructive" className="text-sm">
            Reported: {reviews.filter((r) => r.reported).length}
          </Badge>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Search & Filter Reviews</CardTitle>
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
              placeholder="Search by title, comment, user, or product/game name..."
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="pl-10"
            />
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Review Type</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Reviews</SelectItem>
                    <SelectItem value="product">Product Reviews</SelectItem>
                    <SelectItem value="game">Game Reviews</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Rating</Label>
                <Select
                  value={filters.rating}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, rating: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Ratings" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Ratings</SelectItem>
                    {ratings.map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} Star{rating !== 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Verified Purchase</Label>
                <Select
                  value={filters.verifiedPurchase}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, verifiedPurchase: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Verified Only</SelectItem>
                    <SelectItem value="false">Unverified Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Report Status</Label>
                <Select
                  value={filters.reported}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, reported: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="true">Reported</SelectItem>
                    <SelectItem value="false">Not Reported</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">Platform (Games)</Label>
                <Select
                  value={filters.platform}
                  onValueChange={(value) => setFilters((prev) => ({ ...prev, platform: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Platforms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Platforms</SelectItem>
                    {platforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {platform}
                      </SelectItem>
                    ))}
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
                <Label className="text-sm font-medium mb-2 block">Helpful Votes</Label>
                <div className="flex space-x-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.helpfulVotes.min}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, helpfulVotes: { ...prev.helpfulVotes, min: e.target.value } }))
                    }
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.helpfulVotes.max}
                    onChange={(e) =>
                      setFilters((prev) => ({ ...prev, helpfulVotes: { ...prev.helpfulVotes, max: e.target.value } }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* Results and Clear */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-sm text-gray-600">
              Showing {filteredReviews.length} of {reviews.length} reviews
            </div>
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Table */}
      <Card>
        <CardHeader>
          <CardTitle>Review List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product/Game</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Engagement</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReviews.map((review) => (
                <TableRow key={review.id} className={review.reported ? "bg-red-50 dark:bg-red-950/20" : ""}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Image
                        src={
                          review.product?.image ||
                          review.game?.image ||
                          "/placeholder.svg?height=40&width=40&query=product"
                        }
                        alt={review.product?.name || review.game?.name || "Item"}
                        width={40}
                        height={40}
                        className="rounded-md object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-2">
                          {getReviewTypeIcon(review)}
                          <span className="font-medium text-sm">
                            {review.product?.name || review.game?.name || "Unknown"}
                          </span>
                        </div>
                        {review.platform && (
                          <div className="flex items-center space-x-1 mt-1">
                            {getPlatformIcon(review.platform)}
                            <span className="text-xs text-gray-500">{review.platform}</span>
                          </div>
                        )}
                        {review.playtimeHours !== undefined && (
                          <div className="flex items-center space-x-1 mt-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-xs text-gray-500">{review.playtimeHours}h played</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Image
                        src={review.user.avatar || "/placeholder.svg?height=32&width=32&query=user"}
                        alt={review.user.name}
                        width={32}
                        height={32}
                        className="rounded-full object-cover"
                      />
                      <div>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium text-sm">{review.user.name}</span>
                          {review.user.verified && <ShieldCheck className="h-3 w-3 text-blue-600" />}
                        </div>
                        {review.verifiedPurchase && (
                          <Badge variant="outline" className="text-xs mt-1">
                            Verified Purchase
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs">
                      <div className="font-medium text-sm mb-1 truncate">{review.title}</div>
                      <div className="text-sm text-gray-600 line-clamp-2">{review.comment}</div>
                      {review.media.length > 0 && (
                        <div className="flex items-center space-x-1 mt-2">
                          <ImageIcon className="h-3 w-3 text-gray-500" />
                          <span className="text-xs text-gray-500">{review.media.length} media</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {renderStars(review.rating)}
                      <div className="text-xs text-gray-500">{review.rating}/5</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {review.reported ? (
                        <Badge variant="destructive" className="text-xs">
                          <Flag className="h-3 w-3 mr-1" />
                          Reported
                        </Badge>
                      ) : (
                        <Badge variant="default" className="text-xs">
                          Active
                        </Badge>
                      )}
                      {review.reportReason && (
                        <div className="text-xs text-red-600 truncate max-w-20" title={review.reportReason}>
                          {review.reportReason}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <ThumbsUp className="h-3 w-3 text-green-600" />
                      <span className="text-sm font-medium">{review.helpfulVotes}</span>
                      <span className="text-xs text-gray-500">helpful</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="text-sm">{new Date(review.createdAt).toLocaleDateString()}</div>
                      <div className="text-xs text-gray-500">{new Date(review.createdAt).toLocaleTimeString()}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" onClick={() => setSelectedReview(review)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Review Details</DialogTitle>
                          </DialogHeader>
                          {selectedReview && (
                            <ReviewDetailsModal
                              review={selectedReview}
                              onToggleReported={handleToggleReported}
                              onMarkHelpful={handleMarkHelpful}
                              onDelete={handleDelete}
                            />
                          )}
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleReported(review.id, review.reported)}
                      >
                        {review.reported ? <Shield className="h-4 w-4" /> : <Flag className="h-4 w-4" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleMarkHelpful(review.id)}>
                        <ThumbsUp className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(review.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredReviews.length === 0 && (
            <div className="text-center py-8 text-gray-500">No reviews found matching your criteria.</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Review Details Modal Component
function ReviewDetailsModal({
  review,
  onToggleReported,
  onMarkHelpful,
  onDelete,
}: {
  review: AdminReview
  onToggleReported: (id: string, reported: boolean) => void
  onMarkHelpful: (id: string) => void
  onDelete: (id: string) => void
}) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star key={star} className={`h-5 w-5 ${star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"}`} />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Review Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product/Game Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Image
                src={review.product?.image || review.game?.image || "/placeholder.svg?height=80&width=80&query=product"}
                alt={review.product?.name || review.game?.name || "Item"}
                width={80}
                height={80}
                className="rounded-lg object-cover"
              />
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  {review.product ? (
                    <Package className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Gamepad2 className="h-5 w-5 text-purple-600" />
                  )}
                  <span className="font-semibold">{review.product?.name || review.game?.name}</span>
                </div>
                <Badge variant="outline">{review.product ? "Product" : "Game"}</Badge>
                {review.platform && (
                  <div className="flex items-center space-x-1 mt-2">
                    <Monitor className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{review.platform}</span>
                  </div>
                )}
                {review.playtimeHours !== undefined && (
                  <div className="flex items-center space-x-1 mt-1">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{review.playtimeHours} hours played</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Reviewer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Image
                src={review.user.avatar || "/placeholder.svg?height=60&width=60&query=user"}
                alt={review.user.name}
                width={60}
                height={60}
                className="rounded-full object-cover"
              />
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-semibold">{review.user.name}</span>
                  {review.user.verified && <ShieldCheck className="h-4 w-4 text-blue-600" />}
                </div>
                {review.verifiedPurchase && (
                  <Badge variant="default" className="text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1" />
                    Verified Purchase
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Content */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium text-gray-600">Rating</Label>
              <div className="flex items-center space-x-2 mt-1">
                {renderStars(review.rating)}
                <span className="text-lg font-semibold">{review.rating}/5</span>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Title</Label>
              <h3 className="text-lg font-semibold mt-1">{review.title}</h3>
            </div>
            <div>
              <Label className="text-sm font-medium text-gray-600">Comment</Label>
              <p className="text-gray-800 dark:text-gray-200 mt-1 leading-relaxed">{review.comment}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Media */}
      {review.media.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Review Media</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {review.media.map((mediaUrl, index) => (
                <div key={index} className="relative">
                  {mediaUrl.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                    <Image
                      src={mediaUrl || "/placeholder.svg"}
                      alt={`Review media ${index + 1}`}
                      width={150}
                      height={150}
                      className="rounded-lg object-cover w-full h-32"
                    />
                  ) : (
                    <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                      <Play className="h-8 w-8 text-gray-500" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review Stats & Status */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Review Statistics & Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Helpful Votes:</span>
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{review.helpfulVotes}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <Badge variant={review.reported ? "destructive" : "default"}>
                  {review.reported ? "Reported" : "Active"}
                </Badge>
              </div>
              {review.reported && review.reportReason && (
                <div className="flex items-start justify-between">
                  <span className="text-sm text-gray-600">Report Reason:</span>
                  <span className="text-sm text-red-600 max-w-40 text-right">{review.reportReason}</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm">{new Date(review.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Updated:</span>
                <span className="text-sm">{new Date(review.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Admin Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Admin Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => onToggleReported(review.id, review.reported)} variant="outline">
              {review.reported ? (
                <>
                  <Shield className="h-4 w-4 mr-2" />
                  Unreport Review
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Report Review
                </>
              )}
            </Button>
            <Button onClick={() => onMarkHelpful(review.id)} variant="outline">
              <ThumbsUp className="h-4 w-4 mr-2" />
              Mark as Helpful
            </Button>
            <Button onClick={() => onDelete(review.id)} variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Review
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
