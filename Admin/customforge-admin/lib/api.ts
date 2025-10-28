import axios from "axios"

// Mock API implementation for development
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

axios.defaults.withCredentials = true

const BASE_URL = "http://localhost:5000/api/v1"

// Use environment variable for token
const token = process.env.NEXT_PUBLIC_API_TOKEN

axios.defaults.headers.common["Authorization"] = `Bearer ${token}`

export const api = {
  get: async (endpoint: string) => {
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || "GET request failed")
    }
  },

  post: async (endpoint: string, data: any) => {
    try {
      const response = await axios.post(`${BASE_URL}${endpoint}`, data)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || "POST request failed")
    }
  },

  put: async (endpoint: string, data: any) => {
    try {
      const response = await axios.put(`${BASE_URL}${endpoint}`, data)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || "PUT request failed")
    }
  },

  delete: async (endpoint: string) => {
    try {
      const response = await axios.delete(`${BASE_URL}${endpoint}`)
      return response.data
    } catch (error: any) {
      throw new Error(error?.response?.data?.message || "DELETE request failed")
    }
  },
}

// // Mock products data
// const mockProducts = [
//   {
//     id: "1",
//     name: "Gaming PC RTX 4080",
//     brand: "CustomForge",
//     category: "Prebuilt PCs",
//     originalPrice: 2499.99,
//     finalPrice: 2199.99,
//     discountPercentage: 12,
//     stock: 15,
//     availability: "In Stock",
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Gaming+PC+Front",
//       "/placeholder.svg?height=400&width=400&text=Gaming+PC+Side",
//       "/placeholder.svg?height=400&width=400&text=Gaming+PC+Interior",
//       "/placeholder.svg?height=400&width=400&text=Gaming+PC+Back",
//     ],
//     ratings: {
//       average: 4.8,
//       totalReviews: 127,
//     },
//     isFeatured: true,
//     isActive: true,
//     sku: "CF-PC-RTX4080-001",
//     description:
//       "High-performance gaming PC featuring RTX 4080 graphics card, Intel i7-13700K processor, 32GB DDR5 RAM, and 1TB NVMe SSD. Perfect for 4K gaming and content creation.",
//     specifications: {
//       Processor: "Intel Core i7-13700K",
//       "Graphics Card": "NVIDIA RTX 4080 16GB",
//       Memory: "32GB DDR5-5600",
//       Storage: "1TB NVMe SSD",
//       Motherboard: "ASUS ROG Strix Z790-E",
//       "Power Supply": "850W 80+ Gold Modular",
//       Cooling: "AIO Liquid Cooler 240mm",
//       Case: "Fractal Design Define 7",
//     },
//     features: [
//       "RGB Lighting",
//       "Tempered Glass Panel",
//       "WiFi 6E Ready",
//       "Bluetooth 5.3",
//       "USB-C Front Panel",
//       "Tool-less Upgrades",
//     ],
//     weight: 18.5,
//     dimensions: {
//       length: 45,
//       width: 22,
//       height: 48,
//     },
//     warranty: "3 years",
//     manufacturer: "CustomForge",
//     model: "CF-RTX4080-Pro",
//     tags: ["Gaming", "High-End", "RTX", "Intel", "RGB"],
//     createdAt: "2024-01-15T10:30:00Z",
//     updatedAt: "2024-01-20T14:45:00Z",
//   },
//   {
//     id: "2",
//     name: "AMD Ryzen 9 7900X",
//     brand: "AMD",
//     category: "CPU",
//     originalPrice: 549.99,
//     finalPrice: 499.99,
//     discountPercentage: 9,
//     stock: 42,
//     availability: "In Stock",
//     images: [
//       "/placeholder.svg?height=400&width=400&text=AMD+Ryzen+9",
//       "/placeholder.svg?height=400&width=400&text=CPU+Package",
//     ],
//     ratings: {
//       average: 4.6,
//       totalReviews: 89,
//     },
//     isFeatured: false,
//     isActive: true,
//     sku: "AMD-7900X-001",
//     description:
//       "12-core, 24-thread processor with 5.6 GHz max boost clock. Built on advanced 5nm process technology for exceptional performance and efficiency.",
//     specifications: {
//       Cores: "12",
//       Threads: "24",
//       "Base Clock": "4.7 GHz",
//       "Max Boost Clock": "5.6 GHz",
//       Cache: "76MB",
//       TDP: "170W",
//       Socket: "AM5",
//       Process: "5nm",
//     },
//     features: [
//       "PCIe 5.0 Support",
//       "DDR5 Memory Support",
//       "AMD EXPO Technology",
//       "Precision Boost 2",
//       "Curve Optimizer",
//     ],
//     weight: 0.1,
//     dimensions: {
//       length: 4,
//       width: 4,
//       height: 0.5,
//     },
//     warranty: "3 years",
//     manufacturer: "AMD",
//     model: "7900X",
//     tags: ["CPU", "AMD", "Ryzen", "12-core", "Gaming"],
//     createdAt: "2024-01-10T08:15:00Z",
//     updatedAt: "2024-01-18T11:20:00Z",
//   },
//   {
//     id: "3",
//     name: "NVIDIA GeForce RTX 4070 Ti",
//     brand: "NVIDIA",
//     category: "GPU",
//     originalPrice: 799.99,
//     finalPrice: 749.99,
//     discountPercentage: 6,
//     stock: 8,
//     availability: "In Stock",
//     images: [
//       "/placeholder.svg?height=400&width=400&text=RTX+4070+Ti",
//       "/placeholder.svg?height=400&width=400&text=GPU+Side+View",
//     ],
//     ratings: {
//       average: 4.7,
//       totalReviews: 156,
//     },
//     isFeatured: true,
//     isActive: true,
//     sku: "NV-RTX4070TI-001",
//     description:
//       "Powerful graphics card with 12GB GDDR6X memory, perfect for 1440p gaming and ray tracing. Features advanced cooling and RGB lighting.",
//     specifications: {
//       Memory: "12GB GDDR6X",
//       "Memory Interface": "192-bit",
//       "Base Clock": "2310 MHz",
//       "Boost Clock": "2610 MHz",
//       "CUDA Cores": "7680",
//       "RT Cores": "60 (3rd gen)",
//       "Tensor Cores": "240 (4th gen)",
//       "Power Consumption": "285W",
//     },
//     features: ["Ray Tracing", "DLSS 3", "AV1 Encoding", "RGB Lighting", "Dual Fan Cooling", "Metal Backplate"],
//     weight: 1.8,
//     dimensions: {
//       length: 30.5,
//       width: 13.7,
//       height: 5.5,
//     },
//     warranty: "3 years",
//     manufacturer: "NVIDIA",
//     model: "RTX 4070 Ti",
//     tags: ["GPU", "NVIDIA", "RTX", "Ray Tracing", "DLSS"],
//     createdAt: "2024-01-12T09:45:00Z",
//     updatedAt: "2024-01-19T16:30:00Z",
//   },
//   {
//     id: "4",
//     name: "Corsair Vengeance DDR5-5600 32GB",
//     brand: "Corsair",
//     category: "Memory",
//     originalPrice: 299.99,
//     finalPrice: 279.99,
//     discountPercentage: 7,
//     stock: 25,
//     availability: "In Stock",
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Corsair+DDR5",
//       "/placeholder.svg?height=400&width=400&text=Memory+Kit",
//     ],
//     ratings: {
//       average: 4.5,
//       totalReviews: 78,
//     },
//     isFeatured: false,
//     isActive: true,
//     sku: "COR-DDR5-5600-32",
//     description: "High-performance DDR5 memory kit with RGB lighting and optimized for gaming and content creation.",
//     specifications: {
//       Capacity: "32GB (2x16GB)",
//       Speed: "DDR5-5600",
//       Latency: "CL36",
//       Voltage: "1.25V",
//       "RGB Lighting": "Yes",
//       "Heat Spreader": "Aluminum",
//     },
//     features: ["RGB Lighting", "XMP 3.0 Support", "Aluminum Heat Spreader", "Lifetime Warranty"],
//     weight: 0.5,
//     dimensions: {
//       length: 13.3,
//       width: 0.8,
//       height: 4.4,
//     },
//     warranty: "Lifetime",
//     manufacturer: "Corsair",
//     model: "CMK32GX5M2B5600C36",
//     tags: ["Memory", "DDR5", "RGB", "Gaming", "High-Speed"],
//     createdAt: "2024-01-08T12:00:00Z",
//     updatedAt: "2024-01-16T09:30:00Z",
//   },
//   {
//     id: "5",
//     name: "Samsung 980 PRO 2TB NVMe SSD",
//     brand: "Samsung",
//     category: "Storage",
//     originalPrice: 199.99,
//     finalPrice: 179.99,
//     discountPercentage: 10,
//     stock: 18,
//     availability: "In Stock",
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Samsung+980+PRO",
//       "/placeholder.svg?height=400&width=400&text=NVMe+SSD",
//     ],
//     ratings: {
//       average: 4.9,
//       totalReviews: 203,
//     },
//     isFeatured: true,
//     isActive: true,
//     sku: "SAM-980PRO-2TB",
//     description: "Ultra-fast PCIe 4.0 NVMe SSD with exceptional performance for gaming and professional workloads.",
//     specifications: {
//       Capacity: "2TB",
//       Interface: "PCIe 4.0 x4",
//       "Sequential Read": "7,000 MB/s",
//       "Sequential Write": "6,900 MB/s",
//       "Form Factor": "M.2 2280",
//       NAND: "V-NAND 3-bit MLC",
//     },
//     features: ["PCIe 4.0", "Samsung Magician Software", "5-Year Warranty", "Thermal Control"],
//     weight: 0.008,
//     dimensions: {
//       length: 8.0,
//       width: 2.2,
//       height: 0.15,
//     },
//     warranty: "5 years",
//     manufacturer: "Samsung",
//     model: "MZ-V8P2T0B/AM",
//     tags: ["SSD", "NVMe", "PCIe 4.0", "High-Speed", "Gaming"],
//     createdAt: "2024-01-05T14:20:00Z",
//     updatedAt: "2024-01-14T16:45:00Z",
//   },
// ]

