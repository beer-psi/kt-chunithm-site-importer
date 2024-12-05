/* eslint-disable no-console */
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
// ==/UserScript==

// kt-chunithm-site-importer.user.ts
var REGION = location.hostname === "chunithm-net-eng.com" ? "intl" : "jp";
var BASE_URL = REGION === "intl" ? "https://chunithm-net-eng.com/mobile" : "https://new.chunithm-net.com/chuni-mobile/html/mobile";
if (typeof GM_fetch !== "undefined") {
  window.fetch = GM_fetch;
}
console.log("KTIMPORT");
var KT_LOCALSTORAGE_KEY_PREFIX = "__ktimport__";
var KT_SELECTED_CONFIG = "prod";
var KT_CONFIGS = {
  // "staging": {
  // 	baseUrl: "https://staging.kamaitachi.xyz",
  // 	clientId: "CI5ba595889dca0ebf15f700291084bbf26d199ee4",
  // },
  prod: {
    baseUrl: "https://kamai.tachi.ac",
    clientId: "CI2a215ade610e60ee433a1f1faf0f2615f250e80d"
  }
};
var KT_BASE_URL = KT_CONFIGS[KT_SELECTED_CONFIG].baseUrl;
var KT_CLIENT_ID = KT_CONFIGS[KT_SELECTED_CONFIG].clientId;
var MAX_SCORE = 101e4;
var DIFFICULTIES = ["Basic", "Advanced", "Expert", "Master", "Ultima"];
var SKILL_CLASSES = ["DAN_I", "DAN_II", "DAN_III", "DAN_IV", "DAN_V", "DAN_INFINITE"];
function getPreference(key, defaultValue = null) {
  return localStorage.getItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`) ?? defaultValue;
}
function setPreference(key, value) {
  localStorage.setItem(`${KT_LOCALSTORAGE_KEY_PREFIX}${key}_${KT_SELECTED_CONFIG}`, value);
}
function getNumber(element, selector) {
  const numberToGet = element.querySelector(selector)?.innerText.replace(/,/gu, "");
  if (!numberToGet) {
    throw new Error("Could not retrieve number.");
  }
  return Number(numberToGet);
}
function parseDate(timestamp) {
  const match = /([0-9]{4})\/([0-9]{1,2})\/([0-9]{1,2}) ([0-9]{1,2}):([0-9]{2})/u.exec(timestamp);
  if (!match || match.length !== 6) {
    throw new Error("Invalid timestamp format. Expected yyyy/MM/dd HH:mm.");
  }
  const [_, year, month, day, hour, minute] = match;
  const paddedMonth = month.padStart(2, "0");
  const paddedDay = day.padStart(2, "0");
  const paddedHour = hour.padStart(2, "0");
  const isoTime = `${year}-${paddedMonth}-${paddedDay}T${paddedHour}:${minute}:00.000+09:00`;
  return new Date(isoTime);
}
function getDifficulty(row, selector) {
  const src = row.querySelector(selector)?.src;
  if (!src) {
    throw new Error(
      `Could not determine image source for element ${row.outerHTML} with selector ${selector}`
    );
  }
  let difficulty = src.split("/").pop()?.split(".")?.[0]?.split("_")?.[1]?.toUpperCase();
  if (typeof difficulty === "undefined") {
    throw new Error(`Could not determine difficulty from image URL ${src}`);
  }
  if (difficulty === "ULTIMATE") {
    difficulty = "ULTIMA";
  }
  if (difficulty === "WORLDSEND") {
    difficulty = "WORLD'S END";
  }
  return difficulty;
}
function calculateLamp(lampImages) {
  const clear = lampImages.some(
    (i) => i.includes("icon_clear") || i.includes("icon_hard") || i.includes("icon_absolute") || i.includes("icon_absolutep") || i.includes("icon_catastrophy")
  );
  const fc = lampImages.some((i) => i.includes("icon_fullcombo"));
  const aj = lampImages.some((i) => i.includes("icon_alljustice"));
  const ajc = lampImages.some((i) => i.includes("icon_alljusticecritical"));
  if (aj) {
    return ajc ? "ALL JUSTICE CRITICAL" : "ALL JUSTICE";
  }
  if (fc) {
    return "FULL COMBO";
  }
  return clear ? "CLEAR" : "FAILED";
}
function updateStatus(message) {
  let statusElem = document.querySelector("#kt-import-status");
  if (!statusElem) {
    statusElem = document.createElement("p");
    statusElem.id = "kt-import-status";
    statusElem.style.cssText = "text-align: center; background-color: #fff;";
    const prevElem = document.querySelector(".title");
    prevElem?.insertAdjacentElement("afterend", statusElem);
  }
  statusElem.innerText = message;
}
async function* TraverseRecents(doc = document, fetchScoresSince = 0) {
  const scoreElems = Array.prototype.filter.call(
    doc.querySelectorAll(".frame02.w400"),
    (e, i) => {
      const timestamp = e.querySelector(
        ".play_datalist_date, .box_inner01"
      )?.innerText;
      if (!timestamp) {
        console.warn(`Could not retrieve timestamp for score with index ${i}.`);
        return true;
      }
      const timeAchieved = parseDate(timestamp).valueOf();
      return timeAchieved > fetchScoresSince;
    }
  );
  const sinceDateString = fetchScoresSince ? ` since ${new Date(fetchScoresSince).toLocaleDateString()}...` : "...";
  for (let i = 0; i < scoreElems.length; i++) {
    updateStatus(`Fetching score ${i + 1}/${scoreElems.length}${sinceDateString}`);
    const e = scoreElems[i];
    if (!e) {
      console.warn(
        `There was a hole in the NodeList? Element with index ${i} was null/undefined.`
      );
      continue;
    }
    const difficulty = getDifficulty(e, ".play_track_result img");
    if (difficulty === "WORLD'S END") {
      continue;
    }
    const timestamp = e.querySelector(
      ".play_datalist_date, .box_inner01"
    )?.innerText;
    const timeAchieved = timestamp ? parseDate(timestamp).valueOf() : null;
    const score = getNumber(e, ".play_musicdata_score_text");
    const lampImages = [
      ...e.querySelectorAll(".play_musicdata_icon img")
    ].map((e2) => e2.src);
    const scoreData = {
      score,
      lamp: score === MAX_SCORE ? "ALL JUSTICE CRITICAL" : calculateLamp(lampImages),
      matchType: "inGameID",
      identifier: "",
      difficulty,
      timeAchieved
    };
    const idx = e.querySelector("input[name=idx]")?.value;
    const token = e.querySelector("input[name=token]")?.value;
    if (!idx || !token) {
      console.warn(
        `Could not retrieve parameters for fetching details of score with index ${i}`
      );
      continue;
    }
    const detailText = await fetch(`${BASE_URL}/record/playlog/sendPlaylogDetail/`, {
      method: "POST",
      body: `idx=${idx}&token=${token}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }).then((r) => r.text());
    const detailDocument = new DOMParser().parseFromString(detailText, "text/html");
    const identifier = detailDocument.querySelector(
      ".play_data_detail_ranking_btn input[name=idx]"
    )?.value;
    if (!identifier) {
      console.warn(
        `Missing inGameID element for score ${i + 1}. Yielding incomplete score with songTitle matching, which may cause inaccuracies.`
      );
      if (REGION === "jp") {
        console.log(
          "To retrieve full score details, you may need to purchase the Standard Course subscription: https://otogame-net.com/chunithm"
        );
      }
      const title = e.querySelector(".play_musicdata_title")?.innerText;
      if (!title) {
        console.error(`Could not get song title for score ${i + 1}. Skipping this score.`);
        continue;
      }
      scoreData.identifier = title;
      scoreData.matchType = "songTitle";
      yield scoreData;
      continue;
    }
    const judgements = {
      jcrit: getNumber(detailDocument, ".text_critical"),
      justice: getNumber(detailDocument, ".text_justice"),
      attack: getNumber(detailDocument, ".text_attack"),
      miss: getNumber(detailDocument, ".text_miss")
    };
    scoreData.identifier = identifier;
    scoreData.matchType = "inGameID";
    scoreData.lamp = calculateLamp(lampImages);
    scoreData.judgements = judgements;
    scoreData.optional = {
      maxCombo: getNumber(detailDocument, ".play_data_detail_maxcombo_block")
    };
    yield scoreData;
  }
}
async function* TraversePersonalBests(doc = document) {
  const token = doc.querySelector("input[name=token]")?.value ?? doc.cookie.split(";").find((row) => row.startsWith("_t="))?.split("=")[1];
  if (!token) {
    updateStatus("Error: No token found");
    return;
  }
  for (const difficulty of DIFFICULTIES) {
    updateStatus(`Fetching scores for ${difficulty}...`);
    const resp = await fetch(`${BASE_URL}/record/musicGenre/send${difficulty}`, {
      method: "POST",
      body: `genre=99&token=${token}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      }
    }).then((r) => r.text());
    const scoreDocument = new DOMParser().parseFromString(resp, "text/html");
    const scoreElements = scoreDocument.querySelectorAll(".musiclist_box");
    for (const e of scoreElements) {
      const scoreElem = e.querySelector(".play_musicdata_highscore .text_b");
      const identifier = e.querySelector("input[name=idx]")?.value;
      if (!scoreElem?.innerText || !identifier) {
        continue;
      }
      const score = Number(scoreElem.innerText.replace(/,/gu, ""));
      const lampImages = [
        ...e.querySelectorAll(".play_musicdata_icon img")
      ].map((e2) => e2.src);
      const scoreData = {
        score,
        lamp: score === MAX_SCORE ? "ALL JUSTICE CRITICAL" : calculateLamp(lampImages),
        matchType: "inGameID",
        identifier,
        difficulty: difficulty.toUpperCase()
      };
      yield scoreData;
    }
  }
}
async function PollStatus(pollUrl, importOptions) {
  const body = await fetch(pollUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getPreference("api-key")}`
    }
  }).then((r) => r.json());
  if (!body.success) {
    updateStatus(`Terminal error: ${body.description}`);
    return;
  }
  if (body.body.importStatus === "ongoing") {
    const progress = typeof body.body.progress === "number" ? body.body.progress.toString() : body.body.progress.description;
    updateStatus(`Importing scores... ${body.description} Progress: ${progress}`);
    setTimeout(PollStatus, 1e3, pollUrl, importOptions);
    return;
  }
  console.debug(body.body);
  const { latestTimestamp } = importOptions;
  let message = `${body.description} ${body.body.import.scoreIDs.length} scores`;
  for (const raise of body.body.import.classDeltas) {
    message = `${message} and ${raise.set} ${raise.new}`;
  }
  if (body.body.import.errors.length > 0) {
    message = `${message}, ${body.body.import.errors.length} > 0 (check console for details)`;
    for (const error of body.body.import.errors) {
      console.error(`${error.type}: ${error.message}`);
    }
  }
  updateStatus(message);
  if (latestTimestamp) {
    setPreference("latest-score-date", latestTimestamp.toString());
  }
}
async function SubmitScores(options) {
  const { scores = [], classes } = options;
  if (scores.length === 0 && !classes?.dan && !classes?.emblem) {
    updateStatus("Nothing to import.");
    return;
  }
  const body = {
    meta: {
      game: "chunithm",
      playtype: "Single",
      service: "site-importer"
    },
    scores,
    classes
  };
  const jsonBody = JSON.stringify(body);
  console.debug(jsonBody);
  document.querySelector("#kt-import-button")?.remove();
  updateStatus("Submitting scores...");
  const resp = await fetch(
    `${KT_BASE_URL}/ir/direct-manual/import`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${getPreference("api-key")}`,
        "content-type": "application/json",
        "x-user-intent": "true"
      },
      body: jsonBody
    }
  ).then((r) => r.json());
  if (!resp.success) {
    updateStatus(`Could not submit scores to Kamaitachi: ${resp.description}`);
    return;
  }
  const pollUrl = resp.body.url;
  updateStatus("Importing scores...");
  await PollStatus(pollUrl, options);
}
async function ExecuteRecentImport(doc = document) {
  const latestScoreDate = Number(getPreference("latest-score-date") ?? "0");
  const scores = [];
  let latestTimestamp = 0;
  for await (const score of TraverseRecents(doc, latestScoreDate)) {
    latestTimestamp = Math.max(score.timeAchieved ?? 0, latestTimestamp);
    scores.push(score);
  }
  await SubmitScores({ scores, latestTimestamp });
}
async function ExecutePbImport() {
  const scores = [];
  for await (const score of TraversePersonalBests(document)) {
    scores.push(score);
  }
  await SubmitScores({ scores });
}
async function ExecuteDanImport(docu = document) {
  const classes = {};
  const danElement = docu.querySelector(".player_classemblem_top img");
  const danIndex = Number(danElement?.src.split("_").slice(-1)[0]?.split(".")[0] ?? "0");
  if (danIndex > 0) {
    classes.dan = SKILL_CLASSES[danIndex - 1];
  }
  const emblemElement = docu.querySelector(".player_classemblem_base img");
  const emblemIndex = Number(emblemElement?.src.split("_").slice(-1)[0]?.split(".")[0] ?? "0");
  if (emblemIndex > 0) {
    classes.emblem = SKILL_CLASSES[emblemIndex - 1];
  }
  await SubmitScores({ classes });
}
function setupApiKey() {
  window.open(`${KT_BASE_URL}/client-file-flow/${KT_CLIENT_ID}`);
  const inputHtml = `
	  <div id="api-key-setup">
		<form id="api-key-form">
		  <input type="text" id="api-key-form-key" placeholder="Copy API key here"/>
		  <input type="submit" value="Save"/>
		</form>
	  </div>
	`;
  document.querySelector(".clearfix")?.insertAdjacentHTML("afterend", inputHtml);
  document.querySelector("#api-key-setup")?.addEventListener("submit", submitApiKey);
}
async function submitApiKey(event) {
  event.preventDefault();
  const apiKey = document.querySelector("#api-key-form-key")?.value;
  if (!apiKey) {
    updateStatus("No API key received?");
    return;
  }
  const resp = await fetch(`${KT_BASE_URL}/api/v1/users/me`, {
    headers: {
      authorization: `Bearer ${apiKey}`
    }
  }).then((r) => r.json());
  if (!resp.success) {
    updateStatus(`Invalid API key: ${resp.description}`);
    return;
  }
  setPreference("api-key", apiKey);
  location.reload();
}
function insertImportButton(message, onClick) {
  if (!getPreference("api-key") && // eslint-disable-next-line no-alert
  confirm("You don't have an API key set up. Please set up an API key before proceeding.")) {
    location.href = `${BASE_URL}/home/`;
  }
  const importButton = document.createElement("a");
  importButton.id = "kt-import-button";
  importButton.style.cssText = "color:#fff;font-size:1em;font-weight:bold;padding:1rem;margin:1rem auto;display:block;width:-moz-fit-content;width:fit-content;text-decoration:none;border-radius:.5rem;border:3px solid #567;background-color:#234;text-align:center;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;filter:brightness(0.7);transition:.2s";
  importButton.append(document.createTextNode(message));
  const prevElem = document.querySelector(".clearfix");
  prevElem?.insertAdjacentElement("afterend", importButton);
  importButton.onclick = onClick;
  return importButton;
}
function addNav() {
  const navHtml = document.createElement("div");
  navHtml.style.cssText = "color: rgb(255, 255, 255); padding: 1rem; margin: 1rem auto; display: block; width: 460px; border-radius: 0.5rem; border: 3px solid rgb(85, 102, 119); background-color: rgb(34, 51, 68); text-align: left; line-height: 1.2rem; font-size: 12px;";
  const apiKeyText = "You don't have an API key set up. Please set up an API key before proceeding.";
  const apiKeyParagraph = document.createElement("p");
  if (!getPreference("api-key")) {
    apiKeyParagraph.append(document.createTextNode(apiKeyText));
    apiKeyParagraph.append(document.createElement("br"));
  }
  const apiKeyLink = getPreference("api-key") ? "Reconfigure API key (if broken)" : "Set up API key";
  const apiKeySetup = document.createElement("a");
  apiKeySetup.id = "setup-api-key-onclick";
  apiKeySetup.append(document.createTextNode(apiKeyLink));
  apiKeySetup.onclick = setupApiKey;
  apiKeyParagraph.append(apiKeySetup);
  navHtml.append(apiKeyParagraph);
  if (getPreference("api-key")) {
    const navRecent = document.createElement("a");
    const navRecentText = "Import recent scores (preferred)";
    navRecent.onclick = async () => {
      const req = await fetch(`${BASE_URL}/record/playlog`);
      const docu = new DOMParser().parseFromString(await req.text(), "text/html");
      await ExecuteRecentImport(docu);
    };
    navRecent.append(navRecentText);
    navRecent.append(document.createElement("br"));
    navHtml.append(navRecent);
    const navPb = document.createElement("a");
    const navPbText = "Import all PBs";
    navPb.onclick = ExecutePbImport;
    navPb.append(navPbText);
    navPb.append(document.createElement("br"));
    navHtml.append(navPb);
    const navDan = document.createElement("a");
    const navDanText = "Import dan and emblem";
    navDan.onclick = async () => {
      await ExecuteDanImport(document);
    };
    navDan.append(navDanText);
    navDan.append(document.createElement("br"));
    navHtml.append(navDan);
  }
  document.querySelector(".clearfix")?.insertAdjacentElement("afterend", navHtml);
  navHtml.id = "kt-import-status";
}
function warnPbImport() {
  const importButton = document.querySelector("#kt-import-button");
  if (!importButton) {
    console.error("No import button found?");
    return;
  }
  importButton.remove();
  const newImportButton = insertImportButton("Confirm DANGEROUS operation", async () => {
    await ExecutePbImport();
  });
  const pbWarning = `
	  <p id="kt-import-pb-warning" class="p_10" style="text-align: center; background-color: #fff">
		<span style="color: #f00">WARNING!</span>
		PB import is not recommended in general! PBs do not have timestamp data, and will not create
		sessions. Only import PBs <em>after</em> importing recent scores.
	  </p>
	`;
  newImportButton.insertAdjacentHTML("afterend", pbWarning);
}
switch (location.href.replace(BASE_URL, "")) {
  case "/record/musicGenre":
  case "/record/musicWord":
  case "/record/musicRank":
  case "/record/musicLevel": {
    insertImportButton("IMPORT ALL PBs", warnPbImport);
    break;
  }
  case "/record/playlog": {
    insertImportButton("IMPORT RECENT SCORES", async () => {
      await ExecuteRecentImport(document);
    });
    break;
  }
  case "/home/": {
    addNav();
    break;
  }
}
