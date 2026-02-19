import imageUrlBuilder from "@sanity/image-url";
import { client } from "./client";
import type { SanityImageSource } from "./types";

const builder = imageUrlBuilder(client);

export function urlFor(source: SanityImageSource) {
  return builder.image(source);
}

export function getImageUrl(
  source: SanityImageSource | undefined | null,
  options?: {
    width?: number;
    height?: number;
    quality?: number;
    fit?: "clip" | "crop" | "fill" | "fillmax" | "max" | "scale" | "min";
  }
): string | null {
  if (!source) return null;

  let imageBuilder = builder.image(source);

  if (options?.width) {
    imageBuilder = imageBuilder.width(options.width);
  }
  if (options?.height) {
    imageBuilder = imageBuilder.height(options.height);
  }
  if (options?.quality) {
    imageBuilder = imageBuilder.quality(options.quality);
  }
  if (options?.fit) {
    imageBuilder = imageBuilder.fit(options.fit);
  }

  return imageBuilder.auto("format").url();
}

export function getImageDimensions(source: SanityImageSource): {
  width: number;
  height: number;
  aspectRatio: number;
} | null {
  if (!source || typeof source !== "object" || !("asset" in source)) {
    return null;
  }

  const asset = source.asset as { _ref?: string };
  if (!asset._ref) return null;

  // Extract dimensions from asset reference
  // Format: image-{id}-{width}x{height}-{format}
  const dimensions = asset._ref.match(/-(\d+)x(\d+)-/);

  if (!dimensions) return null;

  const width = parseInt(dimensions[1], 10);
  const height = parseInt(dimensions[2], 10);

  return {
    width,
    height,
    aspectRatio: width / height,
  };
}