// // Mock orders data
// const mockOrders = [
//   {
//     id: "ORD-001",
//     user: {
//       id: "1",
//       name: "John Smith",
//       email: "john.smith@email.com",
//     },
//     orderItems: [
//       {
//         product: "1",
//         name: "Gaming PC RTX 4080",
//         image: "/placeholder.svg?height=100&width=100&text=Gaming+PC",
//         price: 2199.99,
//         quantity: 1,
//       },
//       {
//         product: "2",
//         name: "AMD Ryzen 9 7900X",
//         image: "/placeholder.svg?height=100&width=100&text=AMD+CPU",
//         price: 499.99,
//         quantity: 1,
//       },
//     ],
//     shippingAddress: {
//       fullName: "John Smith",
//       address: "123 Main Street",
//       city: "New York",
//       state: "NY",
//       postalCode: "10001",
//       country: "United States",
//     },
//     paymentMethod: "stripe",
//     paymentResult: {
//       id: "pi_1234567890",
//       status: "succeeded",
//       update_time: "2024-01-20T10:30:00Z",
//       email_address: "john.smith@email.com",
//       payment_method: "stripe",
//     },
//     itemsPrice: 2699.98,
//     taxPrice: 216.0,
//     shippingPrice: 29.99,
//     totalPrice: 2945.97,
//     isPaid: true,
//     paidAt: "2024-01-20T10:30:00Z",
//     isDelivered: false,
//     status: "processing",
//     createdAt: "2024-01-20T10:30:00Z",
//     updatedAt: "2024-01-20T14:45:00Z",
//   },
//   {
//     id: "ORD-002",
//     user: {
//       id: "2",
//       name: "Sarah Johnson",
//       email: "sarah.j@email.com",
//     },
//     orderItems: [
//       {
//         product: "3",
//         name: "NVIDIA GeForce RTX 4070 Ti",
//         image: "/placeholder.svg?height=100&width=100&text=RTX+4070+Ti",
//         price: 749.99,
//         quantity: 1,
//       },
//     ],
//     shippingAddress: {
//       fullName: "Sarah Johnson",
//       address: "456 Oak Avenue",
//       city: "Los Angeles",
//       state: "CA",
//       postalCode: "90210",
//       country: "United States",
//     },
//     paymentMethod: "paypal",
//     paymentResult: {
//       id: "PAYID-123456789",
//       status: "succeeded",
//       update_time: "2024-01-19T14:15:00Z",
//       email_address: "sarah.j@email.com",
//       payment_method: "paypal",
//     },
//     itemsPrice: 749.99,
//     taxPrice: 60.0,
//     shippingPrice: 19.99,
//     totalPrice: 829.98,
//     isPaid: true,
//     paidAt: "2024-01-19T14:15:00Z",
//     isDelivered: true,
//     deliveredAt: "2024-01-22T16:30:00Z",
//     status: "delivered",
//     createdAt: "2024-01-19T14:15:00Z",
//     updatedAt: "2024-01-22T16:30:00Z",
//   },
//   {
//     id: "ORD-003",
//     user: {
//       id: "3",
//       name: "Mike Wilson",
//       email: "mike.wilson@email.com",
//     },
//     orderItems: [
//       {
//         product: "1",
//         name: "Gaming PC RTX 4080",
//         image: "/placeholder.svg?height=100&width=100&text=Gaming+PC",
//         price: 2199.99,
//         quantity: 1,
//       },
//     ],
//     shippingAddress: {
//       fullName: "Mike Wilson",
//       address: "789 Pine Street",
//       city: "Chicago",
//       state: "IL",
//       postalCode: "60601",
//       country: "United States",
//     },
//     paymentMethod: "cod",
//     paymentResult: {
//       id: "COD-789012345",
//       status: "pending",
//       update_time: "2024-01-21T09:00:00Z",
//       email_address: "mike.wilson@email.com",
//       payment_method: "cod",
//     },
//     itemsPrice: 2199.99,
//     taxPrice: 176.0,
//     shippingPrice: 39.99,
//     totalPrice: 2415.98,
//     isPaid: false,
//     isDelivered: false,
//     status: "pending",
//     createdAt: "2024-01-21T09:00:00Z",
//     updatedAt: "2024-01-21T09:00:00Z",
//   },
//   {
//     id: "ORD-004",
//     user: {
//       id: "4",
//       name: "Emily Davis",
//       email: "emily.davis@email.com",
//     },
//     orderItems: [
//       {
//         product: "2",
//         name: "AMD Ryzen 9 7900X",
//         image: "/placeholder.svg?height=100&width=100&text=AMD+CPU",
//         price: 499.99,
//         quantity: 2,
//       },
//       {
//         product: "3",
//         name: "NVIDIA GeForce RTX 4070 Ti",
//         image: "/placeholder.svg?height=100&width=100&text=RTX+4070+Ti",
//         price: 749.99,
//         quantity: 1,
//       },
//     ],
//     shippingAddress: {
//       fullName: "Emily Davis",
//       address: "321 Elm Drive",
//       city: "Miami",
//       state: "FL",
//       postalCode: "33101",
//       country: "United States",
//     },
//     paymentMethod: "stripe",
//     paymentResult: {
//       id: "pi_9876543210",
//       status: "succeeded",
//       update_time: "2024-01-18T11:45:00Z",
//       email_address: "emily.davis@email.com",
//       payment_method: "stripe",
//     },
//     itemsPrice: 1749.97,
//     taxPrice: 140.0,
//     shippingPrice: 24.99,
//     totalPrice: 1914.96,
//     isPaid: true,
//     paidAt: "2024-01-18T11:45:00Z",
//     isDelivered: false,
//     status: "shipped",
//     createdAt: "2024-01-18T11:45:00Z",
//     updatedAt: "2024-01-20T08:30:00Z",
//   },
//   {
//     id: "ORD-005",
//     user: {
//       id: "5",
//       name: "David Brown",
//       email: "david.brown@email.com",
//     },
//     orderItems: [
//       {
//         product: "1",
//         name: "Gaming PC RTX 4080",
//         image: "/placeholder.svg?height=100&width=100&text=Gaming+PC",
//         price: 2199.99,
//         quantity: 1,
//       },
//     ],
//     shippingAddress: {
//       fullName: "David Brown",
//       address: "654 Maple Lane",
//       city: "Seattle",
//       state: "WA",
//       postalCode: "98101",
//       country: "United States",
//     },
//     paymentMethod: "stripe",
//     paymentResult: {
//       id: "pi_5555666677",
//       status: "refunded",
//       update_time: "2024-01-17T13:20:00Z",
//       email_address: "david.brown@email.com",
//       payment_method: "stripe",
//     },
//     itemsPrice: 2199.99,
//     taxPrice: 176.0,
//     shippingPrice: 29.99,
//     totalPrice: 2405.98,
//     isPaid: true,
//     paidAt: "2024-01-15T10:00:00Z",
//     isDelivered: true,
//     deliveredAt: "2024-01-17T12:00:00Z",
//     refundedAt: "2024-01-17T13:20:00Z",
//     status: "refunded",
//     createdAt: "2024-01-15T10:00:00Z",
//     updatedAt: "2024-01-17T13:20:00Z",
//   },
//   {
//     id: "ORD-006",
//     user: {
//       id: "6",
//       name: "Alex Thompson",
//       email: "alex.thompson@email.com",
//     },
//     orderItems: [
//       {
//         product: "4",
//         name: "Corsair Vengeance DDR5-5600 32GB",
//         image: "/placeholder.svg?height=100&width=100&text=Corsair+DDR5",
//         price: 279.99,
//         quantity: 2,
//       },
//       {
//         product: "5",
//         name: "Samsung 980 PRO 2TB NVMe SSD",
//         image: "/placeholder.svg?height=100&width=100&text=Samsung+SSD",
//         price: 179.99,
//         quantity: 1,
//       },
//     ],
//     shippingAddress: {
//       fullName: "Alex Thompson",
//       address: "987 Cedar Court",
//       city: "Austin",
//       state: "TX",
//       postalCode: "73301",
//       country: "United States",
//     },
//     paymentMethod: "stripe",
//     paymentResult: {
//       id: "pi_1111222233",
//       status: "succeeded",
//       update_time: "2024-01-22T15:30:00Z",
//       email_address: "alex.thompson@email.com",
//       payment_method: "stripe",
//     },
//     itemsPrice: 739.97,
//     taxPrice: 59.2,
//     shippingPrice: 15.99,
//     totalPrice: 815.16,
//     isPaid: true,
//     paidAt: "2024-01-22T15:30:00Z",
//     isDelivered: false,
//     status: "processing",
//     createdAt: "2024-01-22T15:30:00Z",
//     updatedAt: "2024-01-22T15:30:00Z",
//   },
// ]

