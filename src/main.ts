import { createApp } from 'vue'
import { createPinia } from 'pinia'
import "./assets/style.css";
import "@mdi/font/css/materialdesignicons.css";

import App from './App.vue'
import router from './router'

// Vuetify
import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const vuetify = createVuetify({
  components,
  directives,
})

const app = createApp(App)

const pinia = createPinia();

app.use(pinia)
app.use(router)
app.use(vuetify)

app.mount('#app')
