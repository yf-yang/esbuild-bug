import * as esbuild from "esbuild";
import fs from "fs";
import path from "path";

const JS_EXT_RE = /\.(mjs|cjs|ts|js|tsx|jsx)$/;

// Must not start with "/" or "./" or "../"
// "/test/node_modules/foo"
// "c:/node_modules/foo"
export const EXTERNAL_REGEXP = /^[^./]|^\.[^./]|^\.\.[^/]/;

await esbuild.build({
  entryPoints: ["index.ts"],
  outfile: "test.cjs",
  format: "cjs",
  platform: "node",
  bundle: true,
  target: "esnext",
  plugins: [
    // https://github.com/evanw/esbuild/issues/619#issuecomment-751995294
    {
      name: "make-all-packages-external",
      setup(_build) {
        _build.onResolve({ filter: EXTERNAL_REGEXP }, async (args) => {
          let external = true;
          // FIXME: windows external entrypoint
          if (args.kind === "entry-point") {
            external = false;
          }

          try {
            const resolvedPath = require.resolve(args.path, {
              paths: [args.resolveDir],
            });
            // If it is a typescript or esm package, we should bundle it.
            if (
              BUNDLED_EXT_RE.test(resolvedPath) ||
              (await isTypeModulePkg(resolvedPath))
            ) {
              return {
                external: false,
              };
            }
          } catch (err) {
            // If the package can not be resolved, do nothing.
          }

          return {
            path: args.path,
            external,
          };
        });
      },
    },
  ],
});