// // Mock coupons data
// const mockCoupons = [
//   {
//     id: "1",
//     code: "WELCOME10",
//     description: "Welcome discount for new customers",
//     discountType: "percentage",
//     discountValue: 10,
//     minimumAmount: 100,
//     usageLimit: 1000,
//     usedCount: 245,
//     isActive: true,
//     expiresAt: "2024-12-31T23:59:59Z",
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-15T10:30:00Z",
//   },
//   {
//     id: "2",
//     code: "SAVE50",
//     description: "$50 off orders over $500",
//     discountType: "fixed",
//     discountValue: 50,
//     minimumAmount: 500,
//     usageLimit: 500,
//     usedCount: 123,
//     isActive: true,
//     expiresAt: "2024-06-30T23:59:59Z",
//     createdAt: "2024-01-15T12:00:00Z",
//     updatedAt: "2024-01-20T14:45:00Z",
//   },
//   {
//     id: "3",
//     code: "GAMING25",
//     description: "25% off gaming PCs and components",
//     discountType: "percentage",
//     discountValue: 25,
//     minimumAmount: 1000,
//     usageLimit: 200,
//     usedCount: 87,
//     isActive: true,
//     expiresAt: "2024-03-31T23:59:59Z",
//     createdAt: "2024-01-10T08:00:00Z",
//     updatedAt: "2024-01-18T16:20:00Z",
//   },
//   {
//     id: "4",
//     code: "FREESHIP",
//     description: "Free shipping on all orders",
//     discountType: "shipping",
//     discountValue: 0,
//     minimumAmount: 0,
//     usageLimit: null,
//     usedCount: 1456,
//     isActive: true,
//     expiresAt: "2024-12-31T23:59:59Z",
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-22T12:15:00Z",
//   },
//   {
//     id: "5",
//     code: "EXPIRED20",
//     description: "20% off - expired coupon",
//     discountType: "percentage",
//     discountValue: 20,
//     minimumAmount: 200,
//     usageLimit: 100,
//     usedCount: 100,
//     isActive: false,
//     expiresAt: "2024-01-15T23:59:59Z",
//     createdAt: "2023-12-01T00:00:00Z",
//     updatedAt: "2024-01-16T00:00:00Z",
//   },
//   {
//     id: "6",
//     code: "STUDENT15",
//     description: "Student discount - 15% off",
//     discountType: "percentage",
//     discountValue: 15,
//     minimumAmount: 150,
//     usageLimit: 500,
//     usedCount: 234,
//     isActive: true,
//     expiresAt: "2024-08-31T23:59:59Z",
//     createdAt: "2024-01-05T10:00:00Z",
//     updatedAt: "2024-01-20T09:30:00Z",
//   },
// ]

