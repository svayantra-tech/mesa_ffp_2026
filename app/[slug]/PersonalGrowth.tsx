/**
 * Personal Growth pull-quote — a student's own reflection on what the Future
 * Founder Program taught them, rendered as a styled testimonial. Cohort-agnostic:
 * renders for any cohort whenever `text` is non-empty, and returns null (hides
 * the whole section) when it is empty.
 */

type Props = {
  text: string
  studentName: string
}

export default function PersonalGrowth({ text, studentName }: Props) {
  const clean = (text ?? '').trim()
  if (!clean) return null

  const firstName = studentName.split(' ')[0]

  return (
    <section className="slide growth-section" id="growth">
      <div className="growth-inner">
        <div className="growth-eyebrow">Personal Growth &middot; In their words</div>
        <span className="growth-mark" aria-hidden="true">&ldquo;</span>
        <blockquote className="growth-quote">{clean}</blockquote>
        <div className="growth-attr">— {firstName}, FFP Graduate</div>
      </div>
    </section>
  )
}
