// ==UserScript==
// @name	 kt-chunithm-site-importer
// @version  0.2.0
// @grant    GM.xmlHttpRequest
// @connect  kamaitachi.xyz
// @author	 beerpsi
// @match    https://chunithm-net-eng.com/mobile/home/
// @match    https://chunithm-net-eng.com/mobile/record/*
// @require  https://cdn.jsdelivr.net/npm/@trim21/gm-fetch
// ==/UserScript==

// TODO: Error handling system

console.log("KTIMPORT");

const KT_SELECTED_CONFIG = "prod";
const KT_CONFIGS = {
  // "staging": {
  // 	baseUrl: "https://staging.kamaitachi.xyz",
  // 	clientId: "CI5ba595889dca0ebf15f700291084bbf26d199ee4",
  // },
  prod: {
    baseUrl: "https://kamaitachi.xyz",
    clientId: "CI2a215ade610e60ee433a1f1faf0f2615f250e80d",
  },
};
const KT_BASE_URL = KT_CONFIGS[KT_SELECTED_CONFIG].baseUrl;
const KT_CLIENT_ID = KT_CONFIGS[KT_SELECTED_CONFIG].clientId;
const LS_API_KEY_KEY = "__ktimport__api-key";
const DIFFICULTIES = ["Basic", "Advanced", "Expert", "Master", "Ultima"];
const SKILL_CLASSES = ["", "DAN_I", "DAN_II", "DAN_III", "DAN_IV", "DAN_V", "DAN_INFINITE"];

if (typeof GM_fetch !== "undefined") {
  fetch = GM_fetch;
}

/**
 *
 * @param {string} key
 * @returns
 */
function getPreference(key) {
  return localStorage.getItem(`__ktimport__${key}_${KT_SELECTED_CONFIG}`);
}

/**
 *
 * @param {string} key
 * @param {any} value
 * @returns
 */
function setPreference(key, value) {
  return localStorage.setItem(`__ktimport__${key}_${KT_SELECTED_CONFIG}`, value.toString());
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
  document.querySelector(".clearfix").insertAdjacentHTML("afterend", inputHtml);

  document
    .querySelector("#api-key-setup")
    .addEventListener("submit", submitApiKey);
}

function submitApiKey(event) {
  event.preventDefault();

  const apiKey = document.querySelector("#api-key-form-key").value;
  setPreference("api-key", apiKey)

  location.reload();
}

function addNav() {
  const navHtml = document.createElement("div");
  navHtml.style =
    "color: rgb(255, 255, 255); padding: 1rem; margin: 1rem auto; display: block; width: 460px; border-radius: 0.5rem; border: 3px solid rgb(85, 102, 119); background-color: rgb(34, 51, 68); text-align: left; line-height: 1.2rem; font-size: 12px;";

  const apiKeyText =
    "You don't have an API key set up. Please set up an API key before proceeding.";
  const apiKeyParagraph = document.createElement("p");

  if (!getPreference("api-key")) {
    apiKeyParagraph.append(document.createTextNode(apiKeyText));
    apiKeyParagraph.append(document.createElement("br"));
  }

  let apiKeyLink = getPreference("api-key")
    ? "Reconfigure API key (if broken)"
    : "Set up API key";

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
      const req = await fetch("/mobile/record/playlog");
      const docu = new DOMParser().parseFromString(
        await req.text(),
        "text/html"
      );
      await executeRecentImport(docu);
    };
    navRecent.append(navRecentText);
    navRecent.append(document.createElement("br"));
    navHtml.append(navRecent);

    const navPb = document.createElement("a");
    const navPbText = "Import all PBs";
    navPb.onclick = executePBImport;
    navPb.append(navPbText);
    navPb.append(document.createElement("br"));
    navHtml.append(navPb);

    const navDan = document.createElement("a");
    const navDanText = "Import dan and emblem";
    navDan.onclick = () => { executeDanImport(document); }
    navDan.append(navDanText);
    navDan.append(document.createElement("br"));
    navHtml.append(navDan);
  }
  document
    .querySelector(".clearfix")
    .insertAdjacentElement("afterend", navHtml);
  navHtml.id = "kt-import-status";
}