// // Mock users data
// const mockUsers = [
//   {
//     id: "1",
//     firstName: "John",
//     lastName: "Smith",
//     email: "john.smith@email.com",
//     role: "customer",
//     status: "active",
//     joinDate: "2024-01-15T10:30:00Z",
//     lastLogin: "2024-01-20T14:45:00Z",
//     totalOrders: 5,
//     totalSpent: 2499.95,
//     avatar: "/placeholder.svg?height=40&width=40&text=JS",
//     phone: "+1-555-0123",
//     address: {
//       street: "123 Main Street",
//       city: "New York",
//       state: "NY",
//       zipCode: "10001",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: true,
//       smsNotifications: false,
//       emailNotifications: true,
//     },
//   },
//   {
//     id: "2",
//     firstName: "Sarah",
//     lastName: "Johnson",
//     email: "sarah.j@email.com",
//     role: "customer",
//     status: "active",
//     joinDate: "2024-01-10T08:15:00Z",
//     lastLogin: "2024-01-19T11:20:00Z",
//     totalOrders: 3,
//     totalSpent: 1299.97,
//     avatar: "/placeholder.svg?height=40&width=40&text=SJ",
//     phone: "+1-555-0456",
//     address: {
//       street: "456 Oak Avenue",
//       city: "Los Angeles",
//       state: "CA",
//       zipCode: "90210",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: true,
//       smsNotifications: true,
//       emailNotifications: true,
//     },
//   },
//   {
//     id: "3",
//     firstName: "Mike",
//     lastName: "Wilson",
//     email: "mike.wilson@email.com",
//     role: "customer",
//     status: "active",
//     joinDate: "2024-01-08T16:45:00Z",
//     lastLogin: "2024-01-21T09:15:00Z",
//     totalOrders: 2,
//     totalSpent: 2415.98,
//     avatar: "/placeholder.svg?height=40&width=40&text=MW",
//     phone: "+1-555-0789",
//     address: {
//       street: "789 Pine Street",
//       city: "Chicago",
//       state: "IL",
//       zipCode: "60601",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: false,
//       smsNotifications: false,
//       emailNotifications: true,
//     },
//   },
//   {
//     id: "4",
//     firstName: "Emily",
//     lastName: "Davis",
//     email: "emily.davis@email.com",
//     role: "customer",
//     status: "active",
//     joinDate: "2024-01-05T12:30:00Z",
//     lastLogin: "2024-01-18T14:20:00Z",
//     totalOrders: 4,
//     totalSpent: 3214.93,
//     avatar: "/placeholder.svg?height=40&width=40&text=ED",
//     phone: "+1-555-0321",
//     address: {
//       street: "321 Elm Drive",
//       city: "Miami",
//       state: "FL",
//       zipCode: "33101",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: true,
//       smsNotifications: true,
//       emailNotifications: true,
//     },
//   },
//   {
//     id: "5",
//     firstName: "David",
//     lastName: "Brown",
//     email: "david.brown@email.com",
//     role: "customer",
//     status: "suspended",
//     joinDate: "2024-01-03T09:00:00Z",
//     lastLogin: "2024-01-17T10:45:00Z",
//     totalOrders: 1,
//     totalSpent: 0, // Refunded
//     avatar: "/placeholder.svg?height=40&width=40&text=DB",
//     phone: "+1-555-0654",
//     address: {
//       street: "654 Maple Lane",
//       city: "Seattle",
//       state: "WA",
//       zipCode: "98101",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: false,
//       smsNotifications: false,
//       emailNotifications: false,
//     },
//   },
//   {
//     id: "6",
//     firstName: "Alex",
//     lastName: "Thompson",
//     email: "alex.thompson@email.com",
//     role: "customer",
//     status: "active",
//     joinDate: "2024-01-22T14:00:00Z",
//     lastLogin: "2024-01-22T15:45:00Z",
//     totalOrders: 1,
//     totalSpent: 815.16,
//     avatar: "/placeholder.svg?height=40&width=40&text=AT",
//     phone: "+1-555-0987",
//     address: {
//       street: "987 Cedar Court",
//       city: "Austin",
//       state: "TX",
//       zipCode: "73301",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: true,
//       smsNotifications: false,
//       emailNotifications: true,
//     },
//   },
//   {
//     id: "7",
//     firstName: "Lisa",
//     lastName: "Chen",
//     email: "lisa.chen@email.com",
//     role: "admin",
//     status: "active",
//     joinDate: "2023-12-01T08:00:00Z",
//     lastLogin: "2024-01-22T16:30:00Z",
//     totalOrders: 0,
//     totalSpent: 0,
//     avatar: "/placeholder.svg?height=40&width=40&text=LC",
//     phone: "+1-555-0147",
//     address: {
//       street: "147 Admin Street",
//       city: "San Francisco",
//       state: "CA",
//       zipCode: "94102",
//       country: "United States",
//     },
//     preferences: {
//       newsletter: false,
//       smsNotifications: false,
//       emailNotifications: true,
//     },
//   },
// ]

