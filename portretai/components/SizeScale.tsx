// The two sizes drawn to scale (4 px per cm), so the difference is visible.

export default function SizeScale({ sizes }: { sizes: { key: string; label: string; price: string; w: number; h: number }[] }) {
  const PX_PER_CM = 4;
  return (
    <div className="scale" role="img" aria-label={`Dydžiai masteliu: ${sizes.map((s) => s.label).join(' ir ')}`}>
      {sizes.map((s) => (
        <figure key={s.key} style={{ width: s.w * PX_PER_CM }}>
          <div className="frame frame--juodas thin" style={{ width: s.w * PX_PER_CM, height: s.h * PX_PER_CM }}>
            <div className="glass ph-size">
              <span>
                {s.w} cm
                <br />×<br />
                {s.h} cm
              </span>
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
