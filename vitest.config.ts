import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/vitest.setup.ts"],
  },
  plugins: [
    {
      name: "parcel-bundle-text-shim",
      enforce: "pre",
      async resolveId(source, importer) {
        if (source.startsWith("bundle-text:")) {
          const cleanPath = source.replace("bundle-text:", "");

          // Resolve the actual file path relative to the file importing it
          const resolved = await this.resolve(cleanPath, importer);

          if (resolved) {
            // Append ?inline so Vite's CSS plugin handles the string conversion
            return { id: resolved.id + "?inline" };
          }
        }
        return null;
      },
    },
  ],
});
