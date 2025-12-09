import { defineConfig } from "vite";
import fs from "fs";

export default defineConfig({
	server: {
		host: "0.0.0.0",
		port: 5173,
		https: {
			key: fs.readFileSync("/run/secrets/tls_key"), // or a bind-mounted path
			cert: fs.readFileSync("/run/secrets/tls_cert"),
		},
	},
});

// import basicSsl from "@vitejs/plugin-basic-ssl";

// // https://vitejs.dev/config/
// export default defineConfig({
// 	plugins: [basicSsl()],
// 	server: {
// 		host: "0.0.0.0",
// 		port: 5173,
// 		// https: true,
// 	},
// });
