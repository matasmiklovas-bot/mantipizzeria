// "Photo → portrait" scene: the customer's photo as a tilted print, the
// portrait in a frame. Without real files it shows clearly labelled empty
// places, never borrowed or invented pictures.

type Img = { src: string; width: number; height: number } | null;

export default function ExamplePair({
  photo,
  portrait,
  name,
  frame = 'azuolas',
  priority = false,
}: {
  photo: Img;
  portrait: Img;
  name: string | null;
  frame?: string;
  priority?: boolean;
}) {
  const label = name ?? 'augintinis';
  return (
    <div className="pair scene">
      <figure className="before polaroid">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} width={photo.width} height={photo.height} alt={`${label}: nuotrauka`} loading={priority ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="ph ph-photo">
            <span>Vieta tikrai nuotraukai</span>
          </div>
        )}
        <figcaption>Nuotrauka</figcaption>
      </figure>
      <span className="arrow" aria-hidden="true">
        →
      </span>
      <figure className="after">
        <div className={`frame frame--${frame}`}>
          <div className="glass">
            {portrait ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={portrait.src}
                width={portrait.width}
                height={portrait.height}
                alt={`${label}: portretas su vardu`}
                loading={priority ? 'eager' : 'lazy'}
                fetchPriority={priority ? 'high' : 'auto'}
                decoding="async"
              />
            ) : (
              <div className="ph ph-poster">
                <span className="ph-wash" aria-hidden="true" />
                <span className="ph-note">Vieta tikram portretui</span>
                <span className="ph-name" aria-hidden="true">
                  {name ?? 'Vardas'}
                </span>
              </div>
            )}
          </div>
        </div>
        <figcaption>Portretas su vardu</figcaption>
      </figure>
    </div>
  );
}
