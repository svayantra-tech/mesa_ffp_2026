/**
 * scripts/import-c2-photos.ts
 * One-off: import Cohort-2 Flea / Convocation / Award photos from the supplied sheet.
 * Source: c2_photo_mapping.csv (112 rows, verified). flea & award IDs are TEAM-SHARED.
 *
 * Run (dry-run, verifies every link, writes nothing):  npx tsx scripts/import-c2-photos.ts
 * Commit for real:                                     DRY_RUN=false npx tsx scripts/import-c2-photos.ts
 *
 * Wiring for THIS repo (differs from the original draft):
 *   • connectDB   ← ../lib/mongodb          (dynamic import, AFTER dotenv, so MONGODB_DNS applies)
 *   • Student/Brand ← ../lib/models/*
 *   • uploadAsset ← ../lib/asset-upload     real signature: (buf, filename, contentType)
 */
import crypto from 'node:crypto'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

// ─── policy ───────────────────────────────────────────────────────────────────
const COHORT = 'cohort-2'
const DRY_RUN = process.env.DRY_RUN !== 'false' // default true; set DRY_RUN=false to write
const FLEA_OVERWRITE = true    // sheet is authoritative (flea was ~1/112, malformed; also fixes Amaira's junk URL)
const CONVOC_FILL_ONLY = true  // protect the ~100 already curated from the named folders
const AWARD_FILL_ONLY = true   // protect the 27 already curated (award lives on Brand)
const THUMB = (id: string) => `https://drive.google.com/thumbnail?id=${id}&sz=w2000`

