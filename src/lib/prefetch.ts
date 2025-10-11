export const prefetch = (href: string) => {
  if (!href) return;

  const existing = document.querySelector<HTMLLinkElement>(`link[data-prefetch="${href}"]`);
  if (existing) return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "script";
  link.href = href;
  link.dataset.prefetch = href;
  document.head.appendChild(link);
};

export const prefetchModule = async <T>(loader: () => Promise<T>) => {
  try {
    await loader();
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Prefetch module failed", error);
    }
  }
};
