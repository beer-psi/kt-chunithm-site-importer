import { buildSync } from "esbuild";
import { readFileSync } from "fs";

const userscriptHeader = `/* eslint-disable no-console */
/* eslint-disable camelcase */
// ==UserScript==
// @name	 kt-chunithm-site-importer
// @version  0.3.4
// @grant    GM.xmlHttpRequest
// @connect  kamaitachi.xyz
// @connect  kamai.tachi.ac
// @author	 beerpsi
// @match    https://chunithm-net-eng.com/mobile/home/
// @match    https://chunithm-net-eng.com/mobile/record/*
// @match	 https://new.chunithm-net.com/chuni-mobile/html/mobile/home/
// @match    https://new.chunithm-net.com/chuni-mobile/html/mobile/record/*
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
