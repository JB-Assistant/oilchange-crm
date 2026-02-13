import Image from 'next/image'
import { cn } from '@/lib/utils'

type Variant = 'full' | 'head' | 'monogram' | 'mascot'
type Size = 'sm' | 'md' | 'lg'

const variantSrc: Record<Variant, string> = {
  full: '/images/logos/otto-full.png',
  head: '/images/logos/otto-head.png',
  monogram: '/images/logos/otto-monogram.png',
  mascot: '/images/logos/otto-otto.png',
}

const sizeDimensions: Record<Variant, Record<Size, { width: number; height: number }>> = {
  full: { sm: { width: 120, height: 50 }, md: { width: 190, height: 80 }, lg: { width: 280, height: 118 } },
  head: { sm: { width: 24, height: 24 }, md: { width: 32, height: 32 }, lg: { width: 48, height: 48 } },
  monogram: { sm: { width: 24, height: 24 }, md: { width: 32, height: 32 }, lg: { width: 48, height: 48 } },
  mascot: { sm: { width: 48, height: 48 }, md: { width: 64, height: 64 }, lg: { width: 80, height: 80 } },
}

interface OttoLogoProps {
  variant?: Variant
  size?: Size
  className?: string
}

export function OttoLogo({ variant = 'head', size = 'md', className }: OttoLogoProps) {
  const { width, height } = sizeDimensions[variant][size]

  return (
    <Image
      src={variantSrc[variant]}
      alt="OttoManagerPro"
      width={width}
      height={height}
      className={cn('object-contain', className)}
      priority={size !== 'sm'}
    />
  )
}