// // Mock reviews data
// const mockReviews = [
//   {
//     id: "1",
//     product: {
//       id: "1",
//       name: "Gaming PC RTX 4080",
//       image: "/placeholder.svg?height=100&width=100&text=Gaming+PC",
//     },
//     user: {
//       id: "1",
//       name: "John Smith",
//       avatar: "/placeholder.svg?height=40&width=40&text=JS",
//       verified: true,
//     },
//     rating: 5,
//     title: "Amazing gaming performance!",
//     comment:
//       "This PC handles everything I throw at it. 4K gaming is smooth and the build quality is excellent. The RGB lighting looks fantastic and the cooling system keeps everything running cool even during intense gaming sessions.",
//     verifiedPurchase: true,
//     helpfulVotes: 24,
//     reported: false,
//     media: [
//       "/placeholder.svg?height=200&width=200&text=Gaming+Setup",
//       "/placeholder.svg?height=200&width=200&text=RGB+Lighting",
//     ],
//     createdAt: "2024-01-18T10:30:00Z",
//     updatedAt: "2024-01-18T10:30:00Z",
//   },
//   {
//     id: "2",
//     product: {
//       id: "2",
//       name: "AMD Ryzen 9 7900X",
//       image: "/placeholder.svg?height=100&width=100&text=AMD+CPU",
//     },
//     user: {
//       id: "2",
//       name: "Sarah Johnson",
//       avatar: "/placeholder.svg?height=40&width=40&text=SJ",
//       verified: true,
//     },
//     rating: 4,
//     title: "Great CPU for content creation",
//     comment:
//       "Excellent performance for video editing and streaming. Runs cool and quiet. The multi-core performance is outstanding for rendering tasks.",
//     verifiedPurchase: true,
//     helpfulVotes: 18,
//     reported: false,
//     media: [],
//     createdAt: "2024-01-17T14:15:00Z",
//     updatedAt: "2024-01-17T14:15:00Z",
//   },
//   {
//     id: "3",
//     game: {
//       id: "1",
//       name: "Cyberpunk 2077",
//       image: "/placeholder.svg?height=100&width=100&text=Cyberpunk+2077",
//     },
//     user: {
//       id: "3",
//       name: "Mike Wilson",
//       avatar: "/placeholder.svg?height=40&width=40&text=MW",
//       verified: false,
//     },
//     rating: 4,
//     title: "Great game after updates",
//     comment:
//       "The game has improved significantly since launch. The story is engaging and the graphics are stunning. Still some minor bugs but overall a great experience.",
//     verifiedPurchase: true,
//     helpfulVotes: 32,
//     reported: false,
//     reportReason: null,
//     media: [
//       "/placeholder.svg?height=200&width=200&text=Game+Screenshot+1",
//       "/placeholder.svg?height=200&width=200&text=Game+Screenshot+2",
//       "/placeholder.svg?height=200&width=200&text=Game+Screenshot+3",
//     ],
//     platform: "PC",
//     playtimeHours: 45,
//     createdAt: "2024-01-16T09:20:00Z",
//     updatedAt: "2024-01-16T09:20:00Z",
//   },
//   {
//     id: "4",
//     product: {
//       id: "3",
//       name: "NVIDIA GeForce RTX 4070 Ti",
//       image: "/placeholder.svg?height=100&width=100&text=RTX+4070+Ti",
//     },
//     user: {
//       id: "4",
//       name: "Emily Davis",
//       avatar: "/placeholder.svg?height=40&width=40&text=ED",
//       verified: true,
//     },
//     rating: 5,
//     title: "Perfect for 1440p gaming",
//     comment:
//       "This GPU handles all my games at 1440p with ray tracing enabled. The performance is excellent and the cooling is very quiet.",
//     verifiedPurchase: true,
//     helpfulVotes: 15,
//     reported: false,
//     media: ["/placeholder.svg?height=200&width=200&text=GPU+Installation"],
//     createdAt: "2024-01-15T16:45:00Z",
//     updatedAt: "2024-01-15T16:45:00Z",
//   },
//   {
//     id: "5",
//     game: {
//       id: "2",
//       name: "The Witcher 3: Wild Hunt",
//       image: "/placeholder.svg?height=100&width=100&text=Witcher+3",
//     },
//     user: {
//       id: "5",
//       name: "David Brown",
//       avatar: "/placeholder.svg?height=40&width=40&text=DB",
//       verified: true,
//     },
//     rating: 5,
//     title: "Masterpiece of gaming",
//     comment:
//       "One of the best RPGs ever made. The story, characters, and world are all incredible. Hundreds of hours of content.",
//     verifiedPurchase: true,
//     helpfulVotes: 89,
//     reported: false,
//     media: [],
//     platform: "PC",
//     playtimeHours: 156,
//     createdAt: "2024-01-14T11:30:00Z",
//     updatedAt: "2024-01-14T11:30:00Z",
//   },
//   {
//     id: "6",
//     product: {
//       id: "1",
//       name: "Gaming PC RTX 4080",
//       image: "/placeholder.svg?height=100&width=100&text=Gaming+PC",
//     },
//     user: {
//       id: "6",
//       name: "Alex Thompson",
//       avatar: "/placeholder.svg?height=40&width=40&text=AT",
//       verified: false,
//     },
//     rating: 2,
//     title: "Had some issues",
//     comment:
//       "The PC arrived with some damage to the case and one of the RAM sticks was loose. Customer service was helpful but it was frustrating.",
//     verifiedPurchase: true,
//     helpfulVotes: 5,
//     reported: true,
//     reportReason: "Inappropriate content",
//     media: ["/placeholder.svg?height=200&width=200&text=Damaged+Case"],
//     createdAt: "2024-01-13T14:20:00Z",
//     updatedAt: "2024-01-13T14:20:00Z",
//   },
//   {
//     id: "7",
//     game: {
//       id: "3",
//       name: "Minecraft",
//       image: "/placeholder.svg?height=100&width=100&text=Minecraft",
//     },
//     user: {
//       id: "7",
//       name: "Lisa Chen",
//       avatar: "/placeholder.svg?height=40&width=40&text=LC",
//       verified: true,
//     },
//     rating: 5,
//     title: "Endless creativity",
//     comment: "Perfect game for creativity and relaxation. My kids love it too. The modding community is amazing.",
//     verifiedPurchase: true,
//     helpfulVotes: 42,
//     reported: false,
//     media: [
//       "/placeholder.svg?height=200&width=200&text=Minecraft+Build+1",
//       "/placeholder.svg?height=200&width=200&text=Minecraft+Build+2",
//     ],
//     platform: "PC",
//     playtimeHours: 234,
//     createdAt: "2024-01-12T08:15:00Z",
//     updatedAt: "2024-01-12T08:15:00Z",
//   },
//   {
//     id: "8",
//     product: {
//       id: "4",
//       name: "Corsair Vengeance DDR5-5600 32GB",
//       image: "/placeholder.svg?height=100&width=100&text=Corsair+DDR5",
//     },
//     user: {
//       id: "6",
//       name: "Alex Thompson",
//       avatar: "/placeholder.svg?height=40&width=40&text=AT",
//       verified: true,
//     },
//     rating: 5,
//     title: "Excellent memory kit",
//     comment: "Fast, reliable, and the RGB lighting looks great. Easy to install and works perfectly with my setup.",
//     verifiedPurchase: true,
//     helpfulVotes: 12,
//     reported: false,
//     media: ["/placeholder.svg?height=200&width=200&text=RGB+Memory"],
//     createdAt: "2024-01-22T16:00:00Z",
//     updatedAt: "2024-01-22T16:00:00Z",
//   },
// ]