// ─── verified mapping (name → drive file IDs) ──────────────────────────────────
type Row = { name: string; flea: string | null; convoc: string | null; award: string | null }
const ROWS: Row[] = [
  { name: 'Amaira Bhandari', flea: '1G-Q0KDmzAMClQqQFrk-F0ZnUn6rmskFQ', convoc: null, award: '1LTsbAvz4M0vcLAyKfeC0DvVK7zJDnebE' },
  { name: 'Aayush', flea: '1G-Q0KDmzAMClQqQFrk-F0ZnUn6rmskFQ', convoc: '1SrMU-jv1DsSCtaUOj99rvjFRANsl-Ihf', award: '1LTsbAvz4M0vcLAyKfeC0DvVK7zJDnebE' },
  { name: 'Sai Krish Mahajan', flea: '1G-Q0KDmzAMClQqQFrk-F0ZnUn6rmskFQ', convoc: '1r0lPMWGYQ56mIzUZYuDRLZ4AiPolSblI', award: '1LTsbAvz4M0vcLAyKfeC0DvVK7zJDnebE' },
  { name: 'Aarna Girdhar', flea: '1G-Q0KDmzAMClQqQFrk-F0ZnUn6rmskFQ', convoc: '1oETDJ1ZYo7VCPt7HDetTwCywZ2wB8V-O', award: '1LTsbAvz4M0vcLAyKfeC0DvVK7zJDnebE' },
  { name: 'Gourvi Sanganeria', flea: '10AN7Q9pIorDSFdypndu3mWIZkiK793dV', convoc: '1KquB-2SxSRcEvWF6Mqg-UPcPmzlkA2gA', award: '13V2BZ-SsUF60WNUj7i4nSxG9Irc5pxXr' },
  { name: 'Ananya Tayal', flea: '10AN7Q9pIorDSFdypndu3mWIZkiK793dV', convoc: '1jVQaDnKjoDbWE-HnYRQwpPSM0Ieq-rsR', award: '13V2BZ-SsUF60WNUj7i4nSxG9Irc5pxXr' },
  { name: 'Jordyn Quadros', flea: '10AN7Q9pIorDSFdypndu3mWIZkiK793dV', convoc: '1iax3ksMQeoEQLtKm7HadgImFUeHH8FNv', award: '13V2BZ-SsUF60WNUj7i4nSxG9Irc5pxXr' },
  { name: 'Hemanth Tahtsetti', flea: '1v6YvK6JPriaPAk46lvKYPznC52tPARC3', convoc: '1p-Iq5ngnXOdrH-MM-BX2-jHo5NE4n4RB', award: '15QYylSovVRESFqQb7Gj570d2zL3mn4C9' },
  { name: 'Aarav Ramchand Mishra', flea: '1v6YvK6JPriaPAk46lvKYPznC52tPARC3', convoc: '1eEMr-a6edTfSkaLtsiTjHDtaDxZlZ_tv', award: '15QYylSovVRESFqQb7Gj570d2zL3mn4C9' },
  { name: 'Veer Bhatia', flea: '1v6YvK6JPriaPAk46lvKYPznC52tPARC3', convoc: '1e2kDcR8w_unZzztBuR6MH91_QUTxvRu0', award: '15QYylSovVRESFqQb7Gj570d2zL3mn4C9' },
  { name: 'Humnabad Mohammed Izaan', flea: '1v6YvK6JPriaPAk46lvKYPznC52tPARC3', convoc: '18_8de3BtvbrF20VltPDsHfFicuIx1j5X', award: '15QYylSovVRESFqQb7Gj570d2zL3mn4C9' },
  { name: 'Maithili beke', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1XRmUZQ5lCOaRycjUaquWdEi5O6l5e0ch', award: '1nddNpsJAyIop-kMrGYdIw-SOHyvFHjjn' },
  { name: 'Yug Bader', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1FmtYIV8DZi13KHnTFFEsn7YSFQW4ZKqQ', award: '1nddNpsJAyIop-kMrGYdIw-SOHyvFHjjn' },
  { name: 'Akarsh Raniwala', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1EI79W6hdouroHukEU_tWGa2wXYm_qnT-', award: '1nddNpsJAyIop-kMrGYdIw-SOHyvFHjjn' },
  { name: 'Vijay Gopinathan', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1xB7aTvr7FdGcIuxYeVeNcrK8a7FCoNwe', award: '1nddNpsJAyIop-kMrGYdIw-SOHyvFHjjn' },
  { name: 'Samar Suneja', flea: '1WepbrV6IotyRvrz-TyIq-CuCb2n1smBy', convoc: '192cvxJTjcFUZd0LCbkhWxbwro0I0Pf3l', award: '1X-VQDGyQvu_FHKoiNt4lD8CM2FHX36t6' },
  { name: 'Harshvardhan Betala', flea: '1WepbrV6IotyRvrz-TyIq-CuCb2n1smBy', convoc: '17j27JfCeUr05H0F3Zoi-pdaa4pXYV4_R', award: '1X-VQDGyQvu_FHKoiNt4lD8CM2FHX36t6' },
  { name: 'Dhairya Agarwal', flea: '1WepbrV6IotyRvrz-TyIq-CuCb2n1smBy', convoc: '1m_oZMp0XvB3K7N9lAxW31-N-gsd2FqVh', award: '1X-VQDGyQvu_FHKoiNt4lD8CM2FHX36t6' },
  { name: 'Nimaay Reddy', flea: '1WepbrV6IotyRvrz-TyIq-CuCb2n1smBy', convoc: '1A0nnqHeXFwDLvLrJm_dLKJnxqNQiERpo', award: '1X-VQDGyQvu_FHKoiNt4lD8CM2FHX36t6' },
  { name: 'Parth Gupta', flea: '1tf_1avjU0H7tLK0a15ZcFF_a1bc9vukJ', convoc: '15q_oCneRRlKshszduyL09x8gmZyVYXyo', award: '1R7K_mh80YJMwnL0BVlLS4q6lr2E8jjEc' },
  { name: 'Aadhik Kumar A', flea: '1tf_1avjU0H7tLK0a15ZcFF_a1bc9vukJ', convoc: '1854aY7vQMDqrgvMaqQdmVQAFOxLd-Afa', award: '1R7K_mh80YJMwnL0BVlLS4q6lr2E8jjEc' },
  { name: 'Ahaan Taparia', flea: '1tf_1avjU0H7tLK0a15ZcFF_a1bc9vukJ', convoc: '1UfMlDP4CQeWMRq0-BNORmSx_mUm9kWhC', award: '1R7K_mh80YJMwnL0BVlLS4q6lr2E8jjEc' },
  { name: 'Krishay Patel', flea: '1tf_1avjU0H7tLK0a15ZcFF_a1bc9vukJ', convoc: '1mZ3C0K3xkIlskRSBW01J0WAbyXhwo6TL', award: '1R7K_mh80YJMwnL0BVlLS4q6lr2E8jjEc' },
  { name: 'Ayat pasha', flea: '1P3nFz6ZtvjNaLd6IDRVnmqahxHwCZZ7H', convoc: '17gRbTT9GgXj21aTABJ178KkxYMV8GCJW', award: '1BmL9wyJlB2nxquI3VHOWEl-DsEOIo8ch' },
  { name: 'Maanyah gathani', flea: '1P3nFz6ZtvjNaLd6IDRVnmqahxHwCZZ7H', convoc: '15N8Nx-p1iDvakL5GL4L600FO1qP1LjaU', award: '1BmL9wyJlB2nxquI3VHOWEl-DsEOIo8ch' },
  { name: 'Daksh Adwani', flea: '1P3nFz6ZtvjNaLd6IDRVnmqahxHwCZZ7H', convoc: '1AEVyOWHkDthheBqORvT65QuhQQ98Nubv', award: '1BmL9wyJlB2nxquI3VHOWEl-DsEOIo8ch' },
  { name: 'Medhansh Shah', flea: '1qdbaU5cjgqH8U6AoV61wXyqlGIuJn9bA', convoc: '1wg-8MMSy4bm3nEIAPk06fMwrrcmF7VO9', award: '1QgdFa8iUC3Q6Kx_aiBi7PuRbNWR8xyZX' },
  { name: 'Medhansh Daga', flea: '1qdbaU5cjgqH8U6AoV61wXyqlGIuJn9bA', convoc: '12MvautEl-laeGxHe42w40c94vqhs9A2r', award: '1QgdFa8iUC3Q6Kx_aiBi7PuRbNWR8xyZX' },
  { name: 'Ramabadran Rajah', flea: '1qdbaU5cjgqH8U6AoV61wXyqlGIuJn9bA', convoc: '1yAZFhl4yR7mrNM5wCPp90I38n9Za7cuw', award: '1QgdFa8iUC3Q6Kx_aiBi7PuRbNWR8xyZX' },
  { name: 'Vishnu Prajaan', flea: '1qdbaU5cjgqH8U6AoV61wXyqlGIuJn9bA', convoc: '1AIMdLb9v4F108cBxcj9vToYIlhGQJU01', award: '1QgdFa8iUC3Q6Kx_aiBi7PuRbNWR8xyZX' },
  { name: 'Vihaan Mehta Das', flea: '16ZoroVORqM-4UDkeCFw0qKHi_tF2ug0T', convoc: '16a41kYre-PCh8u8FHdNjF9WZF45cWb0C', award: null },
  { name: 'Tejaswin Ram Chandnani', flea: '16ZoroVORqM-4UDkeCFw0qKHi_tF2ug0T', convoc: '1JgSG4MPavAQHs-GKH99jiTCDzq90bRxQ', award: null },
  { name: 'Asmi Gupta', flea: '16ZoroVORqM-4UDkeCFw0qKHi_tF2ug0T', convoc: '1GfLQS3NxTujFAKRcK1iJqadr3PgB3TkJ', award: null },
  { name: 'Ranveer Reniwal', flea: '16ZoroVORqM-4UDkeCFw0qKHi_tF2ug0T', convoc: '1QxNkYqPjg0-VV4-qGxod6v2grVmWiEoI', award: null },
  { name: 'Dev Chopra', flea: '1WV_JEp_HvebnmkPrINeBaAB1pS7cS5uS', convoc: '1hI18xz4571-bMKk_9I9laZvYEcsunb_m', award: '1PDDMBGHnsPKRQUL9bBlQEevraN1Cmos6' },
  { name: 'Sivarakshith Cherukuri', flea: '1WV_JEp_HvebnmkPrINeBaAB1pS7cS5uS', convoc: '1ymD9CvSd1z0swQZLD4f-G4i9AOgR5BbQ', award: '1PDDMBGHnsPKRQUL9bBlQEevraN1Cmos6' },
  { name: 'Vansh Chopra', flea: '1WV_JEp_HvebnmkPrINeBaAB1pS7cS5uS', convoc: '1FQnbMxbmt37Fefr7eW06I9hwr2o0DZOG', award: '1PDDMBGHnsPKRQUL9bBlQEevraN1Cmos6' },
  { name: 'Anukarsh Dubey', flea: '1x1XST50-2Mx3F6I1YH8yLlvchI09haWL', convoc: '1Me7pRnLvvoofFoS_SvCYVqGRr_H4SvDB', award: '108uRfyviTuGyTz0i2wsm5XbDuR9B8bbt' },
  { name: 'Dev chauhan', flea: '1x1XST50-2Mx3F6I1YH8yLlvchI09haWL', convoc: '1tSgKHPfhhttOzLEdOBLIcL9eCa4l-Ihk', award: '108uRfyviTuGyTz0i2wsm5XbDuR9B8bbt' },
  { name: 'Aaganya Singh', flea: '1x1XST50-2Mx3F6I1YH8yLlvchI09haWL', convoc: '1ggKFRCJzCxHVH-EtGr79kWNT3z4xER9k', award: '108uRfyviTuGyTz0i2wsm5XbDuR9B8bbt' },
  { name: 'Panav K Bysani', flea: '1x1XST50-2Mx3F6I1YH8yLlvchI09haWL', convoc: '18y9npCwBHbHIaSDMjVdk_IQk8ltTj7aZ', award: '108uRfyviTuGyTz0i2wsm5XbDuR9B8bbt' },
  { name: 'Aviral Nahar', flea: '1SFqHhq_smP_V_g8uZ29HOc2RD7q8GUYS', convoc: '1cU1GqCO_EJemf8BfwYvSwnKt4Gdhjcjr', award: '16UAJbuZ2cm4cRMimiFMHHgfhCOCgtG7z' },
  { name: 'Blesson Sam Paul', flea: '1SFqHhq_smP_V_g8uZ29HOc2RD7q8GUYS', convoc: '18eANQUuRbVEaLUPS6aqb1dWqwF4CtFrI', award: '16UAJbuZ2cm4cRMimiFMHHgfhCOCgtG7z' },
  { name: 'Yashwanth Varma S.', flea: '1SFqHhq_smP_V_g8uZ29HOc2RD7q8GUYS', convoc: '1HsslYDqYIJNQagGNg-SRpOms_u4rqZFS', award: '16UAJbuZ2cm4cRMimiFMHHgfhCOCgtG7z' },
  { name: 'Nitya', flea: '1SFqHhq_smP_V_g8uZ29HOc2RD7q8GUYS', convoc: '1xCPTTleLsOEMeS_Cm4iYUQmU-CXR7Gni', award: '16UAJbuZ2cm4cRMimiFMHHgfhCOCgtG7z' },
  { name: 'Dhruv Salecha', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1djW4Zi8u2DMl3znhanTD_FuUiZyQuvtG', award: '1A-av_nfoFRp1MRmAzHqfDuT6Z627lJYe' },
  { name: 'Vishadh Chopra', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1aGrRD_iCXRJna-axTPf2YhMXQcXgtgUE', award: '1A-av_nfoFRp1MRmAzHqfDuT6Z627lJYe' },
  { name: 'Myra Chinmay Dhamne', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '1YTS74UreSOx-xTC5Y1Q_-9ZbejhSa5Kk', award: '1A-av_nfoFRp1MRmAzHqfDuT6Z627lJYe' },
  { name: 'Tanishka Udani', flea: '1NVOtHMI-OSkZtcyleKFuHa5ime4gFQ3_', convoc: '15jbp10o_k-Rjbka0Rnq7v1bnPtfzi0-k', award: '1A-av_nfoFRp1MRmAzHqfDuT6Z627lJYe' },
  { name: 'Abeer Arora', flea: '1qy9BLwQ6n4kU0LYESM7S8fw6jNwmSt1h', convoc: '1rjyptbTTwj_z5lEFtiYJx_5D1MAR5lqX', award: '136qXNddUrIOUoJm_qgH9XpLLRAm4x-IX' },
  { name: 'Ahana Goyal', flea: '1qy9BLwQ6n4kU0LYESM7S8fw6jNwmSt1h', convoc: '1CZ86WuIDC-n73Rwy-RUepdhk-uvMUQGH', award: '136qXNddUrIOUoJm_qgH9XpLLRAm4x-IX' },
  { name: 'Anvesha bhalerao', flea: '1qy9BLwQ6n4kU0LYESM7S8fw6jNwmSt1h', convoc: '1-hxbzwfEJlSapyRp0wTITHn7TbQwZSXv', award: '136qXNddUrIOUoJm_qgH9XpLLRAm4x-IX' },
  { name: 'Ashmi Bosamia', flea: '1qy9BLwQ6n4kU0LYESM7S8fw6jNwmSt1h', convoc: '1DLmce-oIWGO0hatLupAOpG4VZKX05669', award: '136qXNddUrIOUoJm_qgH9XpLLRAm4x-IX' },
  { name: 'Anaisha Aggarwal', flea: '1HbvBNDDzS-vRuFdLkqAeYt_khWh9Ku4b', convoc: '1KEt5CudIAPg550L9tZU3aSzPMDGwf9Pm', award: '15mgA4j90oZgaeZ_id1Fmvh3lvG55WZ88' },
  { name: 'Sara Atul Padalkar', flea: '1HbvBNDDzS-vRuFdLkqAeYt_khWh9Ku4b', convoc: '1s2qfxfgiuSRCCCPpEaC2j36vFpaZ3JW9', award: '15mgA4j90oZgaeZ_id1Fmvh3lvG55WZ88' },
  { name: 'Avinash Rauniyar', flea: '1HbvBNDDzS-vRuFdLkqAeYt_khWh9Ku4b', convoc: '1pDa5p66PBUg5DmXGiTQne5vnLn_ewVgO', award: '15mgA4j90oZgaeZ_id1Fmvh3lvG55WZ88' },
  { name: 'Riddhi Koli', flea: '1KyxINCX-9g8ifo5j9eUp86DU2i3F7ZaI', convoc: '1FKWsCScj3KX381MCKSMBiOX_r1u4amh7', award: '1TfHoDc8MPL2ecbKNLZTC0q8namEaJjsK' },
  { name: 'Krishnavi Deorah', flea: '1KyxINCX-9g8ifo5j9eUp86DU2i3F7ZaI', convoc: null, award: '1TfHoDc8MPL2ecbKNLZTC0q8namEaJjsK' },
  { name: 'Yana Patel', flea: '1KyxINCX-9g8ifo5j9eUp86DU2i3F7ZaI', convoc: '1PT_FyNx4qY_Kb0HObBdUNKChCSIzIrVs', award: '1TfHoDc8MPL2ecbKNLZTC0q8namEaJjsK' },
  { name: 'Krishnav Deorah', flea: '1DZ_7whjmD34Rvu24pJjNzv1m9K8jCo0K', convoc: '1jm-jQGu0RUuZBwecLAt_wFgoS1bIyy9s', award: '18FDaE2XQ6cxkK-DmAIg3jCsek8TvQ6Xn' },
  { name: 'Vansh', flea: '1DZ_7whjmD34Rvu24pJjNzv1m9K8jCo0K', convoc: '1yRVuiFphjv4AaGjlI99VDkozxh7RMEw_', award: '18FDaE2XQ6cxkK-DmAIg3jCsek8TvQ6Xn' },
  { name: 'Kundan', flea: '1DZ_7whjmD34Rvu24pJjNzv1m9K8jCo0K', convoc: '1Q2b08SqOKNZ-gq3KIcGhxYiDSXNx2UYx', award: '18FDaE2XQ6cxkK-DmAIg3jCsek8TvQ6Xn' },
  { name: 'Aria', flea: '1xfN5USJtDz2BfdeeEhmlA2k5MSHjzChx', convoc: '1rQNkW2ObKvyJCM1SmRZYg9UOS1OvWT_2', award: '11Z8eTRB3dS-b2C0WUrZcUkD6ljxgSquY' },
  { name: 'Jadyn Quadros', flea: '1xfN5USJtDz2BfdeeEhmlA2k5MSHjzChx', convoc: '1oU5pqP328AWz6J6iMfNiqqOzDkYPLUR6', award: '11Z8eTRB3dS-b2C0WUrZcUkD6ljxgSquY' },
  { name: 'Mona Sahasra Kosuru', flea: '1xfN5USJtDz2BfdeeEhmlA2k5MSHjzChx', convoc: '1kprxE8jo_XYEZ3T7rjXlmQZIyS1hKcrU', award: '11Z8eTRB3dS-b2C0WUrZcUkD6ljxgSquY' },
  { name: 'Riana Jindani', flea: '1xfN5USJtDz2BfdeeEhmlA2k5MSHjzChx', convoc: '114jo4en77mt7Bv7ZE-6oei7xx3dzIIMV', award: '11Z8eTRB3dS-b2C0WUrZcUkD6ljxgSquY' },
  { name: 'Meghana Veerapu', flea: '1h31PeBmtVUZAUlamoqIaA3UwChOD5J3S', convoc: '1pfd456OIw03rVh_aVDjgPs5hfsJtMacL', award: '19vsDvyP_Htl3eXTV8OPOPM70_9Pd1ODd' },
  { name: 'Vedika Bhor', flea: '1h31PeBmtVUZAUlamoqIaA3UwChOD5J3S', convoc: '14G-PV_XWS6OB4m_nsF1M5878pUfIOrLW', award: '19vsDvyP_Htl3eXTV8OPOPM70_9Pd1ODd' },
  { name: 'Sai Vikas Bachu', flea: '1h31PeBmtVUZAUlamoqIaA3UwChOD5J3S', convoc: '1gHCeUu34xYm6hnWOvok0Xu8iKZUlVyIC', award: '19vsDvyP_Htl3eXTV8OPOPM70_9Pd1ODd' },
  { name: 'Himanshu Sawlani', flea: '1emjBDYc5Q_71xjPLoJUaWGVB7WU0sfOC', convoc: '1vpKoDMN50zOSoxF4_Xaq8SOt0v_7tb-s', award: '1CY9NbxoXeqwqpQuX_yqnEWttfRzD3cyk' },
  { name: 'vihaan jain', flea: '1emjBDYc5Q_71xjPLoJUaWGVB7WU0sfOC', convoc: '1jCCDfev7FMhFDe6XkvPGT2BHtbSewpPq', award: '1CY9NbxoXeqwqpQuX_yqnEWttfRzD3cyk' },
  { name: 'Kuvam Tiwari', flea: '1emjBDYc5Q_71xjPLoJUaWGVB7WU0sfOC', convoc: '1wRTd94o6_S7lnuyralDu5h4yGrS1fl8T', award: '1CY9NbxoXeqwqpQuX_yqnEWttfRzD3cyk' },
  { name: 'Soham Badhe', flea: '1Y4bl02H0lvs1qzpsjbU_Tm8qW8cuZDkU', convoc: '1kYwem7B9ccKS86zJA_1awDcy1mrsj0-e', award: '1RTKvjn8o50M6zuMybTvDzzp2jfkKwPqt' },
  { name: 'Laksh Tiwari', flea: '1Y4bl02H0lvs1qzpsjbU_Tm8qW8cuZDkU', convoc: '1DOHa27YnF-570JT9ETcb0eT2QraC0Yso', award: '1RTKvjn8o50M6zuMybTvDzzp2jfkKwPqt' },
  { name: 'Sayf Mubeen', flea: '1Y4bl02H0lvs1qzpsjbU_Tm8qW8cuZDkU', convoc: '1jRcBter3cR3hJe5LLs8HHHF3Zo3_dduH', award: '1RTKvjn8o50M6zuMybTvDzzp2jfkKwPqt' },
  { name: 'Jai Patel', flea: '1Y4bl02H0lvs1qzpsjbU_Tm8qW8cuZDkU', convoc: '1sKxry6DC4mFApsX8MYDFYUFZwLL868tH', award: '1RTKvjn8o50M6zuMybTvDzzp2jfkKwPqt' },
  { name: 'Manan Agrawal', flea: '1AkFEKCexr-Mbyx-gzdCJlcmHbmq_eP1N', convoc: '1R5TCYTCdabSZTHIjOaO_fdNwBRPPDbCb', award: '12vJkXHKAzytcwj2B-gNcUTulKApoXzmV' },
  { name: 'Tanmay Jain', flea: '1AkFEKCexr-Mbyx-gzdCJlcmHbmq_eP1N', convoc: null, award: '12vJkXHKAzytcwj2B-gNcUTulKApoXzmV' },
  { name: 'Tarini Shekhar', flea: '1AkFEKCexr-Mbyx-gzdCJlcmHbmq_eP1N', convoc: '1I66RcGuMUdpxKfzbvF9NK5sF7gtYvTNu', award: '12vJkXHKAzytcwj2B-gNcUTulKApoXzmV' },
  { name: 'Atiksh Pathak', flea: '1AkFEKCexr-Mbyx-gzdCJlcmHbmq_eP1N', convoc: '1BWXNJAyPrRk4nvDQ-Jl65t2S-xJWMfUY', award: '12vJkXHKAzytcwj2B-gNcUTulKApoXzmV' },
  { name: 'Shlok Vaidya', flea: '1loB38B5kIqYb4_0ddS8TUtomXaGuIbc7', convoc: '1ZSGsFzr0HVPfv95UuyegQCCJ80t34Tt-', award: '1qr-zSsrHBQqhxecb453UbKm9lIzRuRW1' },
  { name: 'Gurjot Singh Walia', flea: '1loB38B5kIqYb4_0ddS8TUtomXaGuIbc7', convoc: '10WZeOlKmjvtB8F9jBi2FTp17DGwxiQv7', award: '1qr-zSsrHBQqhxecb453UbKm9lIzRuRW1' },
  { name: 'Jayashree Saravavanakumar', flea: '1loB38B5kIqYb4_0ddS8TUtomXaGuIbc7', convoc: '1nT8aK1nDdEcQcEwRhBOpzBt2OAVEQcju', award: '1qr-zSsrHBQqhxecb453UbKm9lIzRuRW1' },
  { name: 'Krishiv gupta', flea: '1loB38B5kIqYb4_0ddS8TUtomXaGuIbc7', convoc: '1Wp-8coJNjTMODgDOH6X-xM_ngJ3HuNuA', award: '1qr-zSsrHBQqhxecb453UbKm9lIzRuRW1' },
  { name: 'Shreyas Bhardwaj', flea: '1WGirSIzq3l8xp8SLXX63AnrrM_Q_6Qz2', convoc: '1T_OMgntKQs2cT38U7o6o-BS7zH0J37ze', award: '1pI0UmDLMovAULBn-ibsLqN5il2EZXpT9' },
  { name: 'Yug Sachdeva', flea: '1WGirSIzq3l8xp8SLXX63AnrrM_Q_6Qz2', convoc: '1rbBh4N2motnkf8f-uv7En2djHTwGb6Rf', award: '1pI0UmDLMovAULBn-ibsLqN5il2EZXpT9' },
  { name: 'Ridaan chheda', flea: '1WGirSIzq3l8xp8SLXX63AnrrM_Q_6Qz2', convoc: '1F4OAxvUrDM9x3yK91FLqlhBH6QT9V0bv', award: '1pI0UmDLMovAULBn-ibsLqN5il2EZXpT9' },
  { name: 'Dia Raja', flea: '1WGirSIzq3l8xp8SLXX63AnrrM_Q_6Qz2', convoc: '1vVTVGatqFOKiiNKwNtUw5EeM7KTIkCk2', award: '1pI0UmDLMovAULBn-ibsLqN5il2EZXpT9' },
  { name: 'Siddhi Jain', flea: '1wwAlV0STUqcMqSgezwhNXjQbVPC5tPBH', convoc: '1sPU9fridFRJyMcVAL2M2bbTWiIntThvC', award: '1qNN0g_d0e3kXjGvfIVcrHGqp7NxNlYzM' },
  { name: 'Syna Thakker', flea: '1wwAlV0STUqcMqSgezwhNXjQbVPC5tPBH', convoc: '1oOlTQZvyE96LT75eao5AKBGzm_J8Mh-C', award: '1qNN0g_d0e3kXjGvfIVcrHGqp7NxNlYzM' },
  { name: 'Bhuvneshwar', flea: '1wwAlV0STUqcMqSgezwhNXjQbVPC5tPBH', convoc: '1eNcnNhTdXC-xOkQiMZmKNfaNzcWoRt5k', award: '1qNN0g_d0e3kXjGvfIVcrHGqp7NxNlYzM' },
  { name: 'Parush Vohra', flea: '1wwAlV0STUqcMqSgezwhNXjQbVPC5tPBH', convoc: '1aDeru6p_5-V25LThtNhVXgetUJ8RXH0B', award: '1qNN0g_d0e3kXjGvfIVcrHGqp7NxNlYzM' },
  { name: 'Deeksha Medahal', flea: '1rgmLWnnrxhjRg0hEl9ZMhs4slnp5CJW4', convoc: '1T-nNEzCVxjp3GLIrKrQSWQWOTCROO6lU', award: '1WwS41VJCvqXot4BDKtGOn6xjxnIGNGyF' },
  { name: 'Aniruddh Ladha', flea: '1rgmLWnnrxhjRg0hEl9ZMhs4slnp5CJW4', convoc: '1DxT9QBYpnQw8Fo0h2BvQMtwHzW9qmrFZ', award: '1WwS41VJCvqXot4BDKtGOn6xjxnIGNGyF' },
  { name: 'Mairah Hanish Bhalla', flea: '1rgmLWnnrxhjRg0hEl9ZMhs4slnp5CJW4', convoc: '1ATg9NDPEB1I6ABh-T6vwuRExo2xsO7fM', award: '1WwS41VJCvqXot4BDKtGOn6xjxnIGNGyF' },
  { name: 'Zanish Hanish Bhalla', flea: '1rgmLWnnrxhjRg0hEl9ZMhs4slnp5CJW4', convoc: '1YJnVdN8ascEHLyBnt4sAFts9Ej_ZA1_h', award: '1WwS41VJCvqXot4BDKtGOn6xjxnIGNGyF' },
  { name: 'Ishvari Panchal', flea: '1UN9zXRxAe6figgAVFnbwGemZp1Cf_vd9', convoc: '1xAzNLNer9E0VawIGOWdd2KeC1_2sssTG', award: null },
  { name: 'Yohan Arnold Colaco', flea: '1UN9zXRxAe6figgAVFnbwGemZp1Cf_vd9', convoc: '1ILxjnJCxwUSuZKKoSJCi7t89aAiKbwwT', award: null },
  { name: 'Medhansh Amit Ashtekar', flea: '1UN9zXRxAe6figgAVFnbwGemZp1Cf_vd9', convoc: '1Lz6HZWMO10IVQou95X5rO0RFJ46MtCht', award: null },
  { name: 'Sidhak Singh Grewal', flea: '1UN9zXRxAe6figgAVFnbwGemZp1Cf_vd9', convoc: '1Gkl37mIIt29wNmNa20Pcsx_DOdaw-lDs', award: null },
  { name: 'Varnika Upadhyay', flea: '12sYtLSnAGGXV5cqBDi8fAT0eyas_xYjn', convoc: '1qYJT-uivMdSmutvZAy522HhmOPGRr4Tt', award: '1mJb856fWlIYUy8u5ja5IboijpdkdpP8V' },
  { name: 'Chahat Jain', flea: '12sYtLSnAGGXV5cqBDi8fAT0eyas_xYjn', convoc: '1zejn4D2pz3cf72ypxFw5juilDLue7uqc', award: '1mJb856fWlIYUy8u5ja5IboijpdkdpP8V' },
  { name: 'Mugunthan s', flea: '12sYtLSnAGGXV5cqBDi8fAT0eyas_xYjn', convoc: '1UC4McL7nVn7m5iTNEmtyRHJPNiE1C9fN', award: '1mJb856fWlIYUy8u5ja5IboijpdkdpP8V' },
  { name: 'Tanay Bhatnagar', flea: '12sYtLSnAGGXV5cqBDi8fAT0eyas_xYjn', convoc: '1T82p4WDtWSI1Xp5w9jEwKX_ruIDvlRKi', award: '1mJb856fWlIYUy8u5ja5IboijpdkdpP8V' },
  { name: 'Hriday Garg', flea: '1jGYRidWDawey9WmZkSftFWaNeTfxej02', convoc: null, award: '1r9BpKdunstp5Cq6cTIB1dHyarwVbtwXO' },
  { name: 'Divit Agrawal', flea: '1jGYRidWDawey9WmZkSftFWaNeTfxej02', convoc: null, award: '1r9BpKdunstp5Cq6cTIB1dHyarwVbtwXO' },
  { name: 'Archith Ragi', flea: '1jGYRidWDawey9WmZkSftFWaNeTfxej02', convoc: '1hlpliXFg_VyHVJL7iz_XNlZoiIXOBKzG', award: '1r9BpKdunstp5Cq6cTIB1dHyarwVbtwXO' },
  { name: 'kshetrajna', flea: '1jGYRidWDawey9WmZkSftFWaNeTfxej02', convoc: '1nj5EaWczuAfzFe7VzKtj7qoIRrd6QHsS', award: '1r9BpKdunstp5Cq6cTIB1dHyarwVbtwXO' },
  { name: 'Arjun Marwaha', flea: '1HMT1A2MVpU4Q2vU0NaW-WX5MNGB_Rgab', convoc: '11_VkWy2K5Jcf2gMeorE64LgaF5ySxCH-', award: '11Z8eTRB3dS-b2C0WUrZcUkD6ljxgSquY' },
  { name: 'Lavanya Kainth', flea: null, convoc: '1uSvxCN2omzU6JKc9kt5QimX-3xVTNiiP', award: null },
  { name: 'Avani Singh', flea: null, convoc: '1ReyJXzt07Q-sKezgGZLl3wlo_vepjTeY', award: null },
  { name: 'Ganjan Poddar', flea: null, convoc: null, award: null },
]

// ─── helpers ────────────────────────────────────────────────────────────────
const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim().replace(/[^a-z0-9 ]+$/g, '').trim()

const uploadCache = new Map<string, string>() // driveId -> hosted URL (upload once; flea/award are team-shared)
const hashSeen = new Map<string, string[]>()  // sha256 -> [driveId,...] (byte-dup / placeholder detection)
const fetchFail: { id: string; reason: string }[] = []

// assigned in main() after dotenv + dynamic import so MONGODB_DNS is applied first
let uploadAsset: (file: Buffer, filename?: string, contentType?: string) => Promise<string>

const shaCache = new Map<string, string>() // driveId -> content sha256 (thumbnail bytes)

/** Fetch (thumbnail) → hash → upload once. Returns hosted URL + content hash, or null. */
async function rehost(driveId: string): Promise<{ url: string; sha: string } | null> {
  let res: Response
  try { res = await fetch(THUMB(driveId)) }
  catch (e) { fetchFail.push({ id: driveId, reason: `fetch threw: ${(e as Error).message}` }); return null }
  const ct = res.headers.get('content-type') || ''
  if (!res.ok || !ct.startsWith('image/')) { // private/broken links return an HTML login page → caught here
    fetchFail.push({ id: driveId, reason: `status ${res.status}, content-type "${ct}"` })
    return null
  }
  const buf = Buffer.from(await res.arrayBuffer())
  const sha = crypto.createHash('sha256').update(buf).digest('hex')
  shaCache.set(driveId, sha)
  hashSeen.set(sha, [...(hashSeen.get(sha) || []), driveId])
  if (uploadCache.has(driveId)) return { url: uploadCache.get(driveId)!, sha }
  if (DRY_RUN) { uploadCache.set(driveId, `DRY:${driveId}`); return { url: `DRY:${driveId}`, sha } }
  const hosted = await uploadAsset(buf, `${COHORT}-${driveId}.jpg`, ct) // real signature: (buf, filename, contentType)
  uploadCache.set(driveId, hosted)
  return { url: hosted, sha }
}

/** sha256 of an already-hosted image URL (for cross-brand award de-duplication). */
async function shaOfUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    if (!r.ok) return null
    return crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex')
  } catch { return null }
}

async function main() {
  const { connectDB } = await import('../lib/mongodb')
  const { Student } = await import('../lib/models/Student')
  const { Brand } = await import('../lib/models/Brand')
  ;({ uploadAsset } = await import('../lib/asset-upload'))
  await connectDB()

  // normalized name index for cohort-2 students; refuse to guess on collisions
  const students = await Student.find({ cohort: COHORT })
  const index = new Map<string, typeof students>()
  for (const s of students) {
    const k = norm((s.name as string) || '')
    ;(index.get(k) ?? index.set(k, []).get(k)!).push(s)
  }

  // Index the content hash of every already-hosted brand award, so we never store
  // an award on an empty brand that is byte-identical to another brand's (the
  // KAZI/RefleKt 960916 B HEIC placeholder, which the sheet shares across brands).
  const brandsForHash = await Brand.find({ cohort: COHORT, award_photo: { $gt: '' } }, 'name award_photo').lean() as { name: string; award_photo: string }[]
  const awardOwnerBySha = new Map<string, string>() // content sha256 -> brand that already owns it
  for (const b of brandsForHash) {
    const sha = await shaOfUrl(b.award_photo)
    if (sha) awardOwnerBySha.set(sha, b.name)
  }

  const rep = {
    matched: 0, unmatched: [] as string[], ambiguous: [] as string[],
    flea: { set: 0, kept: 0 }, convoc: { set: 0, kept: 0 },
    award: { set: 0, kept: 0, noBrand: [] as string[], dup: [] as string[] },
  }

  for (const row of ROWS) {
    const hits = index.get(norm(row.name)) || []
    if (hits.length === 0) { rep.unmatched.push(row.name); continue }
    if (hits.length > 1) { rep.ambiguous.push(`${row.name} → ${hits.length} students`); continue }
    const st = hits[0] as unknown as Record<string, unknown> & { save: () => Promise<unknown> }
    rep.matched++

    // FLEA → Student.flea_market_photo
    if (row.flea) {
      if (FLEA_OVERWRITE || !st.flea_market_photo) {
        const u = await rehost(row.flea)
        if (u) { if (!DRY_RUN) st.flea_market_photo = u.url; rep.flea.set++ }
      } else rep.flea.kept++
    }
    // CONVOC → Student.convocation_photo
    if (row.convoc) {
      if (!CONVOC_FILL_ONLY || !st.convocation_photo) {
        const u = await rehost(row.convoc)
        if (u) { if (!DRY_RUN) st.convocation_photo = u.url; rep.convoc.set++ }
      } else rep.convoc.kept++
    }
    if (!DRY_RUN) await st.save()

    // AWARD → Brand.award_photo (per-brand; teammates share). Scope brand to cohort.
    if (row.award) {
      const brand = st.brand_id ? await Brand.findOne({ _id: st.brand_id, cohort: COHORT }) : null
      if (!brand) rep.award.noBrand.push(row.name)
      else if (AWARD_FILL_ONLY && brand.award_photo) rep.award.kept++
      else {
        const u = await rehost(row.award)
        if (u) {
          const owner = awardOwnerBySha.get(u.sha)
          if (owner && owner !== brand.name) {
            // byte-identical to another brand's award → don't store a known duplicate
            rep.award.dup.push(`${brand.name} — award identical to "${owner}" (sha ${u.sha.slice(0, 12)}…); left EMPTY`)
          } else {
            if (!DRY_RUN) { brand.award_photo = u.url; await brand.save() }
            awardOwnerBySha.set(u.sha, brand.name)
            rep.award.set++
          }
        }
      }
    }
  }

  // ─── report ──────────────────────────────────────────────────────────────
  const dupIds = [...hashSeen.entries()].filter(([, ids]) => new Set(ids).size > 1)
  console.log(`\n${DRY_RUN ? '◆ DRY RUN — nothing written' : '✔ COMMITTED'}  (cohort=${COHORT})`)
  console.log(`matched ${rep.matched}/${ROWS.length} students`)
  console.log(`flea   : set ${rep.flea.set}, kept-existing ${rep.flea.kept}`)
  console.log(`convoc : set ${rep.convoc.set}, kept-existing ${rep.convoc.kept}`)
  console.log(`award  : set ${rep.award.set}, kept-existing ${rep.award.kept}`)
  console.log(`unique images fetched/uploaded: ${uploadCache.size}`)
  if (rep.unmatched.length) console.log(`\n⚠ UNMATCHED names (${rep.unmatched.length}) — not in cohort-2, fix spelling or roster:\n   ${rep.unmatched.join('\n   ')}`)
  if (rep.ambiguous.length) console.log(`\n⚠ AMBIGUOUS names (matched >1 student) — resolved to NOTHING:\n   ${rep.ambiguous.join('\n   ')}`)
  const dupUnique = [...new Set(rep.award.dup)]
  if (dupUnique.length) console.log(`\n🔁 AWARD duplicates left EMPTY (${dupUnique.length} brand) — need their own real photo:\n   ${dupUnique.join('\n   ')}`)
  if (rep.award.noBrand.length) console.log(`\n⚠ AWARD skipped, no brand on student:\n   ${rep.award.noBrand.join('\n   ')}`)
  if (fetchFail.length) console.log(`\n⚠ FETCH FAILURES (${fetchFail.length}) — link not public / not an image:\n   ${fetchFail.map((f) => `${f.id}  (${f.reason})`).join('\n   ')}`)
  if (dupIds.length) console.log(`\n⚠ BYTE-IDENTICAL images under different Drive IDs (possible placeholder, cf. RefleKt/KAZI):\n   ${dupIds.map(([h, ids]) => `${h.slice(0, 12)}… : ${[...new Set(ids)].join(', ')}`).join('\n   ')}`)

  // final DB truth ($gt:'' — excludes '' AND missing fields)
  const fleaN = await Student.countDocuments({ cohort: COHORT, flea_market_photo: { $gt: '' } })
  const convN = await Student.countDocuments({ cohort: COHORT, convocation_photo: { $gt: '' } })
  const awardN = await Brand.countDocuments({ cohort: COHORT, award_photo: { $gt: '' } })
  console.log(`\nDB now → flea ${fleaN}/112 students · convocation ${convN}/112 students · award ${awardN}/30 brands`)
  console.log('')
  process.exit(0)
}

main().catch((e) => { console.error(e); process.exit(1) })
