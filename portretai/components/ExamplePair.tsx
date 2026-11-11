// "Photo → portrait" pair. When the owner has not supplied real files yet it
// shows labelled empty slots rather than borrowed or invented pictures.

type Img = { src: string; width: number; height: number } | null;

export default function ExamplePair({ photo, portrait, name, priority = false }: { photo: Img; portrait: Img; name: string | null; priority?: boolean }) {
  const label = name ?? 'augintinis';
  return (
    <div className="pair">
      <figure className="before">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo.src} width={photo.width} height={photo.height} alt={`${label}: nuotrauka`} loading={priority ? 'eager' : 'lazy'} decoding="async" />
        ) : (
          <div className="slot photo">Vieta tikrai nuotraukai</div>
        )}
        <figcaption>Nuotrauka</figcaption>
      </figure>
      <span className="arrow" aria-hidden="true">
        →
      </span>
      <figure className="after">
        {portrait ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={portrait.src} width={portrait.width} height={portrait.height} alt={`${label}: portretas su vardu`} loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
        ) : (
          <div className="slot poster">Vieta tikram portretui</div>
        )}
        <figcaption>Portretas</figcaption>
      </figure>
    </div>
  );
}
