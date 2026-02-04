import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// State to hold the current decoration type
let ghostDecorationType: vscode.TextEditorDecorationType | undefined;
let currentImagePath: string | null = null;
let currentOpacity: number = 0.3;

export function activate(context: vscode.ExtensionContext) {

    // COMMAND 1: Select the Design (Image)
    const selectCmd = vscode.commands.registerCommand('ghostDesign.load', async () => {
        const result = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            filters: { 'Images': ['png', 'jpg', 'jpeg', 'webp'] }
        });

        if (result && result[0]) {
            currentImagePath = result[0].fsPath;
            applyGhostMode();
            vscode.window.showInformationMessage("Ghost Layer Activated! 👻");
        }
    });

    // COMMAND 2: Adjust Opacity
    const opacityCmd = vscode.commands.registerCommand('ghostDesign.opacity', async () => {
        const value = await vscode.window.showInputBox({
            prompt: "Enter Opacity (0.1 to 1.0)",
            value: currentOpacity.toString()
        });
        if (value) {
            currentOpacity = parseFloat(value);
            applyGhostMode(); // Re-apply with new opacity
        }
    });

    // COMMAND 3: Clear Ghost
    const clearCmd = vscode.commands.registerCommand('ghostDesign.clear', () => {
        if (ghostDecorationType) {
            ghostDecorationType.dispose();
            ghostDecorationType = undefined;
        }
    });

    // 4. THE RENDER LOGIC
    function applyGhostMode() {
        const editor = vscode.window.activeTextEditor;
        if (!editor || !currentImagePath) return;

        // A. Dispose previous decoration to avoid duplicates
        if (ghostDecorationType) {
            ghostDecorationType.dispose();
        }

        // B. Convert Image to Base64 (Standard VS Code URI handling can be tricky for CSS backgrounds)
        // Reading file -> Base64 is the most robust way to ensure it renders
        const imageBase64 = fs.readFileSync(currentImagePath, 'base64');
        const fileExtension = path.extname(currentImagePath).substring(1); // e.g. 'png'
        const dataUri = `data:image/${fileExtension};base64,${imageBase64}`;

        // C. Create the Decoration
        ghostDecorationType = vscode.window.createTextEditorDecorationType({
            isWholeLine: true,
            // CSS Injection into the editor background
            before: {
                // We use 'before' or 'after' content to hold the image if we want sticky positioning
                // But for a full background, we can use the main properties:
            },
            /* THE MAGIC SAUCE: 
               We inject the image into the background of the text range.
               'background-size: cover' makes it fit the width.
               'background-attachment: local' ensures it scrolls WITH the code.
            */
            textDecoration: `none; 
                background-image: url('${dataUri}'); 
                background-size: 100% auto; 
                background-repeat: no-repeat; 
                background-position: top center; 
                opacity: ${currentOpacity};
            `
        });

        // D. Apply it to the entire document
        const fullRange = new vscode.Range(
            0, 0,
            editor.document.lineCount, 0
        );

        editor.setDecorations(ghostDecorationType, [fullRange]);
    }

    // 5. EVENT LISTENERS
    // Re-apply when switching tabs so the ghost persists
    vscode.window.onDidChangeActiveTextEditor(() => {
        applyGhostMode();
    }, null, context.subscriptions);

    context.subscriptions.push(selectCmd, opacityCmd, clearCmd);
}
