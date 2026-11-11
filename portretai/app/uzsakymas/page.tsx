import type { Metadata } from 'next';
import OrderFlow, { type FlowConfig } from '@/components/OrderFlow';
import { SETTINGS, STYLE_LABELS, SIZE_LABELS, FRAME_LABELS, formatPrice } from '@/server/settings.js';
import { deliveryStatus, formatDate } from '@/server/deadline.js';
import { FRAMES, NAME_MAX_CHARS, SECOND_LINE_MAX_CHARS } from '@/src/config.js';
import { loadStyle } from '@/src/styles.js';

export const metadata: Metadata = { title: 'Užsakyti portretą' };

export default async function OrderPage({ searchParams }: { searchParams: Promise<{ atsaukta?: string }> }) {
  const { atsaukta } = await searchParams;
  const d = deliveryStatus();
  const config: FlowConfig = {
    styles: SETTINGS.styles.map((key: string) => ({
      key,
      title: STYLE_LABELS[key as keyof typeof STYLE_LABELS],
      description: loadStyle(key).description,
    })),
    sizes: SETTINGS.sizes.map((key: string) => ({
      key,
      label: SIZE_LABELS[key as keyof typeof SIZE_LABELS],
      price: formatPrice(SETTINGS.prices[key as keyof typeof SETTINGS.prices]),
    })),
    frames: SETTINGS.frames.map((key: string) => ({
      key,
      label: FRAME_LABELS[key as keyof typeof FRAME_LABELS],
      color: FRAMES[key as keyof typeof FRAMES].face,
    })),
    networks: SETTINGS.lockerNetworks,
    nameMax: NAME_MAX_CHARS,
    secondMax: SECOND_LINE_MAX_CHARS,
    deliveryNote:
      d.seasonOver || d.beforeChristmas
        ? `Numatoma pristatymo data: apie ${formatDate(d.estimatedDelivery)}, jei peržiūrą patvirtinsite per vieną dieną.`
        : `Iki Kalėdų nebespėjame: pristatysime apie ${formatDate(d.estimatedDelivery)}. Apmokėję gausite dovanų kuponą (PDF), kurį galima atsispausdinti.`,
    aiDisclosure: SETTINGS.aiDisclosure,
    previewDays: SETTINGS.production.creationDays,
  };
  return <OrderFlow config={config} cancelled={atsaukta === '1'} />;
}
