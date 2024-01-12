export function getItem(id) {
    const ret = JSON.parse(localStorage.getItem(id));
    if (ret == null) {
        return {}
    } else {
        return ret
    }
}

export function isItemExists(id) {
    return localStorage.getItem(id) != null;
}

export function setItem(id, obj) {
    localStorage.setItem(id, JSON.stringify(obj));
}

export function setTitle(id, title, href) {
    const obj = getItem(id);
    obj.title = {
        title,
        href
    }
    setItem(id, obj);
}

export function getTitle(id) {
    const obj = getItem(id);
    return obj.title;
}

export function setBody(id, arr) {
    const obj = getItem(id);
    obj.body = arr;
    setItem(id, obj);
}

export function getBody(id) {
    const obj = getItem(id);
    return obj.body;
}
