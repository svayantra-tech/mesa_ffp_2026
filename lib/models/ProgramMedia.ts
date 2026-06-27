import { Schema, model, models, type Model, type InferSchemaType } from 'mongoose'

const ProgramMediaSchema = new Schema(
  {
    cohort: { type: String, required: true, index: true },
    key: { type: String, required: true },
    value: { type: String, default: '' },
  },
  { collection: 'program_media', timestamps: true }
)

// Compound unique: one value per (cohort, key) pair.
// Migration script drops the old `key`-only unique index and creates this one.
ProgramMediaSchema.index({ cohort: 1, key: 1 }, { unique: true })

export type ProgramMediaDoc = InferSchemaType<typeof ProgramMediaSchema>

export const ProgramMedia: Model<ProgramMediaDoc> =
  (models.ProgramMedia as Model<ProgramMediaDoc>) ||
  model<ProgramMediaDoc>('ProgramMedia', ProgramMediaSchema)

export default ProgramMedia
