/**
 * Public-facing data helpers — thin wrappers over lib/db/queries.ts.
 * All functions require a `cohort` argument so queries are always scoped.
 */

export type { BrandShape, StudentShape } from '@/lib/db/queries'
export {
  getAllStudentSlugs,
  getStudentBySlug,
  getStudentMeta,
  getDirectoryStudents,
  getBrandsBySlugs,
  getAwardBrands,
  getAllStudentsBasic,
  getProgramMedia,
} from '@/lib/db/queries'
