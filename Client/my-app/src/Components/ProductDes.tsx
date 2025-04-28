"use client";

import type React from "react";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  ShoppingCart,
  CreditCard,
  Heart,
  Share2,
  ArrowLeft,
  ArrowRight,
  Maximize,
} from "lucide-react";

interface ProductImage {
  id: number;
  src: string;
  alt: string;
}

interface ProductSpec {
  icon?: React.ReactNode;
  text: string;
}

interface PromoOffer {
  id: string;
  title: string;
  description: string;
  couponCode?: string;
}

const CartDes: React.FC = () => {
  // Product images
  const productImages: ProductImage[] = [
    {
      id: 1,
      src: "/placeholder.svg?height=600&width=600",
      alt: "Thunder Furor Case Front View",
    },
    {
      id: 2,
      src: "/placeholder.svg?height=600&width=600",
      alt: "Thunder Furor Case Side View",
    },
    {
      id: 3,
      src: "/placeholder.svg?height=600&width=600",
      alt: "Thunder Furor Case Back View",
    },
    {
      id: 4,
      src: "/placeholder.svg?height=600&width=600",
      alt: "Thunder Furor Case Interior View",
    },
  ];

  // Product specifications
  const productSpecs: ProductSpec[] = [
    { text: "I/O: USB 3.0X1, USB 1.1X2" },
    { text: "Left side panel: Tempered Glass" },
    { text: "Motherboard support: Atx/M-atx/Mini-ITX" },
    {
      text: "Fan Support: 120mmx3 Front(included),120/140mm on top,120mmx1 on rear",
    },
    { text: "Radiator Support: 360mm/240mm" },
    { text: "Max VGA Lenght: 340mm" },
    { text: "Max CPU Cooler Height: 160mm" },
  ];

  // Promotional offers
  const promoOffers: PromoOffer[] = [
    {
      id: "apple-event",
      title: "Apple Shopping Event",
      description: "Hurry and get discounts on all Apple devices up to 20%",
      couponCode: "Sale_coupon_15",
    },
  ];

  // State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Handlers
  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === productImages.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? productImages.length - 1 : prev - 1
    );
  };

  const selectImage = (index: number) => {
    setCurrentImageIndex(index);
  };

  const increaseQuantity = () => {
    setQuantity((prev) => prev + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const toggleFullScreen = () => {
    setIsFullScreen(!isFullScreen);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center text-sm text-gray-500 mb-6">
        <a href="/" className="hover:text-gray-700">
          Home
        </a>
        <span className="mx-2">/</span>
        <a href="/casings" className="hover:text-gray-700">
          Casings
        </a>
        <span className="mx-2">/</span>
        <span className="text-gray-900">
          Thunder Furor Next Level TGC-225w ARGB ATX Case - White - 3 ARGB Fans
          Pre-Installed
        </span>
      </nav>

      {/* Navigation Arrows */}
      <div className="flex justify-between mb-6">
        <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors">
          <ArrowLeft size={16} />
        </button>
        <button className="p-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors">
          <ArrowRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* Product Images */}
        <div className="space-y-4">
          {/* Main Image */}
          <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="relative pt-[100%]">
              <img
                src={productImages[currentImageIndex].src || "/placeholder.svg"}
                alt={productImages[currentImageIndex].alt}
                className="absolute inset-0 w-full h-full object-contain p-4"
              />
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 shadow-md flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/80 shadow-md flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <button
                onClick={toggleFullScreen}
                className="absolute right-2 bottom-2 w-8 h-8 rounded-full bg-white/80 shadow-md flex items-center justify-center hover:bg-white transition-colors"
              >
                <Maximize size={16} />
              </button>
            </div>
          </div>

          {/* Thumbnail Images */}
          <div className="flex space-x-2 overflow-x-auto pb-2">
            {productImages.map((image, index) => (
              <button
                key={image.id}
                onClick={() => selectImage(index)}
                className={`relative flex-shrink-0 w-20 h-20 border rounded-md overflow-hidden ${
                  currentImageIndex === index
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-gray-200"
                }`}
              >
                <img
                  src={image.src || "/placeholder.svg"}
                  alt={image.alt}
                  className="w-full h-full object-contain"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Thunder Furor Next Level TGC-225w ARGB ATX Case - White - 3 ARGB
            Fans Pre-Installed
          </h1>

          {/* Product Specifications */}
          <div className="mb-6">
            <ul className="space-y-3">
              {productSpecs.map((spec, index) => (
                <li key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-600 mt-2 mr-2"></div>
                  <span className="text-gray-700">{spec.text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Promotional Offers */}
          {promoOffers.map((offer) => (
            <div
              key={offer.id}
              className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-center"
            >
              <div className="flex-shrink-0 mr-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="m9 12 2 2 4-4" />
                  </svg>
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-medium text-gray-900">{offer.title}</h3>
                <p className="text-sm text-gray-600">{offer.description}</p>
              </div>
              {offer.couponCode && (
                <div className="flex-shrink-0 ml-4">
                  <div className="px-3 py-1 bg-white border border-gray-200 rounded text-sm font-medium">
                    {offer.couponCode}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Price */}
          <div className="mb-6">
            <div className="text-3xl font-bold text-blue-600">Rs 11,000</div>
          </div>

          {/* Quantity and Add to Cart */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center border border-gray-300 rounded-md w-32">
              <button
                onClick={decreaseQuantity}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Minus size={16} />
              </button>
              <input
                type="text"
                value={quantity}
                readOnly
                className="w-12 h-10 text-center border-x border-gray-300 focus:outline-none"
              />
              <button
                onClick={increaseQuantity}
                className="w-10 h-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>

            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-md font-medium flex items-center justify-center transition-colors">
              <ShoppingCart size={18} className="mr-2" />
              Add To Cart
            </button>

            <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-md font-medium flex items-center justify-center transition-colors">
              <CreditCard size={18} className="mr-2" />
              Buy Now
            </button>
          </div>

          {/* Additional Actions */}
          <div className="flex items-center mt-6 space-x-4">
            <button className="flex items-center text-gray-600 hover:text-red-500 transition-colors">
              <Heart size={18} className="mr-1" />
              <span className="text-sm">Add to Wishlist</span>
            </button>
            <button className="flex items-center text-gray-600 hover:text-blue-500 transition-colors">
              <Share2 size={18} className="mr-1" />
              <span className="text-sm">Share</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Modal */}
      {isFullScreen && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <button
            onClick={toggleFullScreen}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <div className="relative w-full max-w-4xl">
            <img
              src={productImages[currentImageIndex].src || "/placeholder.svg"}
              alt={productImages[currentImageIndex].alt}
              className="w-full h-auto"
            />
            <button
              onClick={prevImage}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={24} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartDes;
