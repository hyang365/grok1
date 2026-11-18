const manifest = await fetch(new URL("manifest.json", import.meta.url)).then((response) => {
  if (!response.ok) throw new Error("TripTable manifest " + response.status);
  return response.json();
});
const link = document.createElement("link");
link.rel = "stylesheet";
link.href = manifest.css;
document.head.appendChild(link);
const pieces = await Promise.all(
  manifest.parts.map(async (name) => {
    const response = await fetch(new URL(name, import.meta.url));
    if (!response.ok) throw new Error("TripTable part " + name + " " + response.status);
    return response.text();
  })
);
await import(URL.createObjectURL(new Blob(pieces, { type: "text/javascript" })));
