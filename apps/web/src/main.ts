import { createApp } from "vue";
import PrimeVue from "primevue/config";
import { createPinia } from "pinia";

import App from "./App.vue";
import "./styles/main.css";

const app = createApp(App);

app.use(createPinia());
app.use(PrimeVue);

app.mount("#app");
