import * as vscode from "vscode";
import ollama from "ollama";

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand(
    "ai-assistant-ext.start",
    () => {
      const panel = vscode.window.createWebviewPanel(
        "deepChat",
        "Deep Seek Chat",
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      panel.webview.html = getWebviewContent();

      panel.webview.onDidReceiveMessage(async (message) => {
        if (message.command === "chat") {
          const userPrompt = message.text;
          let responseText = "";

          try {
            const streamResponse = await ollama.chat({
              model: "deepseek-r1:8b",
              messages: [{ role: "user", content: userPrompt }],
              stream: true,
            });

            if (streamResponse && Symbol.asyncIterator in streamResponse) {
              for await (const part of streamResponse) {
                responseText += part.message.content;
                panel.webview.postMessage({
                  command: "chatResponse",
                  text: responseText,
                  done: false,
                });
              }

              panel.webview.postMessage({
                command: "chatResponse",
                text: responseText,
                done: true,
              });
            } else {
              panel.webview.postMessage({
                command: "chatResponse",
                text: "Error: Invalid response stream",
                done: true,
              });
            }
          } catch (error) {
            panel.webview.postMessage({
              command: "chatResponse",
              text: "Error: " + (error as Error).message,
              done: true,
            });
          }
        }
      });

      panel.onDidDispose(
        () => {
          console.log("Webview panel closed.");
        },
        null,
        context.subscriptions
      );

      context.subscriptions.push(disposable);
    }
  );

  context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
  return /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Deep Seek Chat</title>

  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.css">
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/katex.min.js"></script>
  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.7/dist/contrib/auto-render.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>

  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #1e1e1e;
      color: #ffffff;
      display: flex;
      flex-direction: column;
      height: 100vh;
    }

    h2 {
      margin: 10px;
      text-align: center;
      color: #61dafb;
    }

    #container {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 10px;
    }

    #prompt {
      width: 100%;
      padding: 15px;
      font-size: 16px;
      border: none;
      border-radius: 5px;
      background-color: #2e2e2e;
      color: #ffffff;
      resize: none;
    }

    #askBtn {
      align-self: flex-start;
      padding: 10px 20px;
      font-size: 16px;
      font-weight: bold;
      color: #ffffff;
      background-color: #007acc;
      border: none;
      border-radius: 5px;
      cursor: pointer;
    }

    #askBtn:hover {
      background-color: #005a9e;
    }

    #response {
      flex: 1;
      padding: 15px;
      background-color: #2e2e2e;
      color: #d4d4d4;
      font-size: 16px;
      line-height: 1.4;
      overflow-y: auto;
      margin-top: 10px;
      white-space: pre-wrap;
    }

    #response p {
      margin: 0 0 8px 0;
    }

    #response pre {
      margin: 8px 0;
      background: #1e1e1e;
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }

    textarea:focus, #askBtn:focus {
      outline: none;
    }
  </style>
</head>
<body>
  <h2>Deep Seek Chat Extension</h2>
  <div id="container">
    <textarea id="prompt" rows="4" placeholder="Type your question here..."></textarea>
    <button id="askBtn">Ask</button>
    <div id="response">Your responses will appear here...</div>
  </div>

  <script>
    const vscode = acquireVsCodeApi();
    let bufferText = "";

    function formatMath(input) {
      return input
        .replace(/\\\[/g, "$$").replace(/\\\]/g, "$$")
        .replace(/\\\(/g, "$").replace(/\\\)/g, "$")
        .replace(/\b(\\?\\d+) \^ (\\?\\d+)\b/g, "$1^{ $2 }")
        .replace(/x\^(\\d+)/g, "x^{\$1}")
        .replace(/\\frac/g, "\\frac");
    }

    document.getElementById('askBtn').addEventListener('click', () => {
      const text = document.getElementById('prompt').value;
      bufferText = "";
      document.getElementById('response').innerText = "Loading...";
      vscode.postMessage({ command: 'chat', text });
    });

    window.addEventListener('message', event => {
      const { command, text, done } = event.data;
      if (command === 'chatResponse') {
        bufferText = text;
        document.getElementById('response').innerText = bufferText;

        if (done) {
          const cleaned = bufferText
            .trim()
            .replace(/\n{2,}/g, "\n\n")
            .replace(/^\s+/gm, "");

          const formattedText = formatMath(cleaned);
          const renderedHTML = marked.parse(formattedText);
          document.getElementById('response').innerHTML = renderedHTML;

          renderMathInElement(document.getElementById('response'), {
            delimiters: [
              { left: "$$", right: "$$", display: true },
              { left: "$", right: "$", display: false }
            ]
          });
        }
      }
    });
  </script>
</body>
</html>
  `;
}

export function deactivate() {}
