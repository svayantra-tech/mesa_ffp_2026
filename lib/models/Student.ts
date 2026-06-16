import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose'
import './Brand' // ensure Brand model is registered for populate()

const StudentSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    email: { type: String, default: '' },
    certificate_url: { type: String, default: '' },
    brand_id: { type: Schema.Types.ObjectId, ref: 'Brand', index: true },
  },
  { collection: 'students', timestamps: true }
)

export type StudentDoc = InferSchemaType<typeof StudentSchema>

export const Student: Model<StudentDoc> =
  (models.Student as Model<StudentDoc>) || model<StudentDoc>('Student', StudentSchema)

export default Student
