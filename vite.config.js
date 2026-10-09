import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      // 濡쒖뺄 媛쒕컻 ??/api/proxy ?몄텧??Flask 諛깆뿏?쒕줈 ?ъ썙??
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    // Vercel??鍮뚮뱶???뺤쟻 由ъ냼?ㅻ? ?щ컮濡?李얠쓣 ???덈룄濡?outDir 吏??
    outDir: "dist",
    sourcemap: true,
  },
});

