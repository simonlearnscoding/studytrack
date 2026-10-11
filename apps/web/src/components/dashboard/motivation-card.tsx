// Photo: Jimmy Liu on Unsplash — https://unsplash.com/photos/jagged-mountain-peaks-under-orange-cloud-_frXlVQ_WZk
import mountains from '~/assets/mountains.jpg'

// A quiet decorative closer for the personal rail: the mountain photo with a
// short quote. Purely presentational.
export function MotivationCard() {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-border shadow-sm">
      <img src={mountains} alt="" className="h-44 w-full object-cover object-[center_40%]" />
      <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
      <figcaption className="absolute inset-x-0 bottom-0 p-4 text-sm font-medium leading-snug text-foreground/95">
        &ldquo;Discipline is just love for your future self.&rdquo;
      </figcaption>
    </figure>
  )
}
