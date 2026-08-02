import { defineComponent, h, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { defineClientConfig, useRoutePath } from "vuepress/client";

const bodyClass = "gocode-focus-reading";

const FocusReadingButton = defineComponent({
  name: "FocusReadingButton",

  setup() {
    const enabled = ref(false);
    const routePath = useRoutePath();

    const setEnabled = (value: boolean): void => {
      enabled.value = value;
      document.body.classList.toggle(bodyClass, value);
    };

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && enabled.value) setEnabled(false);
    };

    onMounted(() => window.addEventListener("keydown", onKeydown));
    onBeforeUnmount(() => {
      window.removeEventListener("keydown", onKeydown);
      document.body.classList.remove(bodyClass);
    });

    // 切换文章时自动退出，避免把专注状态带到新页面。
    watch(routePath, () => setEnabled(false));

    return () =>
      h(
        "button",
        {
          type: "button",
          class: ["gocode-focus-reading-button", { "is-active": enabled.value }],
          title: enabled.value ? "退出沉浸阅读（Esc）" : "沉浸阅读",
          "aria-pressed": enabled.value,
          onClick: () => setEnabled(!enabled.value),
        },
        [h("span", { "aria-hidden": "true" }, "◐"), h("span", enabled.value ? "退出阅读" : "沉浸阅读")],
      );
  },
});

export default defineClientConfig({
  rootComponents: [() => h(FocusReadingButton)],
});
