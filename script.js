function combineText() {
    let snippet1 = document.getElementById("snippet1").value;
    let ref1 = document.getElementById("ref1").value;
    let snippet2 = document.getElementById("snippet2").value;
    let ref2 = document.getElementById("ref2").value;
    let snippet3 = document.getElementById("snippet3").value;
    let ref3 = document.getElementById("ref3").value;
    let style = document.getElementById("citationStyle").value;

    let combined = `${snippet1} (${ref1.split(",")[0]}, ${ref1.split(",")[1]})\n\n` +
                   `${snippet2} (${ref2.split(",")[0]}, ${ref2.split(",")[1]})\n\n` +
                   `${snippet3} (${ref3.split(",")[0]}, ${ref3.split(",")[1]})`;
    let bibliography = generateBibliography([ref1, ref2, ref3], style);

    document.getElementById("output").innerText = combined + "\n\nBibliography:\n" + bibliography;
}

function generateBibliography(references, style) {
    let bib = "";
    references.forEach(ref => {
        let parts = ref.split(","); // e.g., "Smith, 2020, Journal of Research"
        if (style === "apa" && parts.length >= 2) {
            bib += `${parts[0]}. (${parts[1].trim()}). ${parts[2] ? parts[2].trim() : "Untitled"}.\n`;
        } else if (style === "mla" && parts.length >= 2) {
            bib += `${parts[0].split(" ").pop()}, ${parts[0].split(" ")[0]}. "${parts[2] ? parts[2].trim() : "Untitled"}." ${parts[1].trim()}.\n`;
        }
    });
    return bib;
}
