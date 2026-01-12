'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRight, ChevronLeft } from 'lucide-react'
import { carouselImages } from '@/lib/carousel-images'

interface Slide {
  id: number
  title: string
  subtitle: string
  description: string
  imageUrl: string
  textColor: string
}

const slides: Slide[] = [
  {
    id: 1,
    title: carouselImages.border.title,
    subtitle: carouselImages.border.subtitle,
    description: carouselImages.border.description,
    imageUrl: carouselImages.border.url,
    textColor: 'text-white',
  },
  {
    id: 2,
    title: carouselImages.arrivals.title,
    subtitle: carouselImages.arrivals.subtitle,
    description: carouselImages.arrivals.description,
    imageUrl: carouselImages.arrivals.url,
    textColor: 'text-white',
  },
  {
    id: 3,
    title: carouselImages.departures.title,
    subtitle: carouselImages.departures.subtitle,
    description: carouselImages.departures.description,
    imageUrl: carouselImages.departures.url,
    textColor: 'text-white',
  },
  {
    id: 4,
    title: carouselImages.travelers.title,
    subtitle: carouselImages.travelers.subtitle,
    description: carouselImages.travelers.description,
    imageUrl: carouselImages.travelers.url,
    textColor: 'text-white',
  },
]

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(true)

  useEffect(() => {
    if (!isAutoPlaying) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000) // تغيير الصورة كل 5 ثواني

    return () => clearInterval(interval)
  }, [isAutoPlaying])

  const goToSlide = (index: number) => {
    setCurrentSlide(index)
    setIsAutoPlaying(false)
    setTimeout(() => setIsAutoPlaying(true), 10000) // إعادة تفعيل التلقائي بعد 10 ثواني
  }

  const nextSlide = () => {
    goToSlide((currentSlide + 1) % slides.length)
  }

  const prevSlide = () => {
    goToSlide((currentSlide - 1 + slides.length) % slides.length)
  }

  return (
    <section className="relative h-[200px] sm:h-[225px] md:h-[250px] lg:h-[275px] overflow-hidden">
      {/* Slides */}
      <div className="relative h-full">
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <div className="h-full relative">
              {/* Background Image */}
              <Image
                src={slide.imageUrl}
                alt={slide.title}
                fill
                className="object-cover"
                priority={index === 0}
                quality={90}
              />
              
              {/* Overlay for better text readability */}
              <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60"></div>
              
              {/* Content */}
              <div className={`relative z-10 h-full flex items-center justify-center text-center px-4 ${slide.textColor}`}>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-2 md:mb-3 drop-shadow-lg">
                    {slide.title}
                  </h2>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl mb-1 md:mb-2 font-semibold drop-shadow-md">
                    {slide.subtitle}
                  </p>
                  <p className="text-xs sm:text-sm md:text-base text-white/95 drop-shadow-md">
                    {slide.description}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Overlay Content */}
      <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-20 pointer-events-none">
        <div className="text-center text-white px-4">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2">
            معاً نحقق الأفضل
          </h1>
          <p className="text-xs sm:text-sm md:text-base lg:text-lg mb-2 md:mb-3 opacity-90">
            TOGETHER WE ACHIEVE THE BEST
          </p>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute right-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-1.5 md:p-2 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="الصورة السابقة"
      >
        <ChevronRight className="w-4 h-4 md:w-5 md:h-5" />
      </button>
      <button
        onClick={nextSlide}
        className="absolute left-2 top-1/2 -translate-y-1/2 z-30 bg-white/90 hover:bg-white text-gray-800 p-1.5 md:p-2 rounded-full shadow-lg transition-all hover:scale-110"
        aria-label="الصورة التالية"
      >
        <ChevronLeft className="w-4 h-4 md:w-5 md:h-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-1.5">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all ${
              index === currentSlide
                ? 'bg-white w-6 md:w-8'
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`انتقل إلى الشريحة ${index + 1}`}
          />
        ))}
      </div>
    </section>
  )
}

