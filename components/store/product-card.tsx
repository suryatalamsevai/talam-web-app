import Image from 'next/image'
import Link from 'next/link'
import type { Product, ProductCategory } from '@prisma/client'

type Props = {
  product: Product & { category?: Pick<ProductCategory, 'name'> | null }
}

export function ProductCard({ product }: Props) {
  const discount =
    product.comparePrice && Number(product.comparePrice) > Number(product.price)
      ? Math.round((1 - Number(product.price) / Number(product.comparePrice)) * 100)
      : null

  const imageUrl = product.images[0] ? `${product.images[0]}?f_auto,q_auto,w_400` : null

  return (
    <Link
      href={`/product/${product.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-store-primary"
    >
      <div className="relative aspect-[3/4] bg-bg">
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}
        {discount && (
          <span className="absolute bottom-3 left-3 rounded-sm bg-danger px-2 py-1 font-body text-2xs leading-[14px] font-bold text-surface">
            {discount}% OFF
          </span>
        )}
      </div>
      <div className="p-3 sm:p-4">
        {product.category?.name && (
          <p className="mb-1.5 font-body text-xs tracking-[0.05em] text-muted-warm uppercase">
            {product.category.name}
          </p>
        )}
        <p className="mb-2 line-clamp-2 font-heading text-base leading-[130%] font-bold text-fg">
          {product.name}
        </p>
        <div className="flex items-center gap-2">
          <span className="font-body text-base leading-5 font-bold text-fg">
            ₹{Number(product.price).toLocaleString('en-IN')}
          </span>
          {product.comparePrice && (
            <span className="font-body text-sm leading-tight text-muted-warm line-through">
              ₹{Number(product.comparePrice).toLocaleString('en-IN')}
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
