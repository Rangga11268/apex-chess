/// <reference types="chrome"/>

const DefaultExtensionOptions2: ExtensionOptions = {
    depth: 15,
    threads: 2,
    show_hints: true,
    move_analysis: true,
    depth_bar: true,
    evaluation_bar: true,
    use_nnue: false,
    auto_move: false,
    language: "id",
};

function injectScript(file: string)
{
    let script = document.createElement("script");
    script.src = chrome.runtime.getURL(file);
    script.dataset.extensionUrl = chrome.runtime.getURL("");
    script.dataset.stockfishUrl = chrome.runtime.getURL("js/stockfish.js");
    script.dataset.ecoUrl = chrome.runtime.getURL("eco.json");

    let doc = (document.head || document.documentElement);
    doc.insertBefore(script, doc.firstElementChild);

    script.onload = function () { script.remove(); };
}

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse)
    {
        // pass the event to injected script
        if (request && request.data) {
            window.dispatchEvent(new CustomEvent("ChessMintUpdateOptions", { detail: request.data }));
        }
    }
);

window.addEventListener("ChessMintGetOptions", function (evt)
{
    try
    {
        chrome.storage.sync.get(DefaultExtensionOptions2, function (opts)
        {
            if (chrome.runtime.lastError || !opts) {
                opts = { ...DefaultExtensionOptions2 };
            }
            opts.stockfishUrl = chrome.runtime.getURL("js/stockfish.js");
            opts.ecoUrl = chrome.runtime.getURL("eco.json");

            let request = (evt as any).detail;
            let response = { requestId: request?.id, data: opts };
            window.dispatchEvent(new CustomEvent("ChessMintSendOptions", { detail: response }));
        });
    }
    catch (e)
    {
        let request = (evt as any).detail;
        let fallback = { ...DefaultExtensionOptions2 };
        fallback.stockfishUrl = chrome.runtime.getURL("js/stockfish.js");
        fallback.ecoUrl = chrome.runtime.getURL("eco.json");
        let response = { requestId: request?.id, data: fallback };
        window.dispatchEvent(new CustomEvent("ChessMintSendOptions", { detail: response }));
    }
});

injectScript("js/chessmint.js");