// // Mock games data
// const mockGames = [
//   {
//     id: "1",
//     title: "Cyberpunk 2077",
//     developer: "CD Projekt RED",
//     publisher: "CD Projekt",
//     releaseDate: "2020-12-10",
//     platforms: ["PC", "PlayStation", "Xbox"],
//     genres: ["RPG", "Action", "Open World"],
//     ageRating: "M",
//     price: 59.99,
//     discountPrice: 29.99,
//     discountPercentage: 50,
//     metacriticScore: 86,
//     userScore: 7.2,
//     isActive: true,
//     isFeatured: true,
//     stock: 999,
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Cyberpunk+2077",
//       "/placeholder.svg?height=400&width=400&text=Night+City",
//       "/placeholder.svg?height=400&width=400&text=V+Character",
//     ],
//     description:
//       "An open-world, action-adventure RPG set in the dark future of Night City. Play as V, a mercenary outlaw going after a one-of-a-kind implant that is the key to immortality.",
//     systemRequirements: {
//       minimum: {
//         OS: "Windows 10 64-bit",
//         Processor: "Intel Core i5-3570K or AMD FX-8310",
//         Memory: "8 GB RAM",
//         Graphics: "NVIDIA GeForce GTX 780 or AMD Radeon RX 470",
//         DirectX: "Version 12",
//         Storage: "70 GB available space",
//       },
//       recommended: {
//         OS: "Windows 10 64-bit",
//         Processor: "Intel Core i7-4790 or AMD Ryzen 3 3200G",
//         Memory: "12 GB RAM",
//         Graphics: "NVIDIA GeForce GTX 1060 6GB or AMD Radeon R9 Fury",
//         DirectX: "Version 12",
//         Storage: "70 GB available space",
//       },
//     },
//     tags: ["RPG", "Open World", "Cyberpunk", "Action", "Story Rich"],
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-15T12:30:00Z",
//   },
//   {
//     id: "2",
//     title: "The Witcher 3: Wild Hunt",
//     developer: "CD Projekt RED",
//     publisher: "CD Projekt",
//     releaseDate: "2015-05-19",
//     platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch"],
//     genres: ["RPG", "Action", "Open World"],
//     ageRating: "M",
//     price: 39.99,
//     discountPrice: 9.99,
//     discountPercentage: 75,
//     metacriticScore: 93,
//     userScore: 9.3,
//     isActive: true,
//     isFeatured: true,
//     stock: 999,
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Witcher+3",
//       "/placeholder.svg?height=400&width=400&text=Geralt",
//       "/placeholder.svg?height=400&width=400&text=Novigrad",
//     ],
//     description:
//       "You are Geralt of Rivia, mercenary monster slayer. Before you stands a war-torn, monster-infested continent you can explore at will. Your current contract? Tracking down Ciri — the Child of Prophecy, a living weapon that can alter the shape of the world.",
//     systemRequirements: {
//       minimum: {
//         OS: "Windows 7 64-bit",
//         Processor: "Intel CPU Core i5-2500K 3.3GHz / AMD CPU Phenom II X4 940",
//         Memory: "6 GB RAM",
//         Graphics: "Nvidia GPU GeForce GTX 660 / AMD GPU Radeon HD 7870",
//         DirectX: "Version 11",
//         Storage: "35 GB available space",
//       },
//       recommended: {
//         OS: "Windows 10 64-bit",
//         Processor: "Intel CPU Core i7 3770 3.4 GHz / AMD CPU AMD FX-8350 4 GHz",
//         Memory: "8 GB RAM",
//         Graphics: "Nvidia GPU GeForce GTX 770 / AMD GPU Radeon R9 290",
//         DirectX: "Version 11",
//         Storage: "35 GB available space",
//       },
//     },
//     tags: ["RPG", "Open World", "Fantasy", "Story Rich", "Choices Matter"],
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-10T14:20:00Z",
//   },
//   {
//     id: "3",
//     title: "Minecraft",
//     developer: "Mojang Studios",
//     publisher: "Microsoft Studios",
//     releaseDate: "2011-11-18",
//     platforms: ["PC", "PlayStation", "Xbox", "Nintendo Switch", "Mobile"],
//     genres: ["Sandbox", "Survival", "Creative"],
//     ageRating: "E10+",
//     price: 26.95,
//     discountPrice: null,
//     discountPercentage: 0,
//     metacriticScore: 93,
//     userScore: 8.0,
//     isActive: true,
//     isFeatured: true,
//     stock: 999,
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Minecraft",
//       "/placeholder.svg?height=400&width=400&text=Minecraft+World",
//       "/placeholder.svg?height=400&width=400&text=Minecraft+Building",
//     ],
//     description:
//       "Minecraft is a game made up of blocks, creatures, and community. You can survive the night or build a work of art – the choice is all yours. But if the thought of exploring a vast new world all on your own feels overwhelming, then it's a good thing that Minecraft can be played with friends.",
//     systemRequirements: {
//       minimum: {
//         OS: "Windows 7 and up",
//         Processor: "Intel Core i3-3210 3.2 GHz / AMD A8-7600 APU 3.1 GHz",
//         Memory: "4 GB RAM",
//         Graphics: "Intel HD Graphics 4000 / AMD Radeon R5 series",
//         DirectX: "Version 11",
//         Storage: "1 GB available space",
//       },
//       recommended: {
//         OS: "Windows 10",
//         Processor: "Intel Core i5-4690 3.5GHz / AMD A10-7800 APU 3.5 GHz",
//         Memory: "8 GB RAM",
//         Graphics: "GeForce 700 Series / AMD Radeon Rx 200 Series",
//         DirectX: "Version 11",
//         Storage: "4 GB available space",
//       },
//     },
//     tags: ["Sandbox", "Building", "Survival", "Multiplayer", "Creative"],
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-08T09:45:00Z",
//   },
//   {
//     id: "4",
//     title: "Elden Ring",
//     developer: "FromSoftware",
//     publisher: "Bandai Namco Entertainment",
//     releaseDate: "2022-02-25",
//     platforms: ["PC", "PlayStation", "Xbox"],
//     genres: ["Action RPG", "Souls-like", "Open World"],
//     ageRating: "M",
//     price: 59.99,
//     discountPrice: 47.99,
//     discountPercentage: 20,
//     metacriticScore: 96,
//     userScore: 7.6,
//     isActive: true,
//     isFeatured: true,
//     stock: 999,
//     images: [
//       "/placeholder.svg?height=400&width=400&text=Elden+Ring",
//       "/placeholder.svg?height=400&width=400&text=Lands+Between",
//       "/placeholder.svg?height=400&width=400&text=Tarnished",
//     ],
//     description:
//       "THE NEW FANTASY ACTION RPG. Rise, Tarnished, and be guided by grace to brandish the power of the Elden Ring and become an Elden Lord in the Lands Between.",
//     systemRequirements: {
//       minimum: {
//         OS: "Windows 10",
//         Processor: "Intel Core i5-8400 / AMD RYZEN 3 3300X",
//         Memory: "12 GB RAM",
//         Graphics: "NVIDIA GeForce GTX 1060 3GB / AMD Radeon RX 580 4GB",
//         DirectX: "Version 12",
//         Storage: "60 GB available space",
//       },
//       recommended: {
//         OS: "Windows 10/11",
//         Processor: "Intel Core i7-8700K / AMD RYZEN 5 3600X",
//         Memory: "16 GB RAM",
//         Graphics: "NVIDIA GeForce GTX 1070 8GB / AMD Radeon RX Vega 56 8GB",
//         DirectX: "Version 12",
//         Storage: "60 GB available space",
//       },
//     },
//     tags: ["Souls-like", "Dark Fantasy", "Difficult", "Open World", "Action RPG"],
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-12T11:15:00Z",
//   },
//   {
//     id: "5",
//     title: "Grand Theft Auto V",
//     developer: "Rockstar North",
//     publisher: "Rockstar Games",
//     releaseDate: "2013-09-17",
//     platforms: ["PC", "PlayStation", "Xbox"],
//     genres: ["Action", "Adventure", "Open World"],
//     ageRating: "M",
//     price: 29.99,
//     discountPrice: 14.99,
//     discountPercentage: 50,
//     metacriticScore: 96,
//     userScore: 7.9,
//     isActive: true,
//     isFeatured: false,
//     stock: 999,
//     images: [
//       "/placeholder.svg?height=400&width=400&text=GTA+V",
//       "/placeholder.svg?height=400&width=400&text=Los+Santos",
//       "/placeholder.svg?height=400&width=400&text=Three+Protagonists",
//     ],
//     description:
//       "Grand Theft Auto V for PC offers players the option to explore the award-winning world of Los Santos and Blaine County in resolutions of up to 4k and beyond, as well as the chance to experience the game running at 60 frames per second.",
//     systemRequirements: {
//       minimum: {
//         OS: "Windows 10 64 Bit, Windows 8.1 64 Bit, Windows 8 64 Bit, Windows 7 64 Bit Service Pack 1",
//         Processor:
//           "Intel Core 2 Quad CPU Q6600 @ 2.40GHz (4 CPUs) / AMD Phenom 9850 Quad-Core Processor (4 CPUs) @ 2.5GHz",
//         Memory: "4 GB RAM",
//         Graphics: "NVIDIA 9800 GT 1GB / AMD HD 4870 1GB (DX 10, 10.1, 11)",
//         DirectX: "Version 10",
//         Storage: "72 GB available space",
//       },
//       recommended: {
//         OS: "Windows 10 64 Bit, Windows 8.1 64 Bit, Windows 8 64 Bit, Windows 7 64 Bit Service Pack 1",
//         Processor: "Intel Core i5 3470 @ 3.2GHz (4 CPUs) / AMD X8 FX-8350 @ 4GHz (8 CPUs)",
//         Memory: "8 GB RAM",
//         Graphics: "NVIDIA GTX 660 2GB / AMD HD 7870 2GB",
//         DirectX: "Version 11",
//         Storage: "72 GB available space",
//       },
//     },
//     tags: ["Open World", "Crime", "Action", "Multiplayer", "Driving"],
//     createdAt: "2024-01-01T00:00:00Z",
//     updatedAt: "2024-01-05T15:40:00Z",
//   },
// ]

