//File: Client/my-app/src/Components/Card.tsx
"use client";

import type React from "react";
import { useState } from "react";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ChevronRight,
  Tag,
  Cpu,
  Monitor,
  HardDrive,
  Gift,
  Star,
  ArrowRight,
} from "lucide-react";

// Type definitions
interface CartItem {
  id: string;
  name: string;
  image: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  specs?: string;
}

interface Category {
  id: string;
  name: string;
  icon: React.ReactNode;
  count: number;
}

interface PCCase {
  id: string;
  name: string;
  image: string;
  price: number;
  features: string[];
  rating: number;
  isNew: boolean;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  discount: string;
  image: string;
  code: string;
  expiryDate: string;
}

const GamingShopComponent: React.FC = () => {
  // State for cart items
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      id: "pc-1",
      name: "Phantom RTX 4080 Gaming PC",
      image: "/placeholder.svg?height=80&width=80",
      price: 2499.99,
      originalPrice: 2799.99,
      quantity: 1,
      specs: "RTX 4080, i9-13900K, 32GB DDR5, 2TB NVMe",
    },
    {
      id: "pc-2",
      name: "Aurora RGB Gaming PC",
      image: "/placeholder.svg?height=80&width=80",
      price: 1899.99,
      quantity: 1,
      specs: "RTX 4070, Ryzen 9 7900X, 32GB DDR5, 1TB NVMe",
    },
  ]);

  // State for active section
  const [activeSection, setActiveSection] = useState<
    "cart" | "offers" | "categories" | "cases"
  >("categories");

  // PC Categories
  const categories: Category[] = [
    { id: "budget", name: "Budget Gaming", icon: <Cpu size={20} />, count: 12 },
    { id: "mid", name: "Mid-Range", icon: <Cpu size={20} />, count: 18 },
    { id: "high", name: "High-End", icon: <Cpu size={20} />, count: 15 },
    { id: "extreme", name: "Extreme", icon: <Cpu size={20} />, count: 8 },
    {
      id: "streaming",
      name: "Streaming",
      icon: <Monitor size={20} />,
      count: 10,
    },
    { id: "compact", name: "Compact", icon: <HardDrive size={20} />, count: 7 },
  ];

  // PC Cases
  const pcCases: PCCase[] = [
    {
      id: "case-1",
      name: "Phantom X RGB",
      image: "/placeholder.svg?height=200&width=200",
      price: 149.99,
      features: [
        "Tempered Glass",
        "RGB Lighting",
        "USB-C Front Panel",
        "Excellent Airflow",
      ],
      rating: 4.8,
      isNew: true,
    },
    {
      id: "case-2",
      name: "Eclipse Pro",
      image: "/placeholder.svg?height=200&width=200",
      price: 129.99,
      features: [
        "Mesh Front Panel",
        "360mm Radiator Support",
        "Tool-less Design",
      ],
      rating: 4.6,
      isNew: true,
    },
    {
      id: "case-3",
      name: "Stealth Mini ITX",
      image: "/placeholder.svg?height=200&width=200",
      price: 99.99,
      features: [
        "Compact Design",
        "Premium Materials",
        "Vertical GPU Mount Option",
      ],
      rating: 4.7,
      isNew: true,
    },
  ];

  // Special Offers
  const offers: Offer[] = [
    {
      id: "offer-1",
      title: "Summer Gaming Bundle",
      description: "Get a free gaming chair with any PC over $2000",
      discount: "FREE ITEM",
      image: "/placeholder.svg?height=120&width=120",
      code: "SUMMER23",
      expiryDate: "2023-08-31",
    },
    {
      id: "offer-2",
      title: "Back to School",
      description: "15% off any gaming PC plus free headset",
      discount: "15% OFF",
      image: "/placeholder.svg?height=120&width=120",
      code: "SCHOOL23",
      expiryDate: "2023-09-15",
    },
  ];

  // Calculate cart total
  const cartTotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const cartSavings = cartItems.reduce(
    (total, item) =>
      total + ((item.originalPrice || item.price) - item.price) * item.quantity,
    0
  );

  // Handle quantity change
  const updateQuantity = (id: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  // Remove item from cart
  const removeItem = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
  };

  // Apply promo code (placeholder function)
  const [promoCode, setPromoCode] = useState("");
  const applyPromoCode = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Promo code ${promoCode} applied!`);
    setPromoCode("");
  };

  return (
    <div className="bg-gray-50 rounded-xl shadow-lg overflow-hidden">
      {/* Navigation Tabs */}
      <div className="flex border-b bg-white">
        <button
          onClick={() => setActiveSection("cart")}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
            activeSection === "cart"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          <ShoppingCart size={18} />
          Cart ({cartItems.length})
        </button>
        <button
          onClick={() => setActiveSection("offers")}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
            activeSection === "offers"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          <Tag size={18} />
          Special Offers
        </button>
        <button
          onClick={() => setActiveSection("categories")}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
            activeSection === "categories"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          <Cpu size={18} />
          PC Categories
        </button>
        <button
          onClick={() => setActiveSection("cases")}
          className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
            activeSection === "cases"
              ? "border-b-2 border-blue-600 text-blue-600"
              : "text-gray-600 hover:text-blue-600"
          }`}
        >
          <HardDrive size={18} />
          New Cases
        </button>
      </div>

      {/* Cart Section */}
      {activeSection === "cart" && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Your Cart</h2>
            <span className="text-sm text-gray-500">
              {cartItems.length} items
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <ShoppingCart size={24} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 mb-4">
                Looks like you haven't added any items yet.
              </p>
              <button
                onClick={() => setActiveSection("categories")}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Browse Gaming PCs <ChevronRight size={16} className="ml-1" />
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 bg-white p-4 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                  >
                    <img
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      className="w-20 h-20 object-contain rounded-md bg-gray-50"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {item.name}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{item.specs}</p>
                      <div className="flex items-center mt-2">
                        <span className="font-bold text-gray-900">
                          ${item.price.toFixed(2)}
                        </span>
                        {item.originalPrice && (
                          <span className="ml-2 text-sm text-gray-500 line-through">
                            ${item.originalPrice.toFixed(2)}
                          </span>
                        )}
                        {item.originalPrice && (
                          <span className="ml-2 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            Save ${(item.originalPrice - item.price).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border rounded-md">
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity - 1)
                          }
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          className="px-2 py-1 text-gray-600 hover:bg-gray-100 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 mb-6">
                <h3 className="font-medium text-gray-800 mb-3">
                  Have a promo code?
                </h3>
                <form onSubmit={applyPromoCode} className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter promo code"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors"
                  >
                    Apply
                  </button>
                </form>
              </div>

              {/* Cart Summary */}
              <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                <h3 className="font-medium text-gray-800 mb-3">
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-medium">${cartTotal.toFixed(2)}</span>
                  </div>
                  {cartSavings > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Savings</span>
                      <span>-${cartSavings.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span className="font-medium">Free</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between">
                    <span className="font-medium text-gray-900">Total</span>
                    <span className="font-bold text-gray-900">
                      ${cartTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
                <button className="w-full py-3 bg-blue-600 text-white rounded-md font-medium hover:bg-blue-700 transition-colors">
                  Proceed to Checkout
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Special Offers Section */}
      {activeSection === "offers" && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Special Offers</h2>
            <span className="text-sm text-blue-600 hover:underline cursor-pointer">
              View All
            </span>
          </div>

          <div className="space-y-6">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/4 bg-gradient-to-br from-blue-600 to-indigo-700 p-6 flex items-center justify-center">
                    <img
                      src={offer.image || "/placeholder.svg"}
                      alt={offer.title}
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <div className="p-6 md:w-3/4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div>
                      <div className="inline-block px-3 py-1 bg-blue-600 text-white text-xs font-semibold rounded-full mb-2">
                        {offer.discount}
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 mb-1">
                        {offer.title}
                      </h3>
                      <p className="text-gray-600 mb-2">{offer.description}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Use code:</span>
                        <span className="bg-white px-2 py-1 border border-gray-200 rounded text-sm font-mono">
                          {offer.code}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-start md:items-end gap-2">
                      <span className="text-xs text-gray-500">
                        Expires: {offer.expiryDate}
                      </span>
                      <button className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                        Claim Offer <Gift size={16} className="ml-2" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Featured Deal */}
          <div className="mt-8 bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl overflow-hidden shadow-lg text-white">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="md:w-1/2">
                <div className="inline-block px-3 py-1 bg-yellow-500 text-gray-900 text-xs font-semibold rounded-full mb-3">
                  LIMITED TIME OFFER
                </div>
                <h3 className="text-2xl font-bold mb-3">
                  Ultimate Gaming Bundle
                </h3>
                <p className="mb-4 text-gray-300">
                  Get our top-tier gaming PC with a 4K monitor, mechanical
                  keyboard, and gaming mouse at an unbeatable price.
                </p>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-3xl font-bold">$3,499</div>
                  <div className="text-xl text-gray-400 line-through">
                    $4,299
                  </div>
                  <div className="bg-green-600 text-white px-2 py-1 rounded text-sm font-medium">
                    Save $800
                  </div>
                </div>
                <button className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Shop Bundle <ArrowRight size={16} className="ml-2" />
                </button>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/placeholder.svg?height=300&width=400"
                  alt="Gaming Bundle"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PC Categories Section */}
      {activeSection === "categories" && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Gaming PC Categories
            </h2>
            <span className="text-sm text-blue-600 hover:underline cursor-pointer">
              View All PCs
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group cursor-pointer"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {category.icon}
                    </div>
                    <span className="text-sm text-gray-500">
                      {category.count} PCs
                    </span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-1">
                    {category.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {category.id === "budget"
                      ? "Affordable gaming PCs under $1000"
                      : category.id === "mid"
                      ? "Great performance from $1000-$1500"
                      : category.id === "high"
                      ? "Premium gaming from $1500-$2500"
                      : category.id === "extreme"
                      ? "Ultimate performance $2500+"
                      : category.id === "streaming"
                      ? "Optimized for content creators"
                      : "Space-saving small form factor PCs"}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-600">
                      Starting at
                    </span>
                    <span className="font-bold text-gray-900">
                      {category.id === "budget"
                        ? "$799"
                        : category.id === "mid"
                        ? "$1,199"
                        : category.id === "high"
                        ? "$1,899"
                        : category.id === "extreme"
                        ? "$2,899"
                        : category.id === "streaming"
                        ? "$1,599"
                        : "$999"}
                    </span>
                  </div>
                </div>
                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">
                    View Collection
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-gray-400 group-hover:text-blue-600 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Featured Category */}
          <div className="mt-8 bg-gradient-to-r from-purple-600 to-indigo-700 rounded-xl overflow-hidden shadow-lg">
            <div className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
              <div className="md:w-1/2">
                <h3 className="text-2xl font-bold text-white mb-3">
                  Custom Gaming PC Builder
                </h3>
                <p className="mb-4 text-purple-100">
                  Design your dream gaming PC with our easy-to-use configurator.
                  Choose every component and create the perfect system for your
                  needs.
                </p>
                <button className="inline-flex items-center px-6 py-3 bg-white text-purple-700 rounded-md hover:bg-purple-50 transition-colors">
                  Start Building <Cpu size={16} className="ml-2" />
                </button>
              </div>
              <div className="md:w-1/2">
                <img
                  src="/placeholder.svg?height=300&width=400"
                  alt="Custom PC Builder"
                  className="w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PC Cases Section */}
      {activeSection === "cases" && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              New System Cases
            </h2>
            <span className="text-sm text-blue-600 hover:underline cursor-pointer">
              View All Cases
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pcCases.map((pcCase) => (
              <div
                key={pcCase.id}
                className="bg-white rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group"
              >
                <div className="relative">
                  {pcCase.isNew && (
                    <div className="absolute top-4 left-4 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                      NEW
                    </div>
                  )}
                  <img
                    src={pcCase.image || "/placeholder.svg"}
                    alt={pcCase.name}
                    className="w-full h-48 object-contain p-4 bg-gray-50 group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-medium text-gray-900">
                      {pcCase.name}
                    </h3>
                    <div className="flex items-center">
                      <Star
                        size={16}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span className="ml-1 text-sm font-medium">
                        {pcCase.rating}
                      </span>
                    </div>
                  </div>
                  <div className="mb-4">
                    <ul className="space-y-1">
                      {pcCase.features.map((feature, index) => (
                        <li
                          key={index}
                          className="text-sm text-gray-600 flex items-center"
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-2"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-gray-900">
                      ${pcCase.price.toFixed(2)}
                    </span>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                      Add to Cart
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Case Compatibility */}
          <div className="mt-8 bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                <HardDrive size={24} />
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Case Compatibility Checker
                </h3>
                <p className="text-gray-600 mb-4">
                  Not sure if your components will fit? Use our compatibility
                  tool to check if your motherboard, GPU, and cooling will fit
                  in your chosen case.
                </p>
                <button className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition-colors">
                  Check Compatibility
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Cart Button (Mobile) */}
      <div className="md:hidden fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setActiveSection("cart")}
          className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
        >
          <ShoppingCart size={24} />
          {cartItems.length > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
              {cartItems.length}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};

export default GamingShopComponent;
