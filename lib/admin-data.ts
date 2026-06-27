/**
 * Admin data helpers — thin wrappers over lib/db/queries.ts.
 * All functions require a `cohort` argument so queries are always scoped.
 */

export type { AdminBrand, AdminStudent } from '@/lib/db/queries'
export {
  listBrands,
  getBrand,
  listStudents,
  getStudent,
  listProgramMedia,
  revalidatePublic,
} from '@/lib/db/queries'
