import { defineComponent, h, type Component } from "vue";

// Islands: the page is static HTML; only components wrapped here hydrate in the browser.
// At build time the wrapper renders <div data-island="Name" data-props="{…}"> around the
// component's own server render; entry-client.ts loads islands/Name.vue and hydrates that div
// with the same props. Props must be JSON.

export function island(name: string, component: Component) {
  return defineComponent({
    name: `Island${name}`,
    inheritAttrs: false,
    setup(_, { attrs }) {
      return () => h("div", { "data-island": name, "data-props": JSON.stringify(attrs) }, [h(component, attrs)]);
    },
  });
}
