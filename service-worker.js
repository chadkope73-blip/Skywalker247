const CACHE_NAME = "skywalker247-v1";

const urlsToCache = [
"/",
"/index.html",
"/logo.png",
"/topo-bg.jpeg",
"/app.js",
"/sky-data.json",
"/manifest.json"
];

/* INSTALL */

self.addEventListener("install", event => {

event.waitUntil(

caches.open(CACHE_NAME)
.then(cache => {
return cache.addAll(urlsToCache);
})

);

});

/* ACTIVATE (cleanup old caches) */

self.addEventListener("activate", event => {

event.waitUntil(

caches.keys().then(cacheNames => {

return Promise.all(

cacheNames.map(name => {

if(name !== CACHE_NAME){
return caches.delete(name);
}

})

);

})

);

});

/* FETCH */

self.addEventListener("fetch", event => {

event.respondWith(

caches.match(event.request).then(response => {

if(response){
return response;
}

return fetch(event.request);

})

);

});