// // Mock analytics data
// const mockAnalytics = {
//   dashboard: {
//     totalRevenue: 125430.5,
//     totalOrders: 1247,
//     totalCustomers: 892,
//     averageOrderValue: 100.58,
//     revenueGrowth: 12.5,
//     ordersGrowth: 8.3,
//     customersGrowth: 15.2,
//     aovGrowth: -2.1,
//     recentOrders: mockOrders.slice(0, 5),
//     topProducts: mockProducts.slice(0, 5),
//     salesData: [
//       { month: "Jan", revenue: 18500, orders: 185 },
//       { month: "Feb", revenue: 22300, orders: 223 },
//       { month: "Mar", revenue: 19800, orders: 198 },
//       { month: "Apr", revenue: 25600, orders: 256 },
//       { month: "May", revenue: 28900, orders: 289 },
//       { month: "Jun", revenue: 31200, orders: 312 },
//     ],
//     categoryBreakdown: [
//       { category: "Prebuilt PCs", value: 45, revenue: 56543.75 },
//       { category: "GPU", value: 25, revenue: 31357.63 },
//       { category: "CPU", value: 15, revenue: 18814.58 },
//       { category: "Memory", value: 8, revenue: 10034.44 },
//       { category: "Storage", value: 7, revenue: 8780.1 },
//     ],
//   },
// }

// export const api = {
//   // Products
//   get: async (endpoint: string) => {
//     await delay(500) // Simulate network delay
//     console.log(`API GET: ${endpoint}`)

//     if (endpoint === "/admin/products") {
//       return mockProducts
//     }

//     if (endpoint.startsWith("/admin/products/")) {
//       const id = endpoint.split("/").pop()
//       const product = mockProducts.find((p) => p.id === id)
//       if (!product) {
//         throw new Error("Product not found")
//       }
//       return product
//     }

//     if (endpoint === "/admin/orders") {
//       return mockOrders
//     }

//     if (endpoint === "/admin/coupons") {
//       return mockCoupons
//     }

//     if (endpoint === "/admin/users") {
//       return mockUsers
//     }

//     if (endpoint === "/admin/reviews") {
//       return mockReviews
//     }

//     if (endpoint === "/admin/games") {
//       return mockGames
//     }

//     if (endpoint === "/admin/analytics/dashboard") {
//       return mockAnalytics.dashboard
//     }

//     if (endpoint === "/admin/analytics/sales") {
//       return [
//         { month: "Jan", sales: 18500 },
//         { month: "Feb", sales: 22300 },
//         { month: "Mar", sales: 19800 },
//         { month: "Apr", sales: 25600 },
//         { month: "May", sales: 28900 },
//         { month: "Jun", sales: 31200 },
//         { month: "Jul", sales: 29800 },
//         { month: "Aug", sales: 33500 },
//         { month: "Sep", sales: 31200 },
//         { month: "Oct", sales: 35800 },
//         { month: "Nov", sales: 38900 },
//         { month: "Dec", sales: 42100 },
//       ]
//     }

