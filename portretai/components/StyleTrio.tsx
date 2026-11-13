// One customer photo and the same pet in all three styles. Used on the home
// page when the examples are one animal; a single photo shown three times
// would only fill space.

type Img = { src: string; width: number; height: number; srcSet?: string };

export default function StyleTrio({ name, photo, items }: { name: string; photo: Img; items: { style: string; description: string; portrait: Img; frame: string }[] }) {
  return (
    <div className="trio">
      <figure className="trio-photo polaroid">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 900px) 210px, 128px" width={photo.width} height={photo.height} alt={`${name}: nuotrauka, iš kurios piešėme`} loading="lazy" decoding="async" />
        <figcaption>{name} nuotrauka</figcaption>
      </figure>
      <p className="trio-note">Iš šios vienos nuotraukos nupiešėme tris portretus. Stilių pasirenkate užsakydami.</p>
      <ol className="trio-strip" aria-label="Tas pats augintinis trimis stiliais">
        {items.map((it) => (
          <li key={it.style}>
            <div className={`frame frame--${it.frame}`}>
              <div className="glass">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={it.portrait.src}
                  srcSet={it.portrait.srcSet}
                  sizes="(min-width: 900px) 300px, 68vw"
                  width={it.portrait.width}
                  height={it.portrait.height}
                  alt={`${name}: portretas, stilius ${it.style.toLocaleLowerCase('lt-LT')}`}
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </div>
            <h3>{it.style}</h3>
            <p>{it.description}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
