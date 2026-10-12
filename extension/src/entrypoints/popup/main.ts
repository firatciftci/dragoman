import { mount } from "svelte";
import "@/app.css";
import { applyLocale } from "#lib/locale.ts";
import App from "./app.svelte";

await applyLocale();
mount(App, { target: document.body });
