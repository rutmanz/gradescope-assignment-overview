
import { createRoot } from "react-dom/client";
import "./main.scss";
import { MainView } from "./views/Main";

export default defineContentScript({
	matches: ["https://www.gradescope.com/", "https://www.gradescope.com/account"],
	runAt: "document_start",
	async main(ctx) {
        ctx.addEventListener(document, "DOMContentLoaded", async () => {
		const body = document.querySelector('.l-content');

        const container = document.createElement("div")
        container.id = "gradescope-aggregator-extension-root";
        body?.append(container);
        const root = createRoot(container)

        root.render(<MainView />)

	})},
});

