"use client"

import useEmblaCarousel from "embla-carousel-react"
import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { ProductCarouselIndicator } from "@/components/molecules"
import { useScreenSize } from "@/hooks/useScreenSize"
import { useState } from "react"

function ImageZoomModal({
  src,
  onClose,
}: {
  src: string
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={onClose}
    >
      <button
        aria-label="Close zoom"
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
        onClick={onClose}
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div
        className="max-w-[90vw] max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={decodeURIComponent(src)}
          alt="Product image zoomed"
          width={1200}
          height={1200}
          quality={90}
          className="max-h-[90vh] w-auto object-contain rounded"
        />
      </div>
    </div>
  )
}

export const ProductCarousel = ({
  slides = [],
}: {
  slides: HttpTypes.StoreProduct["images"]
}) => {
  const screenSize = useScreenSize()
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    axis:
      screenSize === "xs" || screenSize === "sm" || screenSize === "md"
        ? "x"
        : "y",
    loop: true,
    align: "start",
  })

  return (
    <>
      <div className="embla relative">
        <div
          className="embla__viewport overflow-hidden rounded-xs"
          ref={emblaRef}
        >
          <div className="embla__container h-[350px] lg:h-fit max-h-[698px] flex lg:block">
            {(slides || []).map((slide, idx) => (
              <div
                key={slide.id}
                className="embla__slide min-w-0 h-[350px] lg:h-fit cursor-zoom-in"
                onClick={() => setZoomedSrc(slide.url)}
                title="Click to zoom"
              >
                <Image
                  priority={idx === 0}
                  fetchPriority={idx === 0 ? "high" : "auto"}
                  src={decodeURIComponent(slide.url)}
                  alt="Product image"
                  width={700}
                  height={700}
                  quality={idx === 0 ? 85 : 70}
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  className="max-h-[700px] w-full h-auto aspect-square object-cover object-center"
                />
              </div>
            ))}
          </div>
          {slides?.length ? (
            <ProductCarouselIndicator slides={slides} embla={emblaApi} />
          ) : null}
        </div>
      </div>

      {zoomedSrc && (
        <ImageZoomModal
          src={zoomedSrc}
          onClose={() => setZoomedSrc(null)}
        />
      )}
    </>
  )
}
