import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [basicSsl()],
	server: {
		host: "0.0.0.0",
		port: 5173,
		// https: true,
	},
});
