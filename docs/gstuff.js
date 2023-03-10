/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

const CLIENT_ID = '512510391570-r9pbvetuacq3f0i8f4v40etei4ps4qv0.apps.googleusercontent.com';
const API_KEY = 'AIzaSyASI4FABDCawBkChmrx-eNGjhxb9OPx5a8';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';


/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    if (gapi.client.getToken() === null) {
        const storedToken = localStorage.getItem('storedToken');
        if (storedToken != null) {
            gapi.client.setToken({
                access_token: storedToken
            });
            await signedIn();
        }
    }
    gapiInited = true;
    maybeEnableButtons();
}



function onPickerApiLoad() {
    pickerInited = true;
}

function pickerCallback(data) {
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        const doc = data[google.picker.Response.DOCUMENTS][0];
        const url = doc[google.picker.Document.URL];
        const sheetId = doc.id;
        document.getElementById('sheet').value = sheetId;
        document.getElementById('pickerForm').submit();
    }
}

function showPicker() {
    // TODO(developer): Replace with your API key
    const picker = new google.picker.PickerBuilder()
        .addView(google.picker.ViewId.SPREADSHEETS)
        .setOAuthToken(gapi.client.getToken().access_token)
        .setDeveloperKey(API_KEY)
        .setAppId("512510391570")
        .setCallback(pickerCallback)
        .build();
    picker.setVisible(true);
}




window.onload = () => {
    /**
     * Callback after api.js is loaded.
     */
    gapi.load('client', initializeGapiClient);
    gapi.load('picker', onPickerApiLoad);

    /**
     * Callback after Google Identity Services are loaded.
     */
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;


    const sheetId = getSheet();
    document.getElementById('sheet').value = sheetId;
    document.getElementById('sheetShow').style.display = (sheetId) ? '' : 'none';

}
/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }

    const isLoggedIn = !!(gapi.client.getToken());

    document.getElementById('sheetSelect').style.display = 'none';
    document.getElementById('sheetShow').style.display = 'none';
    if (isLoggedIn) {
        document.getElementById('sheetSelect').style.display = '';
        if (getSheet()) {
            document.getElementById('sheetShow').style.display = '';
        }
    }
}

async function signedIn() {
    localStorage.setItem('storedToken', gapi.client.getToken().access_token);
    document.getElementById('signout_button').style.visibility = 'visible';
    document.getElementById('authorize_button').innerText = 'Refresh';
    await populate();
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        await signedIn();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({
            prompt: 'consent'
        });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({
            prompt: ''
        });
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
        localStorage.removeItem('storedToken');
    }
}

function filter(tag) {
    const par = document.getElementById('content');
    par.childNodes.forEach(i => {
        const tags = i.getAttribute("x-tags").split(",").filter(s => s.length).map(s => s.trim());
        const shouldShow = (tag == "<None>" || tags.indexOf(tag) > -1);
        i.style.display = shouldShow ? '' : 'none';
    });
}

function toasty(message, cls) {
    const toastLiveExample = document.getElementById('liveToast');
    if (cls == "error") {
        toastLiveExample.className = "toast text-bg-danger";
    } else {
        toastLiveExample.className = "toast";
    }
    toastLiveExample.getElementsByClassName("toast-body")[0].innerText = message;
    const toast = new bootstrap.Toast(toastLiveExample);
    toast.show();
}

function getSheet() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    return params.sheet;
}

/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */
async function populate() {
    let response;
    let title;
    let spreadsheetUrl;
    try {
        const spreadsheetId = getSheet();
        if (!spreadsheetId) {
            return;
        }
        response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: spreadsheetId,
            range: 'A2:C',
        });
        const response2 = await gapi.client.sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId
        });
        spreadsheetUrl = response2.result.spreadsheetUrl;
        title = response2.result.properties.title;
    } catch (err) {
        toasty(err.message, "error");
        return;
    }
    document.getElementById('spreadSheetTitle').innerText = title;
    document.getElementById('spreadSheetTitle').href = spreadsheetUrl;
    const range = response.result;
    if (!range || !range.values || range.values.length == 0) {
        toasty("No values found.", "error");
        return;
    }

    const arr = range.values.map(
        row => ({
            title: row[0],
            tags: row[1].split(",").filter(t => t.length).map(t => t.trim()),
            content: row[2],
        })
    );
    const tags_array = arr.map(i => i.tags).flat();
    const tags = ["<None>", ...new Set(tags_array)];
    const tagContainer = document.getElementById('tags');
    tags.forEach(t => {
        const button = document.createElement('button');
        button.setAttribute("class", "btn btn btn-outline-primary");
        button.innerText = t;
        button.onclick = async () => {
            filter(t)
        };
        tagContainer.appendChild(button);
    });
    const par = document.getElementById('content');

    arr.forEach(o => {
        const button = document.createElement('button');
        button.innerText = o.title;
        button.setAttribute("class", "btn btn-primary");
        button.setAttribute("x-tags", o.tags.join(","));
        button.onclick = async () => {
            await navigator.clipboard.writeText(o.content);
            toasty(`Copied ${o.title}`, "");
        };
        par.appendChild(button);
    });
}