//     if (endpoint === "/admin/analytics/categories") {
//       return [
//         { name: "Prebuilt PCs", value: 45 },
//         { name: "GPU", value: 25 },
//         { name: "CPU", value: 15 },
//         { name: "Memory", value: 8 },
//         { name: "Storage", value: 7 },
//       ]
//     }

//     throw new Error(`Endpoint not found: ${endpoint}`)
//   },

//   post: async (endpoint: string, data: any) => {
//     await delay(800)
//     console.log(`API POST: ${endpoint}`, data)

//     if (endpoint === "/admin/products") {
//       const newProduct = {
//         ...data,
//         id: String(mockProducts.length + 1),
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//       }
//       mockProducts.push(newProduct)
//       return newProduct
//     }

//     if (endpoint === "/admin/games") {
//       const newGame = {
//         ...data,
//         id: String(mockGames.length + 1),
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//       }
//       mockGames.push(newGame)
//       return newGame
//     }

//     if (endpoint === "/admin/coupons") {
//       const newCoupon = {
//         ...data,
//         id: String(mockCoupons.length + 1),
//         usedCount: 0,
//         createdAt: new Date().toISOString(),
//         updatedAt: new Date().toISOString(),
//       }
//       mockCoupons.push(newCoupon)
//       return newCoupon
//     }

//     return { success: true, data }
//   },

//   put: async (endpoint: string, data: any) => {
//     await delay(600)
//     console.log(`API PUT: ${endpoint}`, data)

//     if (endpoint.startsWith("/admin/products/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockProducts.findIndex((p) => p.id === id)
//       if (index === -1) {
//         throw new Error("Product not found")
//       }
//       mockProducts[index] = {
//         ...data,
//         updatedAt: new Date().toISOString(),
//       }
//       return mockProducts[index]
//     }

//     if (endpoint.startsWith("/admin/games/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockGames.findIndex((g) => g.id === id)
//       if (index === -1) {
//         throw new Error("Game not found")
//       }
//       mockGames[index] = {
//         ...data,
//         updatedAt: new Date().toISOString(),
//       }
//       return mockGames[index]
//     }

//     if (endpoint.startsWith("/admin/coupons/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockCoupons.findIndex((c) => c.id === id)
//       if (index === -1) {
//         throw new Error("Coupon not found")
//       }
//       mockCoupons[index] = {
//         ...data,
//         updatedAt: new Date().toISOString(),
//       }
//       return mockCoupons[index]
//     }

//     if (endpoint.startsWith("/admin/users/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockUsers.findIndex((u) => u.id === id)
//       if (index === -1) {
//         throw new Error("User not found")
//       }
//       mockUsers[index] = {
//         ...mockUsers[index],
//         ...data,
//       }
//       return mockUsers[index]
//     }

//     if (endpoint.includes("/admin/orders/") && endpoint.includes("/status")) {
//       const id = endpoint.split("/")[3]
//       const index = mockOrders.findIndex((o) => o.id === id)
//       if (index !== -1) {
//         mockOrders[index].status = data.status
//         mockOrders[index].updatedAt = new Date().toISOString()
//         return mockOrders[index]
//       }
//     }

//     if (endpoint.includes("/admin/orders/") && endpoint.includes("/mark-paid")) {
//       const id = endpoint.split("/")[3]
//       const index = mockOrders.findIndex((o) => o.id === id)
//       if (index !== -1) {
//         mockOrders[index].isPaid = true
//         mockOrders[index].paidAt = new Date().toISOString()
//         mockOrders[index].updatedAt = new Date().toISOString()
//         return mockOrders[index]
//       }
//     }

//     if (endpoint.includes("/admin/orders/") && endpoint.includes("/mark-delivered")) {
//       const id = endpoint.split("/")[3]
//       const index = mockOrders.findIndex((o) => o.id === id)
//       if (index !== -1) {
//         mockOrders[index].isDelivered = true
//         mockOrders[index].deliveredAt = new Date().toISOString()
//         mockOrders[index].status = "delivered"
//         mockOrders[index].updatedAt = new Date().toISOString()
//         return mockOrders[index]
//       }
//     }

//     if (endpoint.includes("/admin/orders/") && endpoint.includes("/refund")) {
//       const id = endpoint.split("/")[3]
//       const index = mockOrders.findIndex((o) => o.id === id)
//       if (index !== -1) {
//         mockOrders[index].status = "refunded"
//         mockOrders[index].refundedAt = new Date().toISOString()
//         mockOrders[index].updatedAt = new Date().toISOString()
//         return mockOrders[index]
//       }
//     }

//     if (endpoint.includes("/admin/reviews/") && endpoint.includes("/toggle-reported")) {
//       const id = endpoint.split("/")[3]
//       const index = mockReviews.findIndex((r) => r.id === id)
//       if (index !== -1) {
//         mockReviews[index].reported = !mockReviews[index].reported
//         return mockReviews[index]
//       }
//     }

//     if (endpoint.includes("/admin/reviews/") && endpoint.includes("/mark-helpful")) {
//       const id = endpoint.split("/")[3]
//       const index = mockReviews.findIndex((r) => r.id === id)
//       if (index !== -1) {
//         mockReviews[index].helpfulVotes += 1
//         return mockReviews[index]
//       }
//     }

//     return { success: true, data }
//   },

//   delete: async (endpoint: string) => {
//     await delay(400)
//     console.log(`API DELETE: ${endpoint}`)

//     if (endpoint.startsWith("/admin/products/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockProducts.findIndex((p) => p.id === id)
//       if (index === -1) {
//         throw new Error("Product not found")
//       }
//       mockProducts.splice(index, 1)
//       return { success: true }
//     }

//     if (endpoint.startsWith("/admin/games/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockGames.findIndex((g) => g.id === id)
//       if (index === -1) {
//         throw new Error("Game not found")
//       }
//       mockGames.splice(index, 1)
//       return { success: true }
//     }

//     if (endpoint.startsWith("/admin/coupons/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockCoupons.findIndex((c) => c.id === id)
//       if (index === -1) {
//         throw new Error("Coupon not found")
//       }
//       mockCoupons.splice(index, 1)
//       return { success: true }
//     }

//     if (endpoint.startsWith("/admin/users/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockUsers.findIndex((u) => u.id === id)
//       if (index === -1) {
//         throw new Error("User not found")
//       }
//       mockUsers.splice(index, 1)
//       return { success: true }
//     }

//     if (endpoint.startsWith("/admin/reviews/")) {
//       const id = endpoint.split("/")[3]
//       const index = mockReviews.findIndex((r) => r.id === id)
//       if (index !== -1) {
//         mockReviews.splice(index, 1)
//         return { success: true }
//       }
//     }

//     return { success: true }
//   },
// }