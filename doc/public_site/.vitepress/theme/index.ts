import DefaultTheme from 'vitepress/theme'
import MermaidZoom from './MermaidZoom.vue'
import SidebarToggle from './SidebarToggle.vue'
import { h } from 'vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'layout-bottom': () => [h(MermaidZoom), h(SidebarToggle)]
    })
  },
  enhanceApp({ app }) {
    app.component('MermaidZoom', MermaidZoom)
    app.component('SidebarToggle', SidebarToggle)
  }
}