function insertImportButton(message, onClick) {
  if (
    !getPreference("api-key") &&
    window.confirm(
      "You don't have an API key set up. Please set up an API key before proceeding."
    )
  ) {
    location.href = "https://chunithm-net-eng.com/mobile/home/";
  }

  const importButton = document.createElement("a");
  importButton.id = "kt-import-button";
  importButton.style =
    "color:#fff;font-size:1em;font-weight:bold;padding:1rem;margin:1rem auto;display:block;width:-moz-fit-content;width:fit-content;text-decoration:none;border-radius:.5rem;border:3px solid #567;background-color:#234;text-align:center;cursor:pointer;-webkit-user-select:none;-ms-user-select:none;user-select:none;filter:brightness(0.7);transition:.2s";
  // importButton.style = "box-shadow: 0 0 0 2px #FFF, 0 0 0 4px #9E9E9E"
  importButton.append(document.createTextNode(message));

  const prevElem = document.querySelector(".clearfix");
  prevElem.insertAdjacentElement("afterend", importButton);

  document.querySelector("#kt-import-button").onclick = onClick;
}

function updateStatus(message) {
  let statusElem = document.querySelector("#kt-import-status");
  if (!statusElem) {
    statusElem = document.createElement("p");
    statusElem.id = "kt-import-status";
    statusElem.style = "text-align: center; background-color: #fff;";
    const prevElem = document.querySelectorAll(".title")[0];
    prevElem.insertAdjacentElement("afterend", statusElem);
  }

  statusElem.innerText = message;
}

/**
 *
 * @param {string} url
 * @param {Date} latestScoreDate
 * @returns
 */
