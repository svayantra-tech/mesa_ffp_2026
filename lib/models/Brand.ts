import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose'

const BrandSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    revenue: { type: Number, default: 0 },
    customers: { type: Number, default: 0 },
    awards: { type: [String], default: [] },
    award_descriptions: { type: [String], default: [] },
    videos: { type: [String], default: [] },
    ad_statics: { type: [String], default: [] },
    flea_photos: { type: [String], default: [] },
    demo_photos: { type: [String], default: [] },
    website: { type: String, default: '' },
    instagram: { type: String, default: '' },
    product_photo: { type: String, default: '' },
  },
  { collection: 'brands', timestamps: true }
)

export type BrandDoc = InferSchemaType<typeof BrandSchema>

export const Brand: Model<BrandDoc> =
  (models.Brand as Model<BrandDoc>) || model<BrandDoc>('Brand', BrandSchema)

export default Brand
