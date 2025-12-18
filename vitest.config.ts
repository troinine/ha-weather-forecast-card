import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "happy-dom",
    setupFiles: ["./test/vitest.setup.ts"],
  },
  plugins: [
    {
      name: "parcel-bundle-text-rewrite",
      enforce: "pre",
      async resolveId(source, importer) {
        if (source.startsWith("bundle-text:")) {
          const cleanPath = source.replace("bundle-text:", "");
          const resolved = await this.resolve(cleanPath, importer);
          if (resolved) {
            return { id: resolved.id + "?inline" };
          }
        }
        return null;
      },
      transform(code, id) {
        if (id.includes(".styles.ts")) {
          if (code.includes("bundle-text:")) {
            return {
              code: code.replace(/import\s+\*\s+as\s+/g, "import "),
              map: null,
            };
          }
        }
        return null;
      },
    },
  ],
});
