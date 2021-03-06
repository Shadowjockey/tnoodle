import { BASE_PATH } from "../App";

// Members of the Software Team can configure this here: https://www.worldcubeassociation.org/oauth/applications/123.

const TNOODLE_ACCESS_TOKEN_KEY = "TNoodle.accessToken";
const TNOODLE_LAST_LOGIN_ENV = "TNoodle.lastLoginEnv";
const STAGING = "staging";
const PRODUCTION = "production";

// See https://github.com/thewca/worldcubeassociation.org/wiki/OAuth-documentation-notes#staging-oauth-application
let getWcaOrigin = () => {
    if (isUsingStaging()) {
        return "https://staging.worldcubeassociation.org";
    }
    return (
        process.env.REACT_APP_WCA_ORIGIN ||
        "https://www.worldcubeassociation.org"
    );
};

let getTnoodleAppId = () => {
    if (isUsingStaging()) {
        return "example-application-id";
    }
    return (
        process.env.REACT_APP_TNOODLE_APP_ID ||
        "6145bf3e65fbad4715b049dae2d72a64b8e9a794010abf518fa9364b05a5dd40"
    );
};

let wcaAccessToken = getHashParameter("access_token");
if (wcaAccessToken) {
    window.location.hash = "";
    localStorage[TNOODLE_ACCESS_TOKEN_KEY] = wcaAccessToken;
    gotoPreLoginPath();
} else {
    wcaAccessToken = localStorage[TNOODLE_ACCESS_TOKEN_KEY];
}

export function isUsingStaging() {
    return getQueryParameter("staging") === "true";
}

export function toWcaUrl(path) {
    return `${getWcaOrigin()}${path}`;
}

export function logIn() {
    if (isLogged()) {
        return;
    }

    let redirectUri = window.location.origin + BASE_PATH + "/oauth/wca";
    let logInUrl = toWcaUrl(
        `/oauth/authorize?client_id=${getTnoodleAppId()}&redirect_uri=${redirectUri}&response_type=token&scope=public+manage_competitions`
    );
    localStorage["TNoodle.preLoginHref"] = window.location.href;
    window.location = logInUrl;
}

export function isLogged() {
    return (
        localStorage[TNOODLE_ACCESS_TOKEN_KEY] != null &&
        getCurrentEnv() === getLastLoginEnv()
    );
}

export function logOut() {
    delete localStorage[TNOODLE_LAST_LOGIN_ENV];
    delete localStorage[TNOODLE_ACCESS_TOKEN_KEY];
    wcaAccessToken = null;
    window.location.reload();
}

export function gotoPreLoginPath() {
    let preLoginHref = localStorage["TNoodle.preLoginHref"] || "/";
    localStorage[TNOODLE_LAST_LOGIN_ENV] = preLoginHref.includes("staging=true")
        ? STAGING
        : PRODUCTION;
    delete localStorage["TNoodle.preLoginHref"];
    window.location.replace(preLoginHref);
}

export function fetchMe() {
    return wcaApiFetch("/me")
        .then(response => response.json())
        .then(json => json.me);
}

export function fetchVersionInfo() {
    return wcaApiFetch("/scramble-program").then(response => response.json());
}

export function getCompetitionJson(competitionId) {
    return wcaApiFetch(`/competitions/${competitionId}/wcif`).then(response =>
        response.json()
    );
}

export function getUpcomingManageableCompetitions() {
    let oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return wcaApiFetch(
        `/competitions?managed_by_me=true&start=${oneWeekAgo.toISOString()}`
    ).then(response => response.json());
}

function getHashParameter(name) {
    return parseQueryString(window.location.hash)[name];
}

export function getQueryParameter(name) {
    let urlSplit = window.location.href.split("?");
    let lastElement = urlSplit.slice(-1)[0];
    return parseQueryString(lastElement)[name];
}

// Copied from https://stackoverflow.com/a/3855394/1739415
function parseQueryString(query) {
    if (!query) {
        return {};
    }

    return (/^[?#]/.test(query) ? query.slice(1) : query)
        .split("&")
        .reduce((params, param) => {
            let [key, value] = param.split("=");
            params[key] = value
                ? decodeURIComponent(value.replace(/\+/g, " "))
                : "";
            return params;
        }, {});
}

const getLastLoginEnv = () => localStorage[TNOODLE_LAST_LOGIN_ENV];

const getCurrentEnv = () => (isUsingStaging() ? STAGING : PRODUCTION);

function wcaApiFetch(path, fetchOptions) {
    // TODO - look into refresh token https://github.com/doorkeeper-gem/doorkeeper/wiki/Enable-Refresh-Token-Credentials
    var baseApiUrl = toWcaUrl("/api/v0");
    fetchOptions = Object.assign({}, fetchOptions, {
        headers: new Headers({
            Authorization: `Bearer ${wcaAccessToken}`,
            "Content-Type": "application/json"
        })
    });

    return fetch(`${baseApiUrl}${path}`, fetchOptions).then(response => {
        if (!response.ok) {
            throw new Error(`${response.status}: ${response.statusText}`);
        }
        return response;
    });
}
