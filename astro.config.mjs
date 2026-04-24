import { defineConfig } from "astro/config";
import react from "@astrojs/react";

const isRender = process.env.RENDER === "true";

export default defineConfig({
  site: isRender
    ? "https://starcraft-tmg-dice.onrender.com"
    : "https://phannawich.github.io",
  base: isRender ? "/preview" : "/starcraft-tmg-dice",
  integrations: [react()],
});
