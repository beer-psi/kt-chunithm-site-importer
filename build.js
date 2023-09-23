import { buildSync } from "esbuild";
import { readFileSync } from "fs";

const userscriptHeader = `// ==UserScript==
// @name	 kt-chunithm-site-importer
// @version  0.2.0
// @grant    GM.xmlHttpRequest
// @connect  kamaitachi.xyz
// @author	 beerpsi
// @match    https://chunithm-net-eng.com/mobile/home/
// @match    https://chunithm-net-eng.com/mobile/record/*
// @require  https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==`;

buildSync({
    entryPoints: ["./kt-chunithm-site-importer.user.ts"],
    bundle: true,
    format: "esm",
    banner: {
        js: userscriptHeader
    },
    outfile: "./docs/kt-chunithm-site-importer.user.js",
});

buildSync({
    entryPoints: ["./kt-chunithm-site-importer.user.ts"],
    minify: true,
    bundle: true,
    outfile: "./docs/kt-chunithm-site-importer.min.js",
});
