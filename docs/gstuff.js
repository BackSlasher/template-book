const CLIENT_ID = '512510391570-r9pbvetuacq3f0i8f4v40etei4ps4qv0.apps.googleusercontent.com';
const API_KEY = 'AIzaSyASI4FABDCawBkChmrx-eNGjhxb9OPx5a8';
const DISCOVERY_DOC = 'https://sheets.googleapis.com/$discovery/rest?version=v4';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

// Need this externally, using `import "";` fails because of CORS
// <script src="https://apis.google.com/js/api.js"></script> 
// <script src="https://accounts.google.com/gsi/client"></script>

let tokenClient;

function getSheet() {
    const params = new Proxy(new URLSearchParams(window.location.search), {
        get: (searchParams, prop) => searchParams.get(prop),
    });
    return params.sheet;
}

async function verifyToken() {
    const storedToken = localStorage.getItem('storedToken');
    if (!storedToken) {
        return false;
    }
    const params = new URLSearchParams({
        access_token: storedToken,
    });
    const req = new Request(
        `https://www.googleapis.com/oauth2/v1/tokeninfo?${params.toString()}`,
    );
    const resp = await fetch(req);
    const code = resp.status;
    return code == "200"
}

async function onLoad() {
    document.getElementById('btnSignIn').onclick = async () => await signIn();
    document.getElementById('btnSignOut').onclick = async () => await signOut();
    document.getElementById('btnPicker').onclick = showPicker;

    await new Promise((resolve, reject) => {
        gapi.load('client', resolve);
    });
    await new Promise((resolve, reject) => {
        gapi.load('picker', resolve);
    });
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });

    // GAPI
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
        }
    }
    await refreshButtons();
}

async function signIn() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        localStorage.setItem('storedToken', gapi.client.getToken().access_token);
        await refreshButtons();
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

async function signOut() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('storedToken');
        await refreshButtons();
    }
}

async function refreshButtons() {
    const verified = await verifyToken();
    if (verified) {
        // Show signout
        document.getElementById('btnSignOut').style.display = '';
        // Hide signin
        document.getElementById('btnSignIn').style.display = 'none';
        // Show sheet box 
        document.getElementById('sheetBox').style.display = '';
        // Hide guidelines
        document.getElementById('guidelines').style.display = 'none';
        // populate sheet box
        await populate();
    } else {
        // Hide signout
        document.getElementById('btnSignOut').style.display = 'none';
        // Show signin
        document.getElementById('btnSignIn').style.display = '';
        // Hide sheet box
        document.getElementById('sheetBox').style.display = 'none';
        // Show guidelines
        document.getElementById('guidelines').style.display = '';
    }
}

async function populate() {
    const sheetId = getSheet();
    if (!sheetId) {
        document.getElementById('sheetData').style.display = 'none';
        return;
    }
    document.getElementById('sheetData').style.display = '';
    await Promise.all([
        populateTitle(sheetId),
        populateData(sheetId),
    ]);
}

async function populateTitle(spreadsheetId) {
    const response = await gapi.client.sheets.spreadsheets.get({
        spreadsheetId: spreadsheetId
    });
    const spreadsheetUrl = response.result.spreadsheetUrl;
    const title = response.result.properties.title;
    document.getElementById('sheetName').innerText = title;
    document.getElementById('sheetName').href = spreadsheetUrl;
}

async function populateData(spreadsheetId) {
    const response = await gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: 'A2:C',
    });
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
    const tags = ["<Clear>", ...new Set(tags_array)];
    const tagContainer = document.getElementById('tags');
    tagContainer.innerHTML = '';
    tags.forEach(t => {
        const button = document.createElement('button');
        button.setAttribute("class", "btn btn btn-outline-primary");
        button.innerText = t;
        button.onclick = async () => {
            filter(t)
        };
        tagContainer.appendChild(button);
    });

    const par = document.getElementById('templates');
    arr.forEach(o => {
        const button = document.createElement('button');
        button.innerText = o.title;
        button.setAttribute("class", "btn btn-primary");
        button.setAttribute("x-tags", o.tags.join(","));
        button.setAttribute("data-bs-title", o.content);
        new bootstrap.Tooltip(button);
        button.onclick = async () => {
            await navigator.clipboard.writeText(o.content);
            toasty(`Copied ${o.title}`, "");
        };
        par.appendChild(button);
    });
}

function filter(tag) {
    const par = document.getElementById('templates');
    par.childNodes.forEach(i => {
        const tags = i.getAttribute("x-tags").split(",").filter(s => s.length).map(s => s.trim());
        const shouldShow = (tag == "<Clear>" || tags.indexOf(tag) > -1);
        i.style.display = shouldShow ? '' : 'none';
    });
}

function pickerCallback(data) {
    if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
        const doc = data[google.picker.Response.DOCUMENTS][0];
        const url = doc[google.picker.Document.URL];
        const sheetId = doc.id;
        document.getElementById('inpSheet').value = sheetId;
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

window.onload = onLoad;