async function pollStatus(url, options, latestScoreDate) {
  const req = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${getPreference("api-key")}`,
    },
  });

  const body = await req.json();

  if (!body.success) {
    updateStatus("Terminal Error: " + body.description);
    return;
  }

  if (body.body.importStatus === "ongoing") {
    updateStatus(
      "Importing scores... " +
        body.description +
        " Progress: " +
        body.body.progress.description
    );
    setTimeout(pollStatus, 1000, url, options, latestScoreDate);
    return;
  }

  if (body.body.importStatus === "completed") {
    console.log(body.body);
    let message =
      body.description + ` ${body.body.import.scoreIDs.length} scores`;
    
    if (options.dan) {
      body.description += ` and dan ${options.dan}`
    }
    if (options.emblem) {
      body.description += ` and emblem ${options.emblem}`
    }

    if (body.body.import.errors.length > 0) {
      message += `, ${body.body.import.errors.length} errors (see console log for details)`;
      for (const error of body.body.import.errors) {
        console.log(`${error.type}: ${error.message}`);
      }
    }

    updateStatus(message);
    setPreference("latest-score-date", latestScoreDate.valueOf());
    return;
  }

  // otherwise, just print the description cuz we're not sure what happened
  updateStatus(body.description);
}

/**
 *
 * @param {{ scores: any[], saveLatestTimestamp: boolean }} options
 * @returns
 */
async function submitScores(options) {
  const { scores = [], dan = null, emblem = null, saveLatestTimestamp = false } = options;

  if (scores.length === 0 && dan === null && emblem === null) {
    updateStatus("Nothing to import.");
    return;
  }

  const classes = {};
  if (dan !== null) {
    classes.dan = dan;
  }
  if (emblem != null) {
    classes.emblem = emblem;
  }

  const body = {
    meta: {
      game: "chunithm",
      playtype: "Single",
      service: "site-importer",
    },
    scores,
    classes,
  };

  console.log(JSON.stringify(body));

  const req = fetch(`${KT_BASE_URL}/ir/direct-manual/import`, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + getPreference("api-key"),
      "Content-Type": "application/json",
      "X-User-Intent": "true",
    },
    body: JSON.stringify(body),
  });

  document.querySelector("#kt-import-button")?.remove();
  updateStatus("Submitting scores...");

  const json = await (await req).json();
  // if json.success
  const pollUrl = json.body.url;
  const latestScoreDate = scores.length > 0 && saveLatestTimestamp
		? Math.max(...scores.map(s => s.timeAchieved.valueOf()))
		: null;

  updateStatus("Importing scores...");
  pollStatus(pollUrl, options, latestScoreDate);
}

function getNumber(document, selector) {
  return Number(document.querySelector(selector).innerText.replaceAll(",", ""));
}

/**
 *
 * @param {string[]} lampImages
 */
function calculateLamp(lampImages, judgements = {}) {
  const clear = lampImages.some((i) => i.includes("icon_clear"));
  const fc = lampImages.some((i) => i.includes("icon_fullcombo"));
  const aj = lampImages.some((i) => i.includes("icon_alljustice"));

  if (aj) {
    if (
      judgements.justice === 0 &&
      judgements.attack === 0 &&
      judgements.miss === 0
    ) {
      return "ALL JUSTICE CRITICAL";
    }
    return "ALL JUSTICE";
  }
  if (fc) {
    return "FULL COMBO";
  }
  return clear ? "CLEAR" : "FAILED";
}

function getDifficulty(row, selector) {
  // https://chunithm-net-eng.com/mobile/images/musiclevel_expert.png
  let difficulty = row
    .querySelector(selector)
    .src.split("/")
    .pop()
    .split(".")[0]
    .split("_")[1]
    .toUpperCase();

  if (difficulty === "ULTIMATE") {
    difficulty = "ULTIMA";
  }

  if (difficulty === "WORLDSEND") {
    difficulty = "WORLD'S END";
  }

  return difficulty;
}

/**
 *
 * @param {string} timestamp
 * @returns
 */
function parseDate(timestamp) {
  const match = timestamp.match(
    "([0-9]{4})/([0-9]{1,2})/([0-9]{1,2}) ([0-9]{1,2}):([0-9]{2})"
  );
  let [_, year, month, day, hour, minute] = match;
  month = month.padStart(2, "0");
  day = day.padStart(2, "0");
  hour = hour.padStart(2, "0");

  // Construct iso-8601 time
  const isoTime = `${year}-${month}-${day}T${hour}:${minute}:00.000+09:00`;
  // Parse with Date, then get unix time
  return new Date(isoTime);
}

async function executeRecentImport(docu = document) {
  const latestScoreDate = Number(getPreference("latest-score-date") ?? "0");

  const scoresElems = [...docu.querySelectorAll(".frame02.w400")].filter(e => {
    const dateString = e.querySelector(".play_datalist_date, .box_inner01").innerText;
    const date = parseDate(dateString);
    return date.valueOf() > latestScoreDate;
  });
  let scoresList = [];

  for (let i = 0; i < scoresElems.length; i++) {
    updateStatus(`Fetching recent score ${i + 1}/${scoresElems.length}...`);
    const e = scoresElems[i];

    const difficulty = getDifficulty(e, ".play_track_result img");
    if (difficulty === "WORLD'S END") {
      // we don't accept world's end scores
      continue;
    }

    let idx = e.querySelector("input[name=idx]").value;
    let token = e.querySelector("input[name=token]").value;

    let req = await fetch("/mobile/record/playlog/sendPlaylogDetail/", {
      method: "POST",
      body: `idx=${idx}&token=${token}`,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
    let doc = new DOMParser().parseFromString(await req.text(), "text/html");

    let scoreData = {
      score: getNumber(doc, ".play_musicdata_score_text"),
      lamp: "",
      matchType: "inGameID",
      identifier: doc.querySelector(
        ".play_data_detail_ranking_btn input[name=idx]"
      ).value,
      difficulty,
      timeAchieved: 0,
      judgements: {
        jcrit: getNumber(doc, ".text_critical"),
        justice: getNumber(doc, ".text_justice"),
        attack: getNumber(doc, ".text_attack"),
        miss: getNumber(doc, ".text_miss"),
      },
      hitMeta: {
        maxCombo: getNumber(doc, ".play_data_detail_maxcombo_block"),
      },
    };

    const lampImages = [
      ...doc.querySelectorAll(".play_musicdata_icon img"),
    ].map((e) => e.src);
    scoreData.lamp = calculateLamp(lampImages, scoreData.judgements);

    const timestamp = doc.querySelector(
      ".play_datalist_date, .box_inner01"
    ).innerText;

    // Break out pieces, put into utc string with timezone info
    const match = timestamp.match(
      "([0-9]{4})/([0-9]{1,2})/([0-9]{1,2}) ([0-9]{1,2}):([0-9]{2})"
    );
    let [_, year, month, day, hour, minute] = match;
    month = month.padStart(2, "0");
    day = day.padStart(2, "0");
    hour = hour.padStart(2, "0");

    // Construct iso-8601 time
    const isoTime = `${year}-${month}-${day}T${hour}:${minute}:00.000+09:00`;
    // Parse with Date, then get unix time
    const date = new Date(isoTime);
    scoreData.timeAchieved = date.valueOf();

    scoresList.push(scoreData);
  }
  await submitScores({ scores: scoresList, saveLatestTimestamp: true });
}

function warnPbImport() {
  document.querySelector("#kt-import-button").remove();

  insertImportButton(
    "Confirm DANGEROUS operation",
    async () => await executePBImport()
  );
  const pbWarning = `
	<p id="kt-import-pb-warning" class="p_10" style="text-align: center; background-color: #fff">
	  <span style="color: #f00">WARNING!</span>
	  PB import is not recommended in general! PBs do not have timestamp data, and will not create
	  sessions. Only import PBs <em>after</em> importing recent scores.
	</p>
  `;
  document
    .querySelector("#kt-import-button")
    .insertAdjacentHTML("afterend", pbWarning);
}

async function executePBImport() {
  const scoresList = [];

  const token =
    document.querySelector("input[name=token]")?.value ??
    document.cookie
      .split(";")
      .find((row) => row.startsWith("_t="))
      ?.split("=")[1];
  if (!token) {
    updateStatus("Error: No token found");
    return;
  }

  for (let i = 0; i < 5; i++) {
    updateStatus(`Fetching scores for ${DIFFICULTIES[i]}...`);
    const req = await fetch(
      `/mobile/record/musicGenre/send${DIFFICULTIES[i]}`,
      {
        method: "POST",
        body: `genre=99&token=${token}`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    const doc = new DOMParser().parseFromString(await req.text(), "text/html");

    const elems = doc.querySelectorAll(".musiclist_box");

    for (const e of elems) {
      const scoreElem = e.querySelector(".play_musicdata_highscore .text_b");
      if (!scoreElem) {
        continue;
      }

      const scoreData = {
        score: getNumber(e, ".play_musicdata_highscore .text_b"),
        lamp: "",
        matchType: "inGameID",
        identifier: e.querySelector("input[name=idx]").value,
        difficulty: DIFFICULTIES[i].toUpperCase(),
      };

      const lampImages = [
        ...e.querySelectorAll(".play_musicdata_icon img"),
      ].map((e) => e.src);
      scoreData.lamp = calculateLamp(lampImages);

      scoresList.push(scoreData);
    }
  }

  document.querySelector("#kt-import-pb-warning")?.remove();
  await submitScores({ scores: scoresList });
}

async function executeDanImport(docu = document) {
  const danElement = docu.querySelector(".player_classemblem_top img")
  const dan = danElement ? SKILL_CLASSES[Number(danElement.src.split("_").slice(-1)[0].split(".")[0])] : null;

  const emblemElement = docu.querySelector(".player_classemblem_base img");
  const emblem = emblemElement ? SKILL_CLASSES[Number(emblemElement.src.split("_").slice(-1)[0].split(".")[0])] : null;

  await submitScores({ dan, emblem });
}

if (!document.cookie.split(";").some((row) => row.startsWith("_t="))) {
  alert("Please login to CHUNITHM-NET first.");
  location.href = "https://chunithm-net-eng.com";
}

switch (location.pathname) {
  case "/mobile/record/musicGenre":
  case "/mobile/record/musicWord":
  case "/mobile/record/musicRank":
  case "/mobile/record/musicLevel":
    insertImportButton("IMPORT ALL PBs", warnPbImport);
    break;

  case "/mobile/record/playlog":
    insertImportButton(
      "IMPORT RECENT SCORES",
      async () => await executeRecentImport(document)
    );
    break;

  case "/mobile/home/":
    addNav();
    break;
}
