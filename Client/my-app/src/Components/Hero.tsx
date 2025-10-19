//File: Client/my-app/src/Components/Hero.tsx
"use client";

import type React from "react";
import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// PC product data
const pcProducts = [
  {
    id: 1,
    title: "Phantom Gaming PC",
    description: "Ultimate gaming experience with RTX 4080 & Intel i9",
    image: "/assets/PhantomGamingPC.jpg?height=600&width=800",
    bgColor: "from-blue-600 to-indigo-900",
    buttonText: "Shop Now",
    buttonLink: "#",
    countdown: true,
    countdownEnd: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
  },
  {
    id: 2,
    title: "Aurora RGB Beast",
    description: "Stunning RGB lighting with AMD Ryzen 9 & 32GB RAM",
    image: "/assets/Aurora-Black-RGB.jpg?height=600&width=800",
    bgColor: "from-purple-600 to-indigo-800",
    buttonText: "View Details",
    buttonLink: "#",
    countdown: false,
  },
  {
    id: 3,
    title: "Stealth Mini ITX",
    description: "Compact powerhouse for your gaming setup",
    image: "/assets/stealth-mini-itx.jpg?height=600&width=800",
    bgColor: "from-gray-800 to-gray-900",
    buttonText: "Pre-Order",
    buttonLink: "#",
    countdown: true,
    countdownEnd: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  },
];

// Featured products for smaller cards
const featuredProducts = [
  {
    id: 1,
    title: "RTX 4070 Gaming PC",
    description: "Mid-range performance beast",
    image: "/assets/PhantomGamingPC.jpg?height=300&width=400",
    bgColor: "bg-blue-500",
    buttonText: "View Details",
    buttonLink: "#",
  },
  {
    id: 2,
    title: "Budget Gaming Rig",
    description: "Affordable gaming experience",
    image: "/assets/Aurora-Black-RGB.jpg?height=300&width=400",
    bgColor: "bg-amber-500",
    buttonText: "View Details",
    buttonLink: "#",
  },
];

interface CountdownProps {
  endDate: Date;
}

const Countdown: React.FC<CountdownProps> = ({ endDate }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = endDate.getTime() - new Date().getTime();

      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  return (
    <div className="flex gap-2 mt-4">
      <div className="bg-white rounded-lg p-2 w-16 text-center">
        <div className="text-2xl font-bold text-gray-800">{timeLeft.days}</div>
        <div className="text-xs text-gray-600">Days</div>
      </div>
      <div className="bg-white rounded-lg p-2 w-16 text-center">
        <div className="text-2xl font-bold text-gray-800">
          {timeLeft.hours.toString().padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-600">Hr</div>
      </div>
      <div className="bg-white rounded-lg p-2 w-16 text-center">
        <div className="text-2xl font-bold text-gray-800">
          {timeLeft.minutes.toString().padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-600">Min</div>
      </div>
      <div className="bg-white rounded-lg p-2 w-16 text-center">
        <div className="text-2xl font-bold text-gray-800">
          {timeLeft.seconds.toString().padStart(2, "0")}
        </div>
        <div className="text-xs text-gray-600">Sc</div>
      </div>
    </div>
  );
};

const HeroSection: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev === pcProducts.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev === 0 ? pcProducts.length - 1 : prev - 1));
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  // Handle autoplay
  useEffect(() => {
    if (isAutoPlaying) {
      autoPlayRef.current = setInterval(() => {
        nextSlide();
      }, 5000);
    }

    return () => {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
      }
    };
  }, [isAutoPlaying, currentSlide]);

  // Pause autoplay on hover
  const pauseAutoPlay = () => setIsAutoPlaying(false);
  const resumeAutoPlay = () => setIsAutoPlaying(true);

  return (
    <div className="w-full overflow-hidden">
      {/* Main Carousel */}
      <div className="relative">
        <div
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          onMouseEnter={pauseAutoPlay}
          onMouseLeave={resumeAutoPlay}
        >
          {pcProducts.map((product) => (
            <div
              key={product.id}
              className={`w-full flex-shrink-0 relative bg-gradient-to-r ${product.bgColor} overflow-hidden`}
            >
              <div className="container mx-auto px-4 py-12 md:py-24 flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 text-white z-10 mb-8 md:mb-0">
                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                    {product.title}
                  </h1>
                  <p className="text-lg md:text-xl mb-6">
                    {product.description}
                  </p>

                  {product.countdown && product.countdownEnd && (
                    <Countdown endDate={product.countdownEnd} />
                  )}

                  <button className="mt-6 bg-white text-blue-700 hover:bg-blue-50 transition-colors px-8 py-3 rounded-md font-semibold">
                    {product.buttonText}
                  </button>
                </div>
                <div className="md:w-1/2 flex justify-center items-center">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.title}
                    className="w-150 h-80 object-cover rounded-lg shadow-2xl transform transition-transform duration-300 hover:scale-105"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors z-20"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full transition-colors z-20"
          aria-label="Next slide"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        {/* Dots Navigation */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2 z-20">
          {pcProducts.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentSlide === index ? "bg-white" : "bg-white/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Featured Products Grid */}
      <div className="container mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        {featuredProducts.map((product) => (
          <div
            key={product.id}
            className={`${product.bgColor} rounded-xl overflow-hidden shadow-lg`}
          >
            <div className="p-6 flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 text-white mb-4 md:mb-0">
                <h2 className="text-2xl font-bold mb-2">{product.title}</h2>
                <p className="mb-4">{product.description}</p>
                <button className="bg-white text-blue-700 hover:bg-blue-50 transition-colors px-6 py-2 rounded-md font-medium">
                  {product.buttonText}
                </button>
              </div>
              <div className="md:w-1/2 flex justify-center">
                <img
                  src={product.image || "/placeholder.svg"}
                  alt={product.title}
                  className="max-w-full h-auto rounded-lg"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeroSection;
