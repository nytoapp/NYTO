import type { ImageSourcePropType } from "react-native";

export const landingHoldMs = 5000;
export const landingFadeMs = 1800;

export type LandingFrame = {
  source: ImageSourcePropType;
  /**
   * Horizontal focal point after the cover scale. 0 keeps the left of the
   * photograph, 1 keeps the right, 0.5 is centered.
   */
  focusX: number;
  /**
   * Vertical focal point. Only shifts the frame once `zoom` is above 1,
   * because a landscape photo already fills a portrait screen top to bottom.
   */
  focusY: number;
  /** 1 matches a normal cover crop. Higher values open room to pan. */
  zoom: number;
};

export type LandingContent = {
  city: string;
  wordmark: string;
  tagline: string;
  frames: readonly LandingFrame[];
};

/**
 * Portrait Stockholm frames. The first stays on a centered cover so it
 * matches the native splash photograph.
 */
export const stockholmLanding: LandingContent = {
  city: "Stockholm",
  wordmark: "CITYDAY",
  tagline: "Your city. Your way.",
  frames: [
    {
      source: require("../../../assets/landing/pexels-damir-38349356.jpg"),
      focusX: 0.5,
      focusY: 0.42,
      zoom: 1,
    },
    {
      source: require("../../../assets/landing/pexels-ilia-bronskiy-1137858493-21952805.jpg"),
      focusX: 0.3,
      focusY: 0.4,
      zoom: 1,
    },
    {
      source: require("../../../assets/landing/pexels-karol-tomsia-2161451350-38355596.jpg"),
      focusX: 0.5,
      focusY: 0.78,
      zoom: 1.7,
    },
    {
      source: require("../../../assets/landing/pexels-sw-ld-147012990-39785118.jpg"),
      focusX: 0.5,
      focusY: 0.06,
      zoom: 1.4,
    },
    {
      source: require("../../../assets/landing/pexels-mathiasbruunvisuals-11219743.jpg"),
      focusX: 0.34,
      focusY: 0.4,
      zoom: 1,
    },
  ],
};
