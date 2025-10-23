import { useEffect } from "react";

const ThemeInitializer = () => {
  useEffect(() => {
    // Set the msdos theme on mount
    document.documentElement.setAttribute("data-theme", "msdos");

    // Set theme color for browser UI
    let metaThemeColor = document.querySelector("meta[name='theme-color']");
    if (!metaThemeColor) {
      metaThemeColor = document.createElement("meta");
      metaThemeColor.name = "theme-color";
      document.head.appendChild(metaThemeColor);
    }
    metaThemeColor.content = "#000088";
  }, []);

  return null; // No UI, just handles initialization
};

export default ThemeInitializer;
