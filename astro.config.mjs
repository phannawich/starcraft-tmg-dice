import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";

const isRender = process.env.RENDER === "true";

export default defineConfig({
  site: isRender
    ? "https://starcraft-tmg-dice.onrender.com"
    : "https://phannawich.github.io",
  base: isRender ? "/" : "/starcraft-tmg-dice",
  trailingSlash: "always",
  integrations: [
    react(),
    ...(isRender ? [] : [sitemap()]),
  ],
});
