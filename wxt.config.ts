import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react', '@wxt-dev/auto-icons'],
  manifest: {
    name: "Gradescope Assignment Overview",
    permissions: [],
    browser_specific_settings: {
      gecko: {
        id: "{c903ea33-1a72-4969-9751-08f604e9e25d}",
        data_collection_permissions: {
          required: ['none'],
        },
      }

    }
  },
  webExt: {
    binaries: {
      firefox: "firefox-nightly",
      //   zen: "/Applications/Zen.app/Contents/MacOS/zen"
    }
  }
});
