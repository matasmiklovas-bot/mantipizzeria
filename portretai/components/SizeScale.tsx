// The two poster sizes drawn to the same scale, each with the real example
// portrait inside, so the difference is easy to see.

type Img = { src: string; width: number; height: number } | null;

export default function SizeScale({ sizes, image }: { sizes: { key: string; label: string; price: string; w: number; h: number }[]; image?: Img }) {
  const PX_PER_CM = 5;
  return (
    <div className="scale" role="img" aria-label={`Dydžiai masteliu: ${sizes.map((s) => s.label).join(' ir ')}`}>
      {sizes.map((s) => (
        <figure key={s.key} style={{ width: s.w * PX_PER_CM }}>
          <div className="frame frame--azuolas thin" style={{ width: s.w * PX_PER_CM, height: s.h * PX_PER_CM }}>
            <div className={image ? 'glass' : 'glass ph-size'}>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="scale-img" src={image.src} width={image.width} height={image.height} alt="" loading="lazy" />
              ) : (
                <span>
                  {String(s.w).replace('.', ',')} cm
                  <br />×<br />
                  {String(s.h).replace('.', ',')} cm
                </span>
              )}
            </div>
          </div>
          <figcaption>
            <strong>{s.label}</strong>
            <span>{s.price}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
