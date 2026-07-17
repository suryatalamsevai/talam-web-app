-- AlterTable
ALTER TABLE "product_tags" ADD COLUMN     "is_default" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "theme_key" TEXT;

-- CreateTable
CREATE TABLE "store_promotion_products" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "promotion_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,

    CONSTRAINT "store_promotion_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_promotion_products_tenant_id_promotion_id_product_id_key" ON "store_promotion_products"("tenant_id", "promotion_id", "product_id");

-- AddForeignKey
ALTER TABLE "store_promotion_products" ADD CONSTRAINT "store_promotion_products_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "store_promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_promotion_products" ADD CONSTRAINT "store_promotion_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
