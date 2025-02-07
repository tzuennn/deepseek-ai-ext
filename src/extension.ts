import * as vscode from 'vscode';
import ollama from 'ollama';

export function activate(context: vscode.ExtensionContext) {
    const disposable = vscode.commands.registerCommand('ai-assistant-ext.start', () => {
        const panel = vscode.window.createWebviewPanel(
            'deepChat',
            'Deep Seek Chat',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true // Prevents the webview from resetting
            }
        );

        panel.webview.html = getWebviewContent();

        panel.webview.onDidReceiveMessage(async (message) => {
            if (message.command === 'chat') {
                const userPrompt = message.text;
                let responseText = '';

                try {
                    console.log("Sending request to Ollama:", userPrompt);

                    const streamResponse = await ollama.chat({
                        model: 'deepseek-r1:8b',
                        messages: [{ role: 'user', content: userPrompt }],
                        stream: true
                    });

                    if (streamResponse && Symbol.asyncIterator in streamResponse) {
                        for await (const part of streamResponse) {
                            responseText += part.message.content;
                            console.log("Received chunk:", part.message.content); // Debugging log
                            panel.webview.postMessage({ command: 'chatResponse', text: responseText });
                        }
                    } else {
                        panel.webview.postMessage({ command: 'chatResponse', text: "Error: Invalid response stream" });
                    }
                } catch (error) {
                    const errorMessage = (error as Error).message;
                    console.error("Ollama Chat Error:", errorMessage);
                    panel.webview.postMessage({ command: 'chatResponse', text: 'Error: ' + errorMessage });
                }
            }
        });

        // Handle panel disposal
        panel.onDidDispose(() => {
            console.log("Webview panel closed.");
        }, null, context.subscriptions);

        context.subscriptions.push(disposable);
    });

    context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
    return /*html*/`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deep Seek Chat</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 0;
                    background-color: #1e1e1e;
                    color: #ffffff;
                    display: flex;
                    flex-direction: column;
                    height: 100vh; /* Full height of the view */
                }

                h2 {
                    margin: 10px;
                    text-align: center;
                    color: #61dafb;
                }

                #container {
                    flex: 1; /* Expand container to fill available space */
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    padding: 10px;
                }

                #prompt {
                    width: 100%;
                    box-sizing: border-box;
                    padding: 15px;
                    font-size: 16px;
                    border: none;
                    border-radius: 5px;
                    background-color: #2e2e2e;
                    color: #ffffff;
                    resize: none;
                }

                #askBtn {
                    align-self: flex-start; /* Align button to the start of container */
                    padding: 10px 20px;
                    font-size: 16px;
                    font-weight: bold;
                    color: #ffffff;
                    background-color: #007acc;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    transition: background-color 0.3s;
                }

                #askBtn:hover {
                    background-color: #005a9e;
                }

                #response {
                    flex: 1; /* Allow the response box to grow and fill remaining space */
                    border-radius: 5px;
                    border: none;
                    padding: 15px;
                    background-color: #2e2e2e;
                    color: #d4d4d4;
                    font-size: 16px;
                    line-height: 1.6;
                    overflow-y: auto;
                    margin-top: 10px;
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
            <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
            <script>
                const vscode = acquireVsCodeApi();

                document.getElementById('askBtn').addEventListener('click', () => {
                    const text = document.getElementById('prompt').value;
                    vscode.postMessage({ command: 'chat', text });
                });

                window.addEventListener('message', event => {
                    const { command, text } = event.data;
                    if (command === 'chatResponse') {
                        // Convert Markdown to HTML
                        const renderedHTML = marked.parse(text);

                        // Set the HTML content of the response box
                        document.getElementById('response').innerHTML = renderedHTML;
                    }
                });
            </script>
        </body>
        </html>
    `;
}


export function deactivate() {}
