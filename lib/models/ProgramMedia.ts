import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose'

const ProgramMediaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, default: '' },
  },
  { collection: 'program_media', timestamps: true }
)

export type ProgramMediaDoc = InferSchemaType<typeof ProgramMediaSchema>

export const ProgramMedia: Model<ProgramMediaDoc> =
  (models.ProgramMedia as Model<ProgramMediaDoc>) ||
  model<ProgramMediaDoc>('ProgramMedia', ProgramMediaSchema)

export default ProgramMedia
