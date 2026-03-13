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

self.addEventListener("install", event => {

event.waitUntil(
caches.open(CACHE_NAME)
.then(cache => {
return cache.addAll(urlsToCache);
})
);

});

self.addEventListener("activate", event => {

event.waitUntil(
caches.keys().then(keys => {
return Promise.all(
keys.filter(key => key !== CACHE_NAME)
.map(key => caches.delete(key))
);
})
);

});

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
