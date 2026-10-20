// Tema claro/oscuro sin dependencias. La clave de localStorage es la misma que usaba Mantine,
// así quien ya eligió un tema lo conserva.
export const THEME_KEY = "mantine-color-scheme-value";
export type Theme = "dark" | "light";

export const THEME_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;
