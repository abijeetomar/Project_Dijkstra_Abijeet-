import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

/*
 * Two builds:
 *   npm run build         -> dist/        normal asset build, needs a server
 *   npm run build:single  -> dist-single/ one self-contained index.html you can
 *                            double-click, or publish as an artifact
 */
export default defineConfig(({ mode }) => {
  const single = mode === "singlefile";
  return {
    base: "./",
    plugins: [react(), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? "dist-single" : "dist",
      emptyOutDir: true,
      target: "es2020",
      cssCodeSplit: !single,
    },
  };
});
