//File: Client/my-app/src/Components/Navbar.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  Search,
  Phone,
  Globe,
  Menu,
  X,
  ShoppingCart,
  Heart,
  User,
  ChevronDown,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

const Navbar: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // Navigation items with potential dropdown menus
  const navItems: NavItem[] = [
    {
      label: "All Categories",
      href: "#",
      children: [
        { label: "Gaming PCs", href: "#" },
        { label: "Laptops", href: "#" },
        { label: "Components", href: "#" },
        { label: "Peripherals", href: "#" },
        { label: "Accessories", href: "#" },
      ],
    },
    { label: "Shop", href: "#" },
    { label: "PreBuild Gaming PC", href: "#" },
    { label: "Promotions", href: "#" },
    { label: "Stores", href: "#" },
  ];

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setActiveDropdown(null);
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const toggleDropdown = (label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveDropdown(activeDropdown === label ? null : label);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Searching for:", searchQuery);
    // Implement search functionality
  };

  return (
    <header
      className={`w-full bg-white ${
        isScrolled ? "shadow-md" : ""
      } transition-all duration-300`}
    >
      {/* Top Bar */}
      <div className="container mx-auto px-4 py-3 flex flex-col lg:flex-row justify-between items-center">
        {/* Logo */}
        <div className="flex items-center mb-3 lg:mb-0">
          <a href="/" className="flex items-center">
            <div className="w-16 h-16 relative text-2xl font-extrabold">
              <span className="text-blue-950">Custom</span>{" "}
              <span
                className="text-blue-700
              "
              >
                Forge
              </span>
            </div>
          </a>
        </div>

        {/* Search Bar */}
        <div className="w-full lg:w-2/5 xl:w-1/2 mb-3 lg:mb-0">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search for products"
              className={`w-full py-2 pl-4 pr-12 rounded-full border ${
                isSearchFocused
                  ? "border-blue-500 ring-2 ring-blue-100"
                  : "border-gray-300"
              } focus:outline-none transition-all duration-200`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            <button
              type="submit"
              className="absolute right-0 top-0 h-full aspect-square flex items-center justify-center bg-blue-600 text-white rounded-r-full hover:bg-blue-700 transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>

        {/* Contact & Shipping Info */}
        <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Phone className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">24 Support</p>
              <a
                href="tel:+923335589827"
                className="text-blue-600 hover:underline"
              >
                +92 112 345 5678
              </a>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">All Pakistan</p>
              <p className="text-blue-600">Shipping Available</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <nav
        className={`bg-gray-100 py-3 border-t border-gray-200 ${
          isScrolled ? "sticky top-0 z-50 shadow-sm" : ""
        }`}
      >
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* Mobile Menu Button */}
          <button
            onClick={toggleMenu}
            className="lg:hidden p-2 rounded-md hover:bg-gray-200 transition-colors"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>

          {/* Desktop Navigation */}
          <ul className="hidden lg:flex space-x-6">
            {navItems.map((item) => (
              <li key={item.label} className="relative group">
                {item.children ? (
                  <div className="relative">
                    <button
                      onClick={(e) => toggleDropdown(item.label, e)}
                      className="flex items-center gap-1 py-2 text-gray-800 hover:text-blue-600 font-medium transition-colors"
                    >
                      {item.label}
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${
                          activeDropdown === item.label ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {activeDropdown === item.label && (
                      <div className="absolute top-full left-0 mt-1 w-56 bg-white shadow-lg rounded-md overflow-hidden z-50 animate-[fadeIn_0.2s_ease-in-out]">
                        <ul className="py-2">
                          {item.children.map((child) => (
                            <li key={child.label}>
                              <a
                                href={child.href}
                                className="block px-4 py-2 text-gray-800 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                {child.label}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <a
                    href={item.href}
                    className="block py-2 text-gray-800 hover:text-blue-600 font-medium transition-colors"
                  >
                    {item.label}
                  </a>
                )}
              </li>
            ))}
          </ul>

          {/* Mobile Navigation */}
          {isMenuOpen && (
            <div className="fixed inset-0 z-50 lg:hidden bg-black bg-opacity-50">
              <div className="absolute top-0 left-0 w-4/5 h-full bg-white overflow-y-auto">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <a href="/" className="flex items-center">
                      <div className="w-12 h-12 relative">
                        <img
                          src="/placeholder.svg?height=48&width=48"
                          alt="Panda Logo"
                          className="object-contain"
                        />
                      </div>
                    </a>
                    <button
                      onClick={toggleMenu}
                      className="p-2 rounded-md hover:bg-gray-200 transition-colors"
                      aria-label="Close menu"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <ul className="p-4">
                  {navItems.map((item) => (
                    <li key={item.label} className="mb-2">
                      {item.children ? (
                        <div>
                          <button
                            onClick={(e) => toggleDropdown(item.label, e)}
                            className="flex items-center justify-between w-full py-2 text-gray-800 hover:text-blue-600 font-medium transition-colors"
                          >
                            {item.label}
                            <ChevronDown
                              className={`w-4 h-4 transition-transform duration-200 ${
                                activeDropdown === item.label
                                  ? "rotate-180"
                                  : ""
                              }`}
                            />
                          </button>
                          {activeDropdown === item.label && (
                            <ul className="pl-4 mt-1 border-l-2 border-blue-200">
                              {item.children.map((child) => (
                                <li key={child.label}>
                                  <a
                                    href={child.href}
                                    className="block py-2 text-gray-700 hover:text-blue-600 transition-colors"
                                  >
                                    {child.label}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : (
                        <a
                          href={item.href}
                          className="block py-2 text-gray-800 hover:text-blue-600 font-medium transition-colors"
                        >
                          {item.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <a
              href="/account"
              className="p-2 rounded-full hover:bg-gray-200 transition-colors relative"
            >
              <User className="w-6 h-6" />
              <span className="sr-only">Account</span>
            </a>
            <a
              href="/wishlist"
              className="p-2 rounded-full hover:bg-gray-200 transition-colors relative"
            >
              <Heart className="w-6 h-6" />
              <span className="sr-only">Wishlist</span>
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {wishlistCount}
                </span>
              )}
            </a>
            <a
              href="/cart"
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-200 transition-colors relative"
            >
              <ShoppingCart className="w-6 h-6" />
              <span className="hidden sm:inline font-medium">Rs 0</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
