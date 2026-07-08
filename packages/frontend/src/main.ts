import { createApp } from 'vue';
import './styles/global.css';
import 'vfonts/Lato.css';
import 'vfonts/FiraCode.css';
import App from './App.vue';

import router from './routers';

const app = createApp(App);
app.use(router);
app.mount('#app');
