"use client";

import type React from "react";
import { useState } from "react";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Twitch,
  DiscIcon as Discord,
  ChevronRight,
  Mail,
  MapPin,
  Phone,
  CreditCard,
  ArrowRight,
} from "lucide-react";

const Footer: React.FC = () => {
  const [email, setEmail] = useState("");

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle subscription logic here
    alert(`Subscribed with email: ${email}`);
    setEmail("");
  };

  return (
    <footer className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
      {/* Decorative Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute top-1/2 -left-24 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute -bottom-32 left-1/2 transform -translate-x-1/2 w-2/3 h-48 bg-blue-600 opacity-10 blur-3xl"></div>

        {/* Circuit Board Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: "30px 30px",
            }}
          ></div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Column 1: About */}
          <div className="space-y-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">CF</span>
              </div>
              <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                Custom Forge
              </h2>
            </div>

            <p className="text-gray-400 text-sm leading-relaxed">
              Your ultimate destination for premium gaming PCs, components, and
              accessories. We deliver cutting-edge technology to elevate your
              gaming experience.
            </p>

            <div className="space-y-3">
              <div className="flex items-start">
                <MapPin
                  size={18}
                  className="text-blue-400 mr-2 mt-0.5 flex-shrink-0"
                />
                <span className="text-sm text-gray-300">
                  123 Gaming Street, Tech City, Pakistan
                </span>
              </div>
              <div className="flex items-center">
                <Phone size={18} className="text-blue-400 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-300">+92 234 234454</span>
              </div>
              <div className="flex items-center">
                <Mail size={18} className="text-blue-400 mr-2 flex-shrink-0" />
                <span className="text-sm text-gray-300">ayaan@email.com</span>
              </div>
            </div>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-6 relative inline-block">
              Quick Links
              <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-blue-500"></span>
            </h3>
            <ul className="space-y-3">
              {[
                { name: "Gaming PCs", href: "#" },
                { name: "PC Components", href: "#" },
                { name: "Peripherals", href: "#" },
                { name: "PC Cases", href: "#" },
                { name: "Cooling Solutions", href: "#" },
                { name: "Build Your PC", href: "#" },
                { name: "Special Offers", href: "#" },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group"
                  >
                    <ChevronRight
                      size={16}
                      className="mr-2 text-blue-500 transform group-hover:translate-x-1 transition-transform duration-200"
                    />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Customer Service */}
          <div>
            <h3 className="text-lg font-semibold mb-6 relative inline-block">
              Customer Service
              <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-blue-500"></span>
            </h3>
            <ul className="space-y-3">
              {[
                { name: "My Account", href: "#" },
                { name: "Track Your Order", href: "#" },
                { name: "Warranty Policy", href: "#" },
                { name: "Return Policy", href: "#" },
                { name: "FAQs", href: "#" },
                { name: "Contact Us", href: "#" },
              ].map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors duration-200 flex items-center group"
                  >
                    <ChevronRight
                      size={16}
                      className="mr-2 text-blue-500 transform group-hover:translate-x-1 transition-transform duration-200"
                    />
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Newsletter */}
          <div>
            <h3 className="text-lg font-semibold mb-6 relative inline-block">
              Newsletter
              <span className="absolute -bottom-1 left-0 w-12 h-0.5 bg-blue-500"></span>
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Subscribe to our newsletter for exclusive deals, new products, and
              gaming news.
            </p>

            <form onSubmit={handleSubscribe} className="mb-6">
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email address"
                  required
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg py-3 px-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 top-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-md p-1.5 transition-colors duration-200"
                  aria-label="Subscribe"
                >
                  <ArrowRight size={18} />
                </button>
              </div>
            </form>

            <h4 className="text-sm font-semibold mb-4">Follow Us</h4>
            <div className="flex space-x-3">
              {[
                {
                  icon: <Facebook size={18} />,
                  href: "#",
                  label: "Facebook",
                  color: "hover:bg-blue-600",
                },
                {
                  icon: <Twitter size={18} />,
                  href: "#",
                  label: "Twitter",
                  color: "hover:bg-blue-400",
                },
                {
                  icon: <Instagram size={18} />,
                  href: "#",
                  label: "Instagram",
                  color: "hover:bg-pink-600",
                },
                {
                  icon: <Youtube size={18} />,
                  href: "#",
                  label: "YouTube",
                  color: "hover:bg-red-600",
                },
                {
                  icon: <Discord size={18} />,
                  href: "#",
                  label: "Discord",
                  color: "hover:bg-indigo-600",
                },
                {
                  icon: <Twitch size={18} />,
                  href: "#",
                  label: "Twitch",
                  color: "hover:bg-purple-600",
                },
              ].map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  aria-label={social.label}
                  className={`w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:text-white ${social.color} transition-colors duration-200`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h4 className="text-sm font-medium text-gray-400 mb-3">
                Accepted Payment Methods
              </h4>
              <div className="flex space-x-3">
                {[
                  "Visa",
                  "Mastercard",
                  "PayPal",
                  "Apple Pay",
                  "Google Pay",
                ].map((method, index) => (
                  <div
                    key={index}
                    className="bg-gray-800 rounded px-3 py-1.5 flex items-center"
                  >
                    <CreditCard size={14} className="text-gray-400 mr-1.5" />
                    <span className="text-xs text-gray-300">{method}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
              <span className="text-sm text-gray-300">
                Online Support Available 24/7
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            © {new Date().getFullYear()} Custom Forge. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <a href="#" className="hover:text-gray-300 transition-colors">
              Privacy Policy
            </a>
            <span className="hidden md:inline">•</span>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Terms of Service
            </a>
            <span className="hidden md:inline">•</span>
            <a href="#" className="hover:text-gray-300 transition-colors">
              Sitemap
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Accent Line */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
    </footer>
  );
};

export default Footer;
