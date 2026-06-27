import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose'
import './Brand' // ensure Brand model is registered for populate()

const StudentSchema = new Schema(
  {
    cohort: { type: String, required: true, index: true },
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    certificate_url: { type: String, default: '' },
    brand_id: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
    profile_photo: { type: String, default: '' },
    convocation_photo: { type: String, default: '' },
    flea_market_photo: { type: String, default: '' },
    demo_day_photo: { type: String, default: '' },
  },
  { collection: 'students', timestamps: true }
)

export type StudentDoc = InferSchemaType<typeof StudentSchema>

export const Student: Model<StudentDoc> =
  (models.Student as Model<StudentDoc>) || model<StudentDoc>('Student', StudentSchema)

export default Student